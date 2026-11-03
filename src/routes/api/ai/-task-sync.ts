import { and, eq, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm';

import {
  AITaskStatus,
  extractAudioUrl,
  extractMediaUrl,
  extractVideoUrl,
} from '@/core/ai/types';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { expireTaskIfNeeded } from '@/modules/ai-tasks/service';
import { queryAITask } from '@/modules/ai/service';
import { revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

import {
  inFlightTaskQueries,
  mapConcurrent,
  parseTaskJson,
  POLL_LEASE_MS,
  toTaskResult,
} from './-task-utils';

export async function syncSingleTask(existingTask: any, taskId: string) {
  let activePollLeaseId: string | null = null;
  try {
    const isTerminal =
      existingTask.status === 'success' ||
      existingTask.status === 'failed' ||
      existingTask.status === 'canceled';

    if (isTerminal) {
      return toTaskResult(existingTask, taskId);
    }

    // Bound orphaned tasks so a lost provider callback cannot leave a
    // creation in "processing" forever. The client uses the same 20-minute
    // retention window for pending local creations.
    const createdAt = existingTask.createdAt
      ? new Date(existingTask.createdAt).getTime()
      : 0;
    if (createdAt > 0 && Date.now() - createdAt > 20 * 60 * 1000) {
      if (await expireTaskIfNeeded(existingTask.id)) {
        return toTaskResult({ ...existingTask, status: 'failed' }, taskId);
      }
    }

    const vendorTaskId = existingTask.taskId;
    if (!vendorTaskId || vendorTaskId === existingTask.id) {
      return {
        taskStatus:
          existingTask.status === 'processing'
            ? AITaskStatus.PROCESSING
            : AITaskStatus.PENDING,
        id: existingTask.id,
        taskId: existingTask.taskId || taskId,
        mediaType: existingTask.mediaType,
        taskInfo: parseTaskJson(existingTask.taskInfo),
      };
    }

    const pollLeaseId = getUuid();
    activePollLeaseId = pollLeaseId;
    const now = new Date();
    await db()
      .update(aiTask)
      .set({
        pollLeaseId,
        pollLeaseExpiresAt: new Date(now.getTime() + POLL_LEASE_MS),
      })
      .where(
        and(
          eq(aiTask.id, existingTask.id),
          isNull(aiTask.deletedAt),
          eq(aiTask.status, existingTask.status),
          or(
            isNull(aiTask.pollLeaseExpiresAt),
            lt(aiTask.pollLeaseExpiresAt, now)
          )
        )
      );

    const [leasedTask] = await db()
      .select()
      .from(aiTask)
      .where(
        and(eq(aiTask.id, existingTask.id), eq(aiTask.pollLeaseId, pollLeaseId))
      )
      .limit(1);
    if (!leasedTask) return toTaskResult(existingTask, taskId);
    existingTask = leasedTask;

    let result: any;
    let leaseRenewTimer: NodeJS.Timeout | null = null;
    try {
      // 租约心跳自动续期：查询进行中定期延长租约，防止第三方慢查询（>10s）导致租约过期被并发击穿
      leaseRenewTimer = setInterval(
        async () => {
          try {
            await db()
              .update(aiTask)
              .set({
                pollLeaseExpiresAt: new Date(Date.now() + POLL_LEASE_MS),
              })
              .where(
                and(
                  eq(aiTask.id, existingTask.id),
                  eq(aiTask.pollLeaseId, pollLeaseId)
                )
              );
          } catch {}
        },
        Math.floor(POLL_LEASE_MS / 3)
      );

      const inflightKey = `${existingTask.id}:${vendorTaskId}`;
      if (!inFlightTaskQueries.has(inflightKey)) {
        inFlightTaskQueries.set(
          inflightKey,
          queryAITask(
            vendorTaskId,
            existingTask.mediaType,
            existingTask.model,
            existingTask.provider,
            existingTask
          ).finally(() => {
            inFlightTaskQueries.delete(inflightKey);
          })
        );
      }
      result = await inFlightTaskQueries.get(inflightKey);
    } catch (queryErr) {
      await db()
        .update(aiTask)
        .set({ pollLeaseId: null, pollLeaseExpiresAt: null })
        .where(
          and(
            eq(aiTask.id, existingTask.id),
            eq(aiTask.pollLeaseId, pollLeaseId)
          )
        );
      throw queryErr;
    } finally {
      if (leaseRenewTimer) {
        clearInterval(leaseRenewTimer);
        leaseRenewTimer = null;
      }
    }
    const mediaUrl =
      existingTask.mediaType === 'music'
        ? extractAudioUrl(result)
        : existingTask.mediaType === 'video'
          ? extractVideoUrl(result) || extractMediaUrl(result)
          : extractMediaUrl(result);

    try {
      const isSuccess =
        result.taskStatus === AITaskStatus.SUCCESS && Boolean(mediaUrl);
      const isFailed =
        result.taskStatus === AITaskStatus.FAILED ||
        result.taskStatus === AITaskStatus.CANCELED ||
        (result.taskStatus === AITaskStatus.SUCCESS && !mediaUrl);
      const isProcessing = result.taskStatus === AITaskStatus.PROCESSING;

      const updates: any = {
        taskInfo: result.taskInfo
          ? JSON.stringify(result.taskInfo)
          : existingTask.taskInfo,
        taskResult: JSON.stringify(result),
        pollLeaseId: null,
        pollLeaseExpiresAt: null,
      };

      if (isSuccess && !isTerminal) {
        updates.status = 'success';
        updates.activeSlot = null;
      } else if (isFailed && !isTerminal) {
        updates.status =
          result.taskStatus === AITaskStatus.CANCELED ? 'canceled' : 'failed';
        updates.activeSlot = null;
      } else if (
        isProcessing &&
        !isTerminal &&
        existingTask.status !== 'processing'
      ) {
        updates.status = 'processing';
      }

      const canTransition = and(
        eq(aiTask.id, existingTask.id),
        isNull(aiTask.deletedAt),
        eq(aiTask.status, existingTask.status),
        eq(aiTask.pollLeaseId, pollLeaseId)
      );

      // Mock tasks advance via taskInfo.mockQueryCount while processing;
      // retain each response so the mock can eventually reach success.
      if (
        !isSuccess &&
        !isFailed &&
        existingTask.status === 'processing' &&
        !String(existingTask.taskId || '').startsWith('mock_')
      ) {
        delete updates.taskInfo;
        delete updates.taskResult;
      }

      if (Object.keys(updates).length > 0) {
        await db().update(aiTask).set(updates).where(canTransition);
      }

      const [currentTask] = await db()
        .select()
        .from(aiTask)
        .where(eq(aiTask.id, existingTask.id))
        .limit(1);
      if (currentTask) {
        if (
          isFailed &&
          (currentTask.status === 'failed' ||
            currentTask.status === 'canceled') &&
          currentTask.creditId
        ) {
          const creditToRevoke = currentTask.creditId;
          await db()
            .update(aiTask)
            .set({ creditId: null })
            .where(eq(aiTask.id, currentTask.id));
          await revoke(creditToRevoke);
        }
        return toTaskResult(currentTask, taskId);
      }
      throw new Error(`Failed to find task ${existingTask.id} after update`);
    } catch (dbErr) {
      console.error('Failed to sync aiTask in DB:', dbErr);
      await db()
        .update(aiTask)
        .set({ pollLeaseId: null, pollLeaseExpiresAt: null })
        .where(
          and(
            eq(aiTask.id, existingTask.id),
            eq(aiTask.pollLeaseId, pollLeaseId)
          )
        )
        .catch(() => {});
      throw dbErr;
    }
  } catch (err: any) {
    if (activePollLeaseId && existingTask?.id) {
      await db()
        .update(aiTask)
        .set({ pollLeaseId: null, pollLeaseExpiresAt: null })
        .where(
          and(
            eq(aiTask.id, existingTask.id),
            eq(aiTask.pollLeaseId, activePollLeaseId)
          )
        )
        .catch(() => {});
    }
    console.error(`Failed to sync task ${existingTask.id}:`, err);
    return {
      taskStatus:
        existingTask.status === 'success'
          ? AITaskStatus.SUCCESS
          : existingTask.status === 'failed'
            ? AITaskStatus.FAILED
            : AITaskStatus.PENDING,
      id: existingTask.id,
      taskId: existingTask.taskId || taskId,
      mediaType: existingTask.mediaType,
      taskInfo: parseTaskJson(existingTask.taskInfo),
      syncError: err,
    };
  }
}

export async function reclaimUserGhostSlots(userId: string): Promise<number> {
  const heldTasks = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        isNotNull(aiTask.activeSlot),
        inArray(aiTask.status, [AITaskStatus.PENDING, AITaskStatus.PROCESSING]),
        isNull(aiTask.deletedAt)
      )
    );

  if (heldTasks.length === 0) return 0;

  // 主动向第三方同步最新状态或触发超时清理（并发度限制为 2，防止并发风暴）
  await mapConcurrent(heldTasks, 2, async (task: any) => {
    try {
      await syncSingleTask(task, task.taskId || task.id);
    } catch (err) {
      console.warn(
        `[reclaimUserGhostSlots] Failed to sync task ${task.id}:`,
        err
      );
    }
  });

  // 严格依据第三方回调/查询已确认的终态或超时窗口释放槽位，杜绝提前释放导致突破并发上限
  const remainingHeld = await db()
    .select({ id: aiTask.id })
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        isNotNull(aiTask.activeSlot),
        inArray(aiTask.status, [AITaskStatus.PENDING, AITaskStatus.PROCESSING]),
        isNull(aiTask.deletedAt)
      )
    );

  return Math.max(0, heldTasks.length - remainingHeld.length);
}
