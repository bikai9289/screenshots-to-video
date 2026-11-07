import { and, asc, eq, inArray, isNull, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import type { PaymentSession } from '@/core/payment/types';
import { order, userEvent } from '@/config/db/schema';
import {
  legacyScreenshotPacks,
  screenshotPacks,
} from '@/config/screenshots-product';
import { refreshPaymentOrder } from '@/modules/payment/service';
import { md5 } from '@/lib/hash';
import { paymentDisplayState } from '@/lib/payment-state';

export function publicPaymentStatus(row: {
  status: string;
  paymentResult?: string | null;
}) {
  let snapshot: Record<string, any> = {};
  try {
    snapshot = JSON.parse(row.paymentResult || '{}') || {};
  } catch {
    /* Legacy provider data. */
  }
  return {
    paymentState: paymentDisplayState(row.status, snapshot, !!snapshot.attempt),
    lastAttemptCode:
      typeof snapshot.attempt?.declineCode === 'string'
        ? snapshot.attempt.declineCode
        : typeof snapshot.attempt?.code === 'string'
          ? snapshot.attempt.code
          : null,
    checkedAt:
      typeof snapshot.checkedAt === 'string' ? snapshot.checkedAt : null,
  };
}

/** Trusted provider data only. The unique key deduplicates webhook/poll races. */
export async function recordStripeAttempt(session: PaymentSession | undefined) {
  const attempt = session?.paymentAttempt;
  const sessionId = session?.paymentResult?.id;
  if (!attempt || !sessionId) return;
  const [found] = await db()
    .select({ id: order.id, userId: order.userId, orderNo: order.orderNo })
    .from(order)
    .where(
      and(
        eq(order.paymentProvider, 'stripe'),
        eq(order.paymentSessionId, sessionId),
        isNull(order.deletedAt)
      )
    )
    .limit(1);
  if (!found) return;
  await db()
    .update(order)
    .set({
      paymentResult: JSON.stringify({
        id: sessionId,
        status: session?.paymentResult?.status,
        payment_status: session?.paymentResult?.payment_status,
        checkedAt: new Date().toISOString(),
        attempt,
      }),
    })
    .where(
      and(eq(order.id, found.id), inArray(order.status, ['created', 'pending']))
    );
  await db()
    .insert(userEvent)
    .values({
      id: `payment_attempt_${md5(`${found.id}:${attempt.id}:${attempt.code}:${attempt.declineCode}`)}`,
      userId: found.userId,
      kind: 'payment_attempt_failed',
      detail: JSON.stringify({
        orderNo: found.orderNo,
        code: attempt.code,
        declineCode: attempt.declineCode,
      }),
      source: 'server',
      createdAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function checkPaymentOrder(orderNo: string, userId?: string) {
  const result = await refreshPaymentOrder(orderNo, userId);
  if (!result) return null;
  await recordStripeAttempt(result.session || undefined);
  return {
    orderNo: result.order.orderNo,
    status: result.order.status,
    ...publicPaymentStatus(result.order),
  };
}

export async function reconcilePayments() {
  const cutoff = new Date(Date.now() - 2 * 60_000);
  const pending = await db()
    .select({ id: order.id, orderNo: order.orderNo })
    .from(order)
    .where(
      and(
        eq(order.paymentProvider, 'stripe'),
        inArray(
          order.productId,
          [...screenshotPacks, ...legacyScreenshotPacks].map(
            (pack) => pack.productId
          )
        ),
        inArray(order.status, ['created', 'pending']),
        isNull(order.deletedAt),
        lt(order.updatedAt, cutoff)
      )
    )
    .orderBy(asc(order.updatedAt))
    .limit(20);
  return runPaymentReconciliation(pending, checkPaymentOrder, async (id) => {
    // Rotate unavailable/legacy sessions too; never classify an API error as failed payment.
    await db()
      .update(order)
      .set({ updatedAt: new Date() })
      .where(
        and(eq(order.id, id), inArray(order.status, ['created', 'pending']))
      );
  });
}

export async function runPaymentReconciliation(
  pending: { id: string; orderNo: string }[],
  check: (orderNo: string) => Promise<unknown>,
  onError: (id: string) => Promise<unknown>
) {
  const summary = { checked: 0, unavailable: 0 };
  for (const row of pending) {
    try {
      await check(row.orderNo);
      summary.checked++;
    } catch {
      summary.unavailable++;
      await onError(row.id);
    }
  }
  return summary;
}
