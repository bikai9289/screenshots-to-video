import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory fake of the few drizzle chains adminUpdateOrder uses.
const state = vi.hoisted(() => ({
  selects: [] as unknown[][],
  updates: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  affected: [] as number[],
}));

vi.mock('@/core/db', () => {
  const select = () => {
    const q: any = {
      from: () => q,
      where: () => q,
      limit: async () => state.selects.shift() ?? [],
    };
    return q;
  };
  return {
    db: () => ({
      select,
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: async () => {
            state.updates.push(values);
            return { rowsAffected: state.affected.shift() ?? 1 };
          },
        }),
      }),
      insert: () => ({
        values: (values: Record<string, unknown>) => ({
          // grantOrderCreditsOnce → ON CONFLICT DO NOTHING on transaction_no
          onConflictDoNothing: async () => {
            const dup = state.inserts.some(
              (row) => row.transactionNo === values.transactionNo
            );
            if (!dup) state.inserts.push(values);
            return { rowsAffected: dup ? 0 : 1 };
          },
        }),
      }),
    }),
  };
});

vi.mock('@/modules/credits/service', () => ({
  calculateCreditExpirationTime: () => null,
  CreditStatus: { ACTIVE: 'active', EXPIRED: 'expired' },
  CreditTransactionType: { GRANT: 'grant' },
}));

// Leaving `paid` expires the order's active grants (refund-style clawback).
const EXPIRE_GRANTS = { remainingCredits: 0, status: 'expired' };
const expiredGrants = () =>
  state.updates.filter((u) => u.remainingCredits === 0).length;

const { adminUpdateOrder } = await import('./order-admin');

const baseOrder = {
  orderNo: 'ORD-1',
  status: 'abnormal',
  userId: 'u1',
  userEmail: 'a@b.c',
  creditsAmount: 100,
  creditsValidDays: 30,
  paymentType: 'one-time',
  subscriptionNo: null,
};

beforeEach(() => {
  state.selects = [];
  state.updates = [];
  state.inserts = [];
  state.affected = [];
});

describe('adminUpdateOrder status claim', () => {
  it('grants credits when this request moves abnormal → paid', async () => {
    state.selects.push([baseOrder], []); // order, then "no existing grant"
    const r = await adminUpdateOrder('ORD-1', { status: 'paid' });
    expect(r).toEqual({ ok: true });
    expect(state.updates).toEqual([{ status: 'paid' }]);
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toMatchObject({
      orderNo: 'ORD-1',
      transactionType: 'grant',
      transactionNo: 'grant-ORD-1',
      credits: 100,
    });
  });

  it('rejects unpaid → paid when the order is not abnormal', async () => {
    for (const status of ['created', 'pending', 'failed']) {
      state.selects.push([{ ...baseOrder, status }]);
      const r = await adminUpdateOrder('ORD-1', { status: 'paid' });
      expect(r).toEqual({ ok: false, error: 'invalid_status_transition' });
      expect(state.updates).toHaveLength(0);
      expect(state.inserts).toHaveLength(0);
    }
  });

  it('returns status_conflict and grants nothing when the claim loses', async () => {
    state.selects.push([baseOrder]);
    state.affected.push(0);
    const r = await adminUpdateOrder('ORD-1', { status: 'paid' });
    expect(r).toEqual({ ok: false, error: 'status_conflict' });
    expect(state.inserts).toHaveLength(0);
  });

  it('does not double-grant when a GRANT already exists', async () => {
    state.selects.push([baseOrder], [{ id: 'c1' }]);
    const r = await adminUpdateOrder('ORD-1', { status: 'paid' });
    expect(r).toEqual({ ok: true });
    expect(state.inserts).toHaveLength(0);
  });

  it('expires grants only when this request moves paid → other', async () => {
    state.selects.push([{ ...baseOrder, status: 'paid' }]);
    await adminUpdateOrder('ORD-1', { status: 'failed' });
    expect(state.updates).toEqual([{ status: 'failed' }, EXPIRE_GRANTS]);

    state.updates = [];
    state.selects.push([{ ...baseOrder, status: 'paid' }]);
    state.affected.push(0);
    const r = await adminUpdateOrder('ORD-1', { status: 'failed' });
    expect(r).toEqual({ ok: false, error: 'status_conflict' });
    expect(expiredGrants()).toBe(0);
  });

  it('field-only edit drops an unchanged status and has no side effects', async () => {
    state.selects.push([{ ...baseOrder, status: 'paid' }]);
    const r = await adminUpdateOrder('ORD-1', {
      status: 'paid',
      description: 'note',
    });
    expect(r).toEqual({ ok: true });
    expect(state.updates).toEqual([{ description: 'note' }]);
    expect(state.inserts).toHaveLength(0);
    expect(expiredGrants()).toBe(0);
  });

  it('returns order_not_found for a missing order', async () => {
    const r = await adminUpdateOrder('NOPE', { status: 'paid' });
    expect(r).toEqual({ ok: false, error: 'order_not_found' });
    expect(state.updates).toHaveLength(0);
  });
});
