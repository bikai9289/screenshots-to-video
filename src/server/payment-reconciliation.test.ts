import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { StripeProvider } from '@/core/payment/stripe';
import { PaymentStatus } from '@/core/payment/types';

const directory = mkdtempSync(join(tmpdir(), 'stv-reconcile-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${join(directory, 'test.db')}`,
});
vi.mock('@/modules/config/service', () => ({
  getAllConfigs: async () => ({
    stripe_secret_key: 'test-placeholder',
    stripe_enabled: 'true',
    default_payment_provider: 'stripe',
  }),
}));
let schema: any,
  database: any,
  service: typeof import('./payment-reconciliation');
let disposeD1: (() => Promise<void>) | undefined;
const base = {
  id: 'order1',
  orderNo: 'ORD-one',
  userId: 'user1',
  status: 'created',
  amount: 990,
  currency: 'usd',
  productId: 'screenshot_video_single',
  paymentProvider: 'stripe',
  paymentSessionId: 'cs_one',
  checkoutInfo: '{}',
};
beforeAll(async () => {
  const client = createClient({ url: process.env.DATABASE_URL! });
  await migrate(drizzle(client), { migrationsFolder: 'drizzle/sqlite' });
  if (process.env.ATOMIC_D1 === '1') {
    const ddl = (
      await client.execute(
        "select sql from sqlite_master where sql is not null and name not like 'sqlite_%' and name not like '__drizzle%' order by type = 'index'"
      )
    ).rows.map((row) => String(row.sql));
    const { getPlatformProxy } = await import('wrangler');
    const proxy = await getPlatformProxy<{ DB: any }>({
      configPath: 'tests/fixtures/wrangler.atomic.jsonc',
      persist: { path: join(directory, 'd1') },
    });
    for (const statement of ddl) await proxy.env.DB.prepare(statement).run();
    (globalThis as any).__CF_ENV__ = proxy.env;
    process.env.DATABASE_PROVIDER = 'd1';
    disposeD1 = proxy.dispose;
  }
  client.close();
  database = (await import('@/core/db')).db();
  schema = await import('@/config/db/schema');
  service = await import('./payment-reconciliation');
  await database
    .insert(schema.user)
    .values({ id: 'user1', name: 'Test', email: 'reconcile@example.test' });
}, 120_000);
beforeEach(async () => {
  vi.restoreAllMocks();
  await database.delete(schema.userEvent);
  await database.delete(schema.order);
  await database.insert(schema.order).values(base);
});
afterAll(async () => {
  (await import('@/core/db/sqlite')).closeSqliteDb();
  await disposeD1?.();
  try {
    rmSync(directory, { recursive: true, force: true, maxRetries: 5 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EBUSY')
      throw error; /* Windows may retain libsql's mapping until this worker exits. */
  }
});
describe('payment reconciliation with SQLite', () => {
  it('accepts a later verified paid notification after an earlier failure, and ignores late expiry', async () => {
    const { handleCheckoutSuccess } = await import('@/modules/payment/service');
    const failed = {
      provider: 'stripe',
      paymentStatus: PaymentStatus.CANCELED,
      paymentResult: {
        id: 'cs_one',
        status: 'expired',
        payment_status: 'unpaid',
      },
    };
    await handleCheckoutSuccess(failed, 'stripe');
    expect((await database.select().from(schema.order))[0].status).toBe(
      'failed'
    );
    await handleCheckoutSuccess(
      {
        provider: 'stripe',
        paymentStatus: PaymentStatus.SUCCESS,
        paymentResult: {
          id: 'cs_one',
          status: 'complete',
          payment_status: 'paid',
        },
        paymentInfo: {
          paymentAmount: 990,
          paymentCurrency: 'usd',
          transactionId: 'cs_one',
        },
      },
      'stripe'
    );
    await handleCheckoutSuccess(failed, 'stripe');
    expect((await database.select().from(schema.order))[0].status).toBe('paid');
  });
  it('rejects a provider success with the wrong paid amount', async () => {
    vi.spyOn(StripeProvider.prototype, 'getPaymentSession').mockResolvedValue({
      provider: 'stripe',
      paymentStatus: PaymentStatus.SUCCESS,
      paymentResult: {
        id: 'cs_one',
        status: 'complete',
        payment_status: 'paid',
      },
      paymentInfo: {
        paymentAmount: 1,
        paymentCurrency: 'usd',
        transactionId: 'cs_one',
      },
    });
    await expect(service.checkPaymentOrder('ORD-one', 'user1')).rejects.toThrow(
      'amount or currency'
    );
    expect((await database.select().from(schema.order))[0].status).toBe(
      'created'
    );
  });
  it('deduplicates concurrent failed attempts without closing a retryable order', async () => {
    const session = {
      provider: 'stripe',
      paymentStatus: PaymentStatus.PROCESSING,
      paymentResult: { id: 'cs_one', status: 'open', payment_status: 'unpaid' },
      paymentAttempt: {
        id: 'ch_one',
        code: 'card_declined',
        declineCode: 'insufficient_funds',
      },
    };
    await Promise.all([
      service.recordStripeAttempt(session),
      service.recordStripeAttempt(session),
    ]);
    const rows = await database.select().from(schema.userEvent);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('payment_attempt_failed');
    const [row] = await database.select().from(schema.order);
    expect(row.status).toBe('created');
    expect(service.publicPaymentStatus(row).paymentState).toBe('retryable');
  });
  it('never queries a provider for another user’s order', async () => {
    const spy = vi.spyOn(StripeProvider.prototype, 'getPaymentSession');
    expect(await service.checkPaymentOrder('ORD-one', 'other-user')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
  it('concurrent provider success checks settle once and an old attempt cannot downgrade paid', async () => {
    vi.spyOn(StripeProvider.prototype, 'getPaymentSession').mockResolvedValue({
      provider: 'stripe',
      paymentStatus: PaymentStatus.SUCCESS,
      paymentResult: {
        id: 'cs_one',
        status: 'complete',
        payment_status: 'paid',
      },
      paymentInfo: {
        paymentAmount: 990,
        paymentCurrency: 'usd',
        transactionId: 'cs_one',
      },
    });
    await Promise.all([
      service.checkPaymentOrder('ORD-one', 'user1'),
      service.checkPaymentOrder('ORD-one', 'user1'),
    ]);
    await service.recordStripeAttempt({
      provider: 'stripe',
      paymentResult: { id: 'cs_one', status: 'open' },
      paymentAttempt: { id: 'ch_old', code: 'card_declined', declineCode: '' },
    });
    const [row] = await database.select().from(schema.order);
    expect(row.status).toBe('paid');
    expect(service.publicPaymentStatus(row).paymentState).toBe('paid');
    expect(await database.select().from(schema.credit)).toHaveLength(0); // screenshot rights derive from the one paid order
  });
  it('preserves pending status on provider outage and continues the sweep', async () => {
    const check = vi
      .fn()
      .mockRejectedValueOnce(new Error('upstream unavailable'))
      .mockResolvedValueOnce({ status: 'paid' });
    const rotate = vi.fn().mockResolvedValue(undefined);
    expect(
      await service.runPaymentReconciliation(
        [
          { id: 'a', orderNo: 'a' },
          { id: 'b', orderNo: 'b' },
        ],
        check,
        rotate
      )
    ).toEqual({ checked: 1, unavailable: 1 });
    expect(rotate).toHaveBeenCalledWith('a');
    expect((await database.select().from(schema.order))[0].status).toBe(
      'created'
    );
  });
  it('records terminal expiry separately from a declined attempt', async () => {
    vi.spyOn(StripeProvider.prototype, 'getPaymentSession').mockResolvedValue({
      provider: 'stripe',
      paymentStatus: PaymentStatus.CANCELED,
      paymentResult: {
        id: 'cs_one',
        status: 'expired',
        payment_status: 'unpaid',
      },
    });
    expect(
      (await service.checkPaymentOrder('ORD-one', 'user1'))?.paymentState
    ).toBe('expired');
  });
});
