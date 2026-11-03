import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import { atomic, AtomicGuardError } from '@/core/db/atomic';
import { envConfigs } from '@/config';
import { aiTask, credit } from '@/config/db/schema';
import { planConsume, revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

const NON_TERMINAL_STATUSES = [AITaskStatus.PENDING, AITaskStatus.PROCESSING];

export async function expireTaskIfNeeded(
  taskId: string,
  timeoutMs = 20 * 60 * 1000
) {
  if (envConfigs.database_provider === 'd1') {
    const deadline = new Date(Date.now() - timeoutMs);
    const [expiredTask] = await db()
      .update(aiTask)
      .set({ status: AITaskStatus.FAILED, activeSlot: null })
      .where(
        and(
          eq(aiTask.id, taskId),
          inArray(aiTask.status, NON_TERMINAL_STATUSES),
          isNull(aiTask.deletedAt),
          lt(aiTask.createdAt, deadline)
        )
      )
      .returning({ creditId: aiTask.creditId, userId: aiTask.userId });

    if (!expiredTask) return false;

    let creditIdToRevoke = expiredTask.creditId;
    if (!creditIdToRevoke) {
      const [record] = await db()
        .select({ id: credit.id })
        .from(credit)
        .where(
          and(
            eq(credit.userId, expiredTask.userId),
            eq(credit.transactionType, 'consume'),
            eq(credit.metadata, JSON.stringify({ taskId }))
          )
        )
        .limit(1);
      if (record) creditIdToRevoke = record.id;
    }
    if (creditIdToRevoke) await revoke(creditIdToRevoke);
    return true;
  }

  // revoke() is its own atomic write (D1-safe), so run it after the tx.
  let pendingRevoke: string | undefined;
  const expired = await db().transaction(async (tx: any) => {
    const q = tx.select().from(aiTask).where(eq(aiTask.id, taskId)).limit(1);
    const [task] = await (typeof (q as any).for === 'function'
      ? (q as any).for('update')
      : q);

    if (
      !task ||
      task.deletedAt ||
      !NON_TERMINAL_STATUSES.includes(task.status as AITaskStatus) ||
      Date.now() - new Date(task.createdAt).getTime() <= timeoutMs
    ) {
      return false;
    }

    await tx
      .update(aiTask)
      .set({ status: AITaskStatus.FAILED, activeSlot: null })
      .where(eq(aiTask.id, task.id));

    let creditIdToRevoke = task.creditId;
    if (!creditIdToRevoke && task.costCredits > 0) {
      const [record] = await tx
        .select({ id: credit.id })
        .from(credit)
        .where(
          and(
            eq(credit.userId, task.userId),
            eq(credit.transactionType, 'consume'),
            eq(credit.metadata, JSON.stringify({ taskId: task.id }))
          )
        )
        .limit(1);
      if (record) creditIdToRevoke = record.id;
    }

    if (creditIdToRevoke) pendingRevoke = creditIdToRevoke;
    return true;
  });
  if (pendingRevoke) await revoke(pendingRevoke);
  return expired;
}

export async function expireTimedOutTasks(limit = 100, userId?: string) {
  const deadline = new Date(Date.now() - 20 * 60 * 1000);
  const tasks = await db()
    .select({ id: aiTask.id })
    .from(aiTask)
    .where(
      and(
        userId ? eq(aiTask.userId, userId) : undefined,
        inArray(aiTask.status, NON_TERMINAL_STATUSES),
        isNull(aiTask.deletedAt),
        lt(aiTask.createdAt, deadline)
      )
    )
    .limit(limit);

  let expiredCount = 0;
  for (const task of tasks) {
    if (await expireTaskIfNeeded(task.id)) expiredCount++;
  }
  return expiredCount;
}

/**
 * Create an AI task with optional credit consumption.
 */
export async function createTask(params: {
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  costCredits?: number;
  options?: any;
}): Promise<any> {
  const { userId, mediaType, provider, model, prompt, costCredits, options } =
    params;

  for (let attempt = 0; attempt < 3; attempt++) {
    const taskData: typeof aiTask.$inferInsert = {
      id: getUuid(),
      userId,
      mediaType,
      provider,
      model,
      prompt,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
    };

    // Plan the credit charge first, then write the task and the charge in one
    // atomic step (D1-safe) — never a task without its charge or vice versa.
    const plan =
      costCredits && costCredits > 0
        ? await planConsume({
            userId,
            credits: costCredits,
            scene: 'ai_task',
            description: `AI ${mediaType} generation`,
            metadata: JSON.stringify({ taskId: taskData.id }),
          })
        : undefined;
    if (plan === null) throw new Error('Insufficient credits');
    if (plan) {
      // Stored for revocation if the task fails.
      taskData.taskInfo = JSON.stringify({
        creditId: plan.consumedCredit.id,
      });
    }

    try {
      await atomic((q) => [
        q.insert(aiTask).values(taskData),
        ...(plan ? plan.steps(q) : []),
      ]);
    } catch (error) {
      // A concurrent spend drained the grants we planned on: re-plan.
      if (error instanceof AtomicGuardError) continue;
      throw error;
    }

    const [task] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, taskData.id))
      .limit(1);
    return task;
  }
  throw new Error('Insufficient credits');
}

/**
 * Update task status. Revokes credits on failure.
 */
export async function updateTask(params: {
  taskId: string;
  status: AITaskStatus;
  taskResult?: any;
}) {
  const { taskId, status, taskResult } = params;

  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) throw new Error('Task not found');

  // Update task
  const updateData: any = { status };
  if (
    status === AITaskStatus.SUCCESS ||
    status === AITaskStatus.FAILED ||
    status === AITaskStatus.CANCELED
  ) {
    updateData.activeSlot = null;
  }
  if (taskResult) {
    updateData.taskResult = JSON.stringify(taskResult);
  }

  await db().update(aiTask).set(updateData).where(eq(aiTask.id, taskId));

  // Revoke credits on failure
  if (status === AITaskStatus.FAILED || status === AITaskStatus.CANCELED) {
    try {
      const info = task.taskInfo ? JSON.parse(task.taskInfo as string) : {};
      const creditId = task.creditId || info.creditId;
      if (creditId) {
        await revoke(creditId);
      }
    } catch {
      // Ignore parse errors
    }
  }
}

/**
 * Get tasks for a user.
 */
export async function getTasks(params: {
  userId: string;
  mediaType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, mediaType, status, page = 1, limit = 20 } = params;

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/**
 * Find task by ID.
 */
export async function findTask(taskId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);
  return result;
}
