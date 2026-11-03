import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, order } from '@/config/db/schema';
import {
  calculateCreditExpirationTime,
  CreditStatus,
  CreditTransactionType,
} from '@/modules/credits/service';

import { grantOrderCreditsOnce, paymentAffectedRows } from './order-credits';

export type AdminUpdateOrderResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'order_not_found'
        | 'status_conflict'
        | 'invalid_status_transition';
    };

export type AdminOrderPatch = {
  status?: string;
  productId?: string;
  productName?: string;
  description?: string;
};

/**
 * Admin order edit. Only `abnormal → paid` may mark paid and grant credits
 * (manual release after amount-mismatch review). Leaving `paid` expires this
 * order's active credit grants (same as a refund webhook).
 *
 * A status change is a conditional claim (`status = before.status`), so of
 * two concurrent edits only the one that actually flips the status runs the
 * credit side effects (D1 has no real transactions — rely on the guarded
 * UPDATE's affected rows). The loser gets `status_conflict`.
 */
export async function adminUpdateOrder(
  orderNo: string,
  patch: AdminOrderPatch
): Promise<AdminUpdateOrderResult> {
  const [before] = await db()
    .select()
    .from(order)
    .where(and(eq(order.orderNo, orderNo), isNull(order.deletedAt)))
    .limit(1);
  if (!before) return { ok: false, error: 'order_not_found' };

  const statusChanging =
    patch.status !== undefined && patch.status !== before.status;

  // Unpaid → paid without a prior amount-mismatch review would grant catalog
  // credits with no payment proof. Only abnormal (webhook held for review)
  // may be released this way.
  if (
    statusChanging &&
    patch.status === 'paid' &&
    before.status !== 'abnormal'
  ) {
    return { ok: false, error: 'invalid_status_transition' };
  }

  if (!statusChanging) {
    // Field-only edit: no credit side effects. Drop an unchanged `status` so
    // a stale form can't overwrite a concurrent status change.
    const { status: _unchangedStatus, ...fields } = patch;
    if (Object.keys(fields).length > 0) {
      await db()
        .update(order)
        .set(fields)
        .where(and(eq(order.orderNo, orderNo), isNull(order.deletedAt)));
    }
    return { ok: true };
  }

  const claim = await db()
    .update(order)
    .set(patch)
    .where(
      and(
        eq(order.orderNo, orderNo),
        isNull(order.deletedAt),
        eq(order.status, before.status)
      )
    );
  if (paymentAffectedRows(claim) < 1) {
    return { ok: false, error: 'status_conflict' };
  }

  const wasPaid = before.status === 'paid';
  const nowPaid = patch.status === 'paid';

  if (wasPaid && !nowPaid) {
    await expireOrderCreditGrants(orderNo);
    return { ok: true };
  }

  if (!wasPaid && nowPaid) {
    // Same once-per-order guard as webhook fulfillment/backfill: skips an
    // existing GRANT and uses the deterministic transaction_no, so a racing
    // webhook redelivery can't add a second grant.
    await grantOrderCreditsOnce(db(), {
      orderNo: before.orderNo,
      userId: before.userId,
      userEmail: before.userEmail,
      subscriptionNo: before.subscriptionNo,
      credits: before.creditsAmount,
      transactionScene:
        before.paymentType === 'subscription' ? 'subscription' : 'payment',
      description: 'Grant credit (admin)',
      expiresAt: calculateCreditExpirationTime({
        creditsValidDays: before.creditsValidDays || 0,
      }),
    });
  }

  return { ok: true };
}

/** Same clawback as the refund webhook: zero this order's active grants. */
async function expireOrderCreditGrants(orderNo: string) {
  await db()
    .update(credit)
    .set({ remainingCredits: 0, status: CreditStatus.EXPIRED })
    .where(
      and(
        eq(credit.orderNo, orderNo),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE)
      )
    );
}
