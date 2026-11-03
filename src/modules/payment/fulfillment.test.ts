import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatus } from '@/core/payment/types';

/**
 * Fake DB without row locks (like D1/SQLite): reads return snapshots, and
 * the conditional UPDATEs are emulated by their intent so concurrent calls
 * interleave the way they would on D1.
 */
const state = vi.hoisted(() => ({
  orders: [] as Record<string, any>[],
  credits: [] as Record<string, any>[],
}));

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

vi.mock('@/core/db', async () => {
  const schema = await import('@/config/db/schema');
  const fake: any = {
    transaction: async (fn: any) => fn(fake), // D1 shim: fn(db)
    select: () => {
      let table: any;
      const q: any = {
        from: (t: any) => {
          table = t;
          return q;
        },
        where: () => q,
        for: () => q,
        limit: async () => {
          await tick();
          if (table === schema.order) {
            return state.orders.map((row) => ({ ...row }));
          }
          if (table === schema.credit) {
            return state.credits.filter((c) => c.transactionType === 'grant');
          }
          return [];
        },
      };
      return q;
    },
    update: (table: any) => ({
      set: (values: Record<string, any>) => ({
        where: async () => {
          await tick();
          if (table !== schema.order) return { rowsAffected: 0 };
          const row = state.orders[0];
          // claim created/pending → paid
          if (values.status === 'paid') {
            if (!['created', 'pending'].includes(row.status)) {
              return { rowsAffected: 0 };
            }
            Object.assign(row, values);
            return { rowsAffected: 1 };
          }
          Object.assign(row, values);
          return { rowsAffected: 1 };
        },
      }),
    }),
    insert: (table: any) => ({
      values: (values: Record<string, any>) => ({
        onConflictDoNothing: async () => {
          await tick();
          if (table !== schema.credit) return { rowsAffected: 0 };
          if (
            state.credits.some((c) => c.transactionNo === values.transactionNo)
          ) {
            return { rowsAffected: 0 };
          }
          state.credits.push(values);
          return { rowsAffected: 1 };
        },
      }),
    }),
  };
  return { db: () => fake, isCloudflareWorker:false, hasDatabaseConfigured:()=>false };
});

const { handleCheckoutSuccess, renewalOrderIdFor } = await import('./service');

const baseOrder = {
  id: 'o1',
  orderNo: 'ORD-1',
  status: 'created',
  amount: 999,
  currency: 'usd',
  paymentType: 'one-time',
  paymentProvider: 'stripe',
  paymentSessionId: 'cs_1',
  creditsAmount: 100,
  creditsValidDays: 30,
  userId: 'u1',
  userEmail: 'a@b.c',
  subscriptionNo: null,
  deletedAt: null,
};

const paidSession = {
  paymentStatus: PaymentStatus.SUCCESS,
  paymentResult: { id: 'cs_1' },
  paymentInfo: {
    paymentAmount: 999,
    paymentCurrency: 'usd',
    transactionId: 'cs_1',
  },
};

beforeEach(() => {
  state.orders = [{ ...baseOrder }];
  state.credits = [];
});

describe('handleCheckoutSuccess claim-first', () => {
  it('fulfills once: marks paid and grants credits once', async () => {
    await handleCheckoutSuccess(paidSession, 'stripe');
    expect(state.orders[0].status).toBe('paid');
    expect(state.credits).toHaveLength(1);
    expect(state.credits[0]).toMatchObject({
      orderNo: 'ORD-1',
      transactionNo: 'grant-ORD-1',
      credits: 100,
    });
  });

  it('concurrent webhook + callback grant credits only once', async () => {
    await Promise.all([
      handleCheckoutSuccess(paidSession, 'stripe'),
      handleCheckoutSuccess(paidSession, 'stripe'),
      handleCheckoutSuccess(paidSession, 'stripe'),
    ]);
    expect(state.orders[0].status).toBe('paid');
    expect(state.credits).toHaveLength(1);
  });

  it('backfills a paid order missing its grant, once', async () => {
    state.orders = [{ ...baseOrder, status: 'paid' }];
    await Promise.all([
      handleCheckoutSuccess(paidSession, 'stripe'),
      handleCheckoutSuccess(paidSession, 'stripe'),
    ]);
    expect(state.credits).toHaveLength(1);
  });

  it('does not grant again when the paid order already has a grant', async () => {
    state.orders = [{ ...baseOrder, status: 'paid' }];
    state.credits = [
      { orderNo: 'ORD-1', transactionType: 'grant', transactionNo: 'legacy' },
    ];
    await handleCheckoutSuccess(paidSession, 'stripe');
    expect(state.credits).toHaveLength(1);
  });

  it('does not touch abnormal orders', async () => {
    state.orders = [{ ...baseOrder, status: 'abnormal' }];
    await handleCheckoutSuccess(paidSession, 'stripe');
    expect(state.orders[0].status).toBe('abnormal');
    expect(state.credits).toHaveLength(0);
  });
});

describe('renewalOrderIdFor', () => {
  const base = {
    provider: 'stripe',
    subscriptionNo: 'sub_1',
    currentPeriodStart: new Date('2026-11-01T00:00:00Z'),
  };

  it('uses the transaction id when present', () => {
    const a = renewalOrderIdFor({ ...base, transactionId: 'in_1' });
    const b = renewalOrderIdFor({
      ...base,
      transactionId: 'in_1',
      currentPeriodStart: new Date('2026-12-01T00:00:00Z'),
    });
    expect(a).toBe(b);
    expect(a).not.toBe(renewalOrderIdFor({ ...base, transactionId: 'in_2' }));
  });

  it('without a transaction id, redeliveries of one period share a key', () => {
    const a = renewalOrderIdFor(base);
    const b = renewalOrderIdFor({
      ...base,
      transactionId: null,
      currentPeriodStart: '2026-11-01T00:00:00.000Z',
    });
    expect(a).toBe(b);
  });

  it('without a transaction id, different periods or subscriptions differ', () => {
    const a = renewalOrderIdFor(base);
    expect(
      renewalOrderIdFor({
        ...base,
        currentPeriodStart: new Date('2026-12-01T00:00:00Z'),
      })
    ).not.toBe(a);
    expect(renewalOrderIdFor({ ...base, subscriptionNo: 'sub_2' })).not.toBe(a);
    expect(renewalOrderIdFor({ ...base, provider: 'creem' })).not.toBe(a);
  });
});
