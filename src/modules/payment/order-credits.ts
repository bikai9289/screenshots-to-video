import { and, eq, isNull } from 'drizzle-orm';

import { credit } from '@/config/db/schema';
import { CreditTransactionType } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

/**
 * Rows changed by an UPDATE/INSERT across the supported drivers:
 * libsql (rowsAffected), postgres-js (count), mysql2 ([header].affectedRows),
 * D1 (meta.changes).
 */
export function paymentAffectedRows(result: any): number {
  const candidates = [
    result?.rowsAffected,
    result?.rowCount,
    result?.affectedRows,
    result?.count,
    result?.meta?.changes,
    result?.[0]?.affectedRows,
    result?.[0]?.rowCount,
  ];
  const value = candidates.find((candidate) =>
    Number.isFinite(Number(candidate))
  );
  return value === undefined ? 0 : Number(value);
}

/**
 * INSERT that skips on a unique/primary-key conflict instead of throwing
 * (ON CONFLICT DO NOTHING on Postgres/SQLite/D1, INSERT IGNORE on MySQL).
 * Returns the number of rows inserted (0 = already existed).
 */
export async function insertIgnoringConflict(
  database: any,
  table: any,
  values: Record<string, unknown>
): Promise<number> {
  const builder = database.insert(table);
  if (typeof builder.ignore === 'function') {
    return paymentAffectedRows(await builder.ignore().values(values));
  }
  const query = builder.values(values);
  return paymentAffectedRows(
    await (typeof query.onConflictDoNothing === 'function'
      ? query.onConflictDoNothing()
      : query)
  );
}

/**
 * Deterministic transaction_no (unique column) for an order's GRANT, so two
 * concurrent grants for the same order collide instead of both inserting.
 */
export function orderGrantTransactionNo(orderNo: string): string {
  return `grant-${orderNo}`;
}

/**
 * Grant an order's credits at most once: skip when a GRANT for the order
 * already exists (incl. legacy random transaction_no rows), and insert with
 * the deterministic transaction_no so racing callers can't both insert.
 * Returns true when this call inserted the grant.
 */
export async function grantOrderCreditsOnce(
  database: any,
  params: {
    orderNo: string;
    userId: string;
    userEmail?: string | null;
    subscriptionNo?: string | null;
    credits: number | null | undefined;
    transactionScene: string;
    description: string;
    expiresAt: Date | null;
  }
): Promise<boolean> {
  const credits = Number(params.credits || 0);
  if (!params.orderNo || !(credits > 0)) return false;

  const [existing] = await database
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.orderNo, params.orderNo),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        isNull(credit.deletedAt)
      )
    )
    .limit(1);
  if (existing) return false;

  const inserted = await insertIgnoringConflict(database, credit, {
    id: getUuid(),
    userId: params.userId,
    userEmail: params.userEmail || '',
    orderNo: params.orderNo,
    subscriptionNo: params.subscriptionNo || '',
    transactionNo: orderGrantTransactionNo(params.orderNo),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: params.transactionScene,
    credits,
    remainingCredits: credits,
    description: params.description,
    expiresAt: params.expiresAt,
    status: 'active',
  });
  return inserted > 0;
}
