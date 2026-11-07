import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  sql,
} from 'drizzle-orm';

import type { SeeAPIInput, SeeAPIResult } from '@/core/ai/seeapi';
import { db } from '@/core/db';
import { atomic, AtomicGuardError, guard } from '@/core/db/atomic';
import {
  order,
  screenshotAsset,
  screenshotCreditAllocation,
  screenshotTask,
} from '@/config/db/schema';
import {
  getScreenshotPack,
  legacyScreenshotPacks,
  screenshotCreditCost,
  screenshotPacks,
} from '@/config/screenshots-product';
import { allocatedVideoCredits } from '@/lib/screenshot-billing';
import {
  StudioError,
  type PublicScreenshotTask,
  type ScreenshotRequest,
  type StudioErrorKey,
} from '@/lib/screenshots-contract';

async function digest(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    ),
  ]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
const paidConditions = (userId: string) =>
  and(
    eq(order.userId, userId),
    eq(order.status, 'paid'),
    isNull(order.deletedAt),
    gt(order.amount, 0),
    gt(order.paymentAmount, 0),
    inArray(
      order.productId,
      [...screenshotPacks, ...legacyScreenshotPacks].map(
        (pack) => pack.productId
      )
    )
  );

async function paidOrders(userId: string) {
  return db()
    .select()
    .from(order)
    .where(paidConditions(userId))
    .orderBy(order.createdAt, order.id);
}
async function usedRenders(orderId: string) {
  const [row] = await db()
    .select({ total: count() })
    .from(screenshotTask)
    .where(
      and(
        eq(screenshotTask.orderId, orderId),
        ne(screenshotTask.status, 'failed')
      )
    );
  return Number(row.total);
}

export async function getRenderBalance(userId: string) {
  const balance = await getVideoBalance(userId);
  // Compatibility for upload authorization: either kind grants access to input storage.
  return balance.remainingCredits + balance.legacyRenders;
}

async function usedCredits(orderId: string) {
  const [row] = await db()
    .select({ total: allocatedVideoCredits(orderId) })
    .from(order)
    .where(eq(order.id, orderId));
  return Number(row?.total ?? 0);
}

export async function getVideoBalance(userId: string) {
  const purchases = await paidOrders(userId);
  let remainingCredits = 0;
  let legacyRenders = 0;
  for (const purchase of purchases) {
    const pack = getScreenshotPack(purchase.productId)!;
    if (pack.legacy)
      legacyRenders += Math.max(
        0,
        pack.renders - (await usedRenders(purchase.id))
      );
    else
      remainingCredits += Math.max(
        0,
        pack.credits - (await usedCredits(purchase.id))
      );
  }
  return { remainingCredits, legacyRenders };
}

export async function findRender(userId: string, id: string) {
  const [row] = await db()
    .select()
    .from(screenshotTask)
    .where(and(eq(screenshotTask.id, id), eq(screenshotTask.userId, userId)))
    .limit(1);
  if (!row) throw new StudioError('NOT_FOUND');
  return row;
}

export async function reserveRender({
  userId,
  request,
  signAsset,
}: {
  userId: string;
  request: ScreenshotRequest;
  signAsset: (key: string) => Promise<string>;
}) {
  const id = await digest(`screenshot:${userId}:${request.idempotencyKey}`);
  const logicalInput = {
    assetIds: request.assetIds,
    prompt: request.prompt,
    duration: request.duration,
    aspectRatio: request.aspectRatio,
  };
  const inputHash = await digest(JSON.stringify(logicalInput));
  const existing = await db()
    .select()
    .from(screenshotTask)
    .where(eq(screenshotTask.id, id))
    .limit(1);
  if (existing[0]) {
    if (existing[0].userId !== userId || existing[0].inputHash !== inputHash)
      throw new StudioError('IDEMPOTENCY_CONFLICT');
    return { ...existing[0], requestKey: request.idempotencyKey };
  }
  const purchases = await paidOrders(userId);
  if (!purchases.length) throw new StudioError('PAID_ACCESS_REQUIRED');
  const assets = await db()
    .select()
    .from(screenshotAsset)
    .where(
      and(
        eq(screenshotAsset.userId, userId),
        inArray(screenshotAsset.id, request.assetIds)
      )
    );
  if (assets.length !== request.assetIds.length)
    throw new StudioError('NOT_FOUND');
  const now = new Date().toISOString();
  if (assets.some((asset: any) => asset.expiresAt <= now))
    throw new StudioError('ASSET_EXPIRED');
  const images = await Promise.all(
    request.assetIds.map((id) =>
      signAsset(assets.find((asset: any) => asset.id === id)!.objectKey)
    )
  );
  // This exact input is persisted once. Recovery replays it byte-for-byte, including signed URLs.
  const input: SeeAPIInput = {
    images,
    prompt: request.prompt,
    duration: request.duration,
    aspectRatio: request.aspectRatio,
  };
  for (const purchase of purchases) {
    const pack = getScreenshotPack(purchase.productId)!;
    if (!pack.legacy) continue;
    if ((await usedRenders(purchase.id)) >= pack.renders) continue;
    const row = {
      id,
      userId,
      orderId: purchase.id,
      inputHash,
      input: JSON.stringify(input),
      status: 'reserved',
      leaseUntil: '1970-01-01T00:00:00.000Z',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await atomic((q) => [
        guard({
          table: order,
          column: 'userId',
          where: eq(order.id, purchase.id),
          require: and(
            eq(order.status, 'paid'),
            isNull(order.deletedAt),
            gt(order.paymentAmount, 0)
          )!,
          message: 'Order no longer paid',
        }),
        guard({
          table: order,
          column: 'userId',
          where: eq(order.id, purchase.id),
          require: sql`(select count(*) from ${screenshotTask} where ${screenshotTask.orderId} = ${purchase.id} and ${screenshotTask.status} <> 'failed') < ${pack.renders}`,
          message: 'No renders remaining',
        }),
        q.insert(screenshotTask).values(row),
      ]);
      return {
        ...row,
        providerTaskId: null,
        outputUrl: null,
        errorCode: null,
        requestKey: request.idempotencyKey,
      };
    } catch (error) {
      const [replay] = await db()
        .select()
        .from(screenshotTask)
        .where(eq(screenshotTask.id, id))
        .limit(1);
      if (replay) {
        if (replay.inputHash !== inputHash)
          throw new StudioError('IDEMPOTENCY_CONFLICT');
        return { ...replay, requestKey: request.idempotencyKey };
      }
      if (!(error instanceof AtomicGuardError)) throw error;
    }
  }
  // A long video may combine credits from multiple packs. Guard all contributing
  // orders and insert all allocations in one atomic batch, including on D1.
  const needed = screenshotCreditCost[request.duration];
  for (let attempt = 0; attempt < 3; attempt++) {
    const allocations: {
      orderId: string;
      credits: number;
      capacity: number;
    }[] = [];
    let remaining = needed as number;
    for (const purchase of await paidOrders(userId)) {
      const pack = getScreenshotPack(purchase.productId)!;
      if (pack.legacy) continue;
      const credits = Math.min(
        remaining,
        Math.max(0, pack.credits - (await usedCredits(purchase.id)))
      );
      if (credits)
        allocations.push({
          orderId: purchase.id,
          credits,
          capacity: pack.credits,
        });
      remaining -= credits;
      if (!remaining) break;
    }
    if (remaining) throw new StudioError('INSUFFICIENT_CREDITS');
    const row = {
      id,
      userId,
      orderId: allocations[0].orderId,
      inputHash,
      input: JSON.stringify({ ...input, billing: { credits: needed } }),
      status: 'reserved',
      leaseUntil: '1970-01-01T00:00:00.000Z',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await atomic((q) => [
        ...allocations.map((allocation) =>
          guard({
            table: order,
            column: 'userId',
            where: eq(order.id, allocation.orderId),
            require: and(
              eq(order.userId, userId),
              eq(order.status, 'paid'),
              isNull(order.deletedAt),
              gt(order.paymentAmount, 0),
              sql`${allocatedVideoCredits(allocation.orderId)} + ${allocation.credits} <= ${allocation.capacity}`
            )!,
            message: 'Video credit balance changed',
          })
        ),
        q.insert(screenshotTask).values(row),
        ...allocations.map((allocation) =>
          q.insert(screenshotCreditAllocation).values({
            id: `${id}_${allocation.orderId}`,
            taskId: id,
            orderId: allocation.orderId,
            credits: allocation.credits,
          })
        ),
      ]);
      return {
        ...row,
        providerTaskId: null,
        outputUrl: null,
        errorCode: null,
        requestKey: request.idempotencyKey,
      };
    } catch (error) {
      const [replay] = await db()
        .select()
        .from(screenshotTask)
        .where(eq(screenshotTask.id, id))
        .limit(1);
      if (replay) {
        if (replay.userId !== userId || replay.inputHash !== inputHash)
          throw new StudioError('IDEMPOTENCY_CONFLICT');
        return { ...replay, requestKey: request.idempotencyKey };
      }
      if (!(error instanceof AtomicGuardError)) throw error;
    }
  }
  throw new StudioError('INSUFFICIENT_CREDITS');
}

export async function claimSubmission(userId: string, id: string) {
  const task = await findRender(userId, id);
  const now = new Date().toISOString();
  if (task.status !== 'reserved' || task.leaseUntil > now) return null;
  try {
    await atomic((q) => [
      guard({
        table: screenshotTask,
        column: 'userId',
        where: eq(screenshotTask.id, id),
        require: and(
          eq(screenshotTask.status, 'reserved'),
          lt(screenshotTask.leaseUntil, now)
        )!,
        message: 'Submission claimed',
      }),
      q
        .update(screenshotTask)
        .set({
          leaseUntil: new Date(Date.now() + 60_000).toISOString(),
          updatedAt: now,
        })
        .where(eq(screenshotTask.id, id)),
    ]);
    return task;
  } catch (error) {
    if (error instanceof AtomicGuardError) return null;
    throw error;
  }
}

export async function settleRender(id: string, result: SeeAPIResult) {
  const status =
    result.status === 'processing'
      ? 'processing'
      : result.status === 'succeeded'
        ? 'success'
        : 'failed';
  await db()
    .update(screenshotTask)
    .set({
      status,
      providerTaskId: result.id,
      outputUrl: result.videoUrl,
      errorCode: status === 'failed' ? 'GENERATION_FAILED' : null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(screenshotTask.id, id),
        inArray(screenshotTask.status, ['reserved', 'processing'])
      )
    );
}

export async function recordRenderIssue(
  id: string,
  code: StudioErrorKey,
  definitive = false
) {
  await db()
    .update(screenshotTask)
    .set({
      errorCode: code,
      ...(definitive ? { status: 'failed' } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(screenshotTask.id, id),
        inArray(screenshotTask.status, ['reserved', 'processing'])
      )
    );
}

export function publicRender(task: any): PublicScreenshotTask {
  const input = JSON.parse(task.input) as SeeAPIInput;
  return {
    id: task.id,
    status: task.status,
    duration: input.duration,
    aspectRatio: input.aspectRatio,
    createdAt: task.createdAt,
    errorCode: task.errorCode ?? null,
    videoUrl: task.status === 'success' ? task.outputUrl : null,
  };
}

export async function listRenders(userId: string) {
  return db()
    .select()
    .from(screenshotTask)
    .where(eq(screenshotTask.userId, userId))
    .orderBy(desc(screenshotTask.createdAt))
    .limit(30);
}

export async function saveScreenshotAsset(
  asset: typeof screenshotAsset.$inferInsert
) {
  await db().insert(screenshotAsset).values(asset);
}
