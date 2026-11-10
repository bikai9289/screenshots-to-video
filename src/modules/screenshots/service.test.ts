import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'stv-paid-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${join(dir, 'test.db')}`,
  AUTH_SECRET: 'test-only-stv-key',
  NODE_ENV: 'test',
});
let service: typeof import('./service');
let database: ReturnType<(typeof import('@/core/db'))['db']>;
let schema: typeof import('@/config/db/schema');
let disposeD1: (() => Promise<void>) | undefined;
beforeAll(
  async () => {
    execFileSync(
      process.execPath,
      [
        'node_modules/drizzle-kit/bin.cjs',
        'push',
        '--dialect=sqlite',
        '--schema=./src/config/db/schema.sqlite.ts',
        `--url=${process.env.DATABASE_URL}`,
      ],
      { stdio: 'pipe' }
    );
    if (process.env.ATOMIC_D1 === '1') {
      const { createClient } = await import('@libsql/client');
      const sqlite = createClient({ url: process.env.DATABASE_URL! });
      const ddl = (
        await sqlite.execute(
          "select sql from sqlite_master where sql is not null and name not like 'sqlite_%' and name not like '__drizzle%' order by type = 'index'"
        )
      ).rows.map((row) => String(row.sql));
      sqlite.close();
      const { getPlatformProxy } = await import('wrangler');
      const proxy = await getPlatformProxy<{ DB: any }>({
        configPath: 'tests/fixtures/wrangler.atomic.jsonc',
        persist: { path: join(dir, 'd1') },
      });
      for (const statement of ddl) await proxy.env.DB.prepare(statement).run();
      (globalThis as any).__CF_ENV__ = proxy.env;
      process.env.DATABASE_PROVIDER = 'd1';
      disposeD1 = proxy.dispose;
    }
    service = await import('./service');
    database = (await import('@/core/db')).db();
    schema = await import('@/config/db/schema');
    await database
      .insert(schema.user)
      .values({ id: 'u1', name: 'Test', email: 'u1@example.test' });
    await database
      .insert(schema.user)
      .values({ id: 'u2', name: 'Other', email: 'u2@example.test' });
    await database.insert(schema.screenshotAsset).values({
      id: 'asset-1234',
      userId: 'u1',
      objectKey: 'private/a.png',
      mimeType: 'image/png',
      byteSize: 100,
      width: 1000,
      height: 650,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
  },
  process.env.ATOMIC_D1 === '1' ? 120_000 : 30_000
);

afterAll(async () => {
  await disposeD1?.();
}, 30_000);

const request = (key: string) => ({
  idempotencyKey: key,
  assetIds: ['asset-1234'],
  prompt: 'Show chart',
  duration: 5 as const,
  aspectRatio: '16:9' as const,
});
const signAsset = async () => 'https://example.test/signed-image.png';
async function purchase(
  id: string,
  status = 'paid',
  productId = 'screenshot_video_single'
) {
  await database.insert(schema.order).values({
    id,
    orderNo: id,
    userId: 'u1',
    status,
    amount: 990,
    paymentAmount: 990,
    currency: 'usd',
    productId,
    paymentProvider: 'stripe',
    checkoutInfo: '{}',
    paymentType: 'one-time',
  });
}

describe(`paid render reservations on ${process.env.ATOMIC_D1 === '1' ? 'local D1' : 'SQLite'} atomic batches`, () => {
  it('refuses trial balances, legacy products and unpaid orders', async () => {
    await purchase('unpaid', 'created');
    await purchase('legacy', 'paid', 'starter_monthly');
    await expect(
      service.reserveRender({
        userId: 'u1',
        request: request('first-request'),
        signAsset,
      })
    ).rejects.toMatchObject({ key: 'PAID_ACCESS_REQUIRED' });
  });
  it('reserves the final render exactly once under concurrent requests', async () => {
    await purchase('paid-1');
    const results = await Promise.allSettled(
      ['concurrent-1', 'concurrent-2'].map((key) =>
        service.reserveRender({
          userId: 'u1',
          request: request(key),
          signAsset,
        })
      )
    );
    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    expect(await service.getRenderBalance('u1')).toBe(0);
    const winner = results.find(
      (result) => result.status === 'fulfilled'
    ) as PromiseFulfilledResult<any>;
    const replay = await service.reserveRender({
      userId: 'u1',
      request: request(winner.value.requestKey),
      signAsset,
    });
    expect(replay.id).toBe(winner.value.id);
  });
  it('rejects a replay that changes its input', async () => {
    await purchase('paid-2');
    const task = await service.reserveRender({
      userId: 'u1',
      request: request('stable-key-2'),
      signAsset,
    });
    await expect(
      service.reserveRender({
        userId: 'u1',
        request: { ...request('stable-key-2'), prompt: 'Different' },
        signAsset,
      })
    ).rejects.toMatchObject({ key: 'IDEMPOTENCY_CONFLICT' });
    await service.settleRender(task.id, {
      id: 'vendor-id',
      status: 'failed',
      videoUrl: null,
    });
    expect(await service.getRenderBalance('u1')).toBe(1);
  });
  it('never returns another user’s task or changes a terminal success to failure', async () => {
    const task = await service.reserveRender({
      userId: 'u1',
      request: request('stable-key-3'),
      signAsset,
    });
    await expect(service.findRender('u2', task.id)).rejects.toMatchObject({
      key: 'NOT_FOUND',
    });
    await service.settleRender(task.id, {
      id: 'vendor-3',
      status: 'succeeded',
      videoUrl: 'https://example.test/video.mp4',
    });
    await service.settleRender(task.id, {
      id: 'vendor-3',
      status: 'failed',
      videoUrl: null,
    });
    expect((await service.findRender('u1', task.id)).status).toBe('success');
    expect(await service.getRenderBalance('u1')).toBe(0);
  });
  it('refuses automatic refunds after a render was reserved or used', async () => {
    const { refundOrder } = await import('@/modules/payment/service');
    await expect(
      refundOrder({ orderNo: 'paid-1', operatorId: 'admin-test' })
    ).rejects.toThrow('used or reserved');
  });
  it('settles a screenshot pack once with exact amount and currency, without gift credits', async () => {
    const { handleCheckoutSuccess } = await import('@/modules/payment/service');
    await purchase('checkout-pack', 'created');
    const session = {
      paymentStatus: 'paid',
      paymentResult: { id: 'checkout-pack' },
      paymentInfo: {
        paymentAmount: 990,
        paymentCurrency: 'usd',
        transactionId: 'txn-paid',
      },
    };
    await expect(
      handleCheckoutSuccess(
        {
          ...session,
          paymentInfo: { ...session.paymentInfo, paymentAmount: 1 },
        },
        'stripe'
      )
    ).rejects.toThrow('does not match');
    await expect(
      handleCheckoutSuccess(
        {
          ...session,
          paymentInfo: { ...session.paymentInfo, paymentCurrency: 'cny' },
        },
        'stripe'
      )
    ).rejects.toThrow('does not match');
    await Promise.all([
      handleCheckoutSuccess(session, 'stripe'),
      handleCheckoutSuccess(session, 'stripe'),
    ]);
    expect(await service.getRenderBalance('u1')).toBe(1);
    const grants = await database.select().from(schema.credit);
    expect(grants).toHaveLength(0);
  });
  it('caps submission recovery at three durable claims, including concurrent polls, without releasing uncertain credits', async () => {
    const { eq } = await import('drizzle-orm');
    await purchase('retry-cap-order');
    const task = await service.reserveRender({
      userId: 'u1',
      request: request('retry-cap-request'),
      signAsset,
    });
    const balance = await service.getRenderBalance('u1');
    for (let attempt = 1; attempt <= 3; attempt++) {
      const claims = await Promise.all([
        service.claimSubmission('u1', task.id),
        service.claimSubmission('u1', task.id),
      ]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      expect((await service.findRender('u1', task.id)).submissionAttempts).toBe(
        attempt
      );
      await database
        .update(schema.screenshotTask)
        .set({ leaseUntil: '1970-01-01T00:00:00.000Z' })
        .where(eq(schema.screenshotTask.id, task.id));
    }
    expect(await service.claimSubmission('u1', task.id)).toBeNull();
    expect(await service.claimSubmission('u1', task.id)).toBeNull();
    expect(await service.findRender('u1', task.id)).toMatchObject({
      status: 'reserved',
      submissionAttempts: 3,
      errorCode: 'SUBMISSION_LIMIT_REACHED',
    });
    expect(await service.getRenderBalance('u1')).toBe(balance);
    // A delayed known provider result can still settle the original task.
    await service.settleRender(task.id, {
      id: 'recovered-cap',
      status: 'failed',
      videoUrl: null,
    });
    expect(await service.getRenderBalance('u1')).toBe(balance + 1);
    expect(await service.claimSubmission('u1', task.id)).toBeNull();
  });
});
