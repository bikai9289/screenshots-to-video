import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'stv-credits-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${join(dir, 'test.db')}`,
  AUTH_SECRET: 'test-only-video-credits',
  NODE_ENV: 'test',
});
let service: typeof import('../src/modules/screenshots/service');
let database: ReturnType<(typeof import('../src/core/db'))['db']>;
let schema: typeof import('../src/config/db/schema');
let dispose: (() => Promise<void>) | undefined;
beforeAll(async () => {
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
    dispose = proxy.dispose;
  }
  service = await import('../src/modules/screenshots/service');
  database = (await import('../src/core/db')).db();
  schema = await import('../src/config/db/schema');
}, 120_000);
afterAll(async () => {
  await dispose?.();
}, 30_000);

async function account(id: string, productIds = ['screenshot_credits_3_v1']) {
  await database
    .insert(schema.user)
    .values({ id, name: id, email: `${id}@example.test` });
  await database.insert(schema.screenshotAsset).values({
    id: `asset-${id}`,
    userId: id,
    objectKey: `private/${id}`,
    mimeType: 'image/png',
    byteSize: 100,
    width: 1000,
    height: 650,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const { getScreenshotPack } =
    await import('../src/config/screenshots-product');
  for (let index = 0; index < productIds.length; index++) {
    const productId = productIds[index],
      pack = getScreenshotPack(productId)!;
    await database.insert(schema.order).values({
      id: `order-${id}-${index}`,
      orderNo: `order-${id}-${index}`,
      userId: id,
      status: 'paid',
      amount: pack.priceInCents,
      paymentAmount: pack.priceInCents,
      currency: 'usd',
      productId,
      paymentProvider: 'stripe',
      checkoutInfo: '{}',
      paymentType: 'one-time',
    });
  }
}
const create = (userId: string, key: string, duration: 5 | 10 | 15) =>
  service.reserveRender({
    userId,
    request: {
      idempotencyKey: key,
      assetIds: [`asset-${userId}`],
      prompt: 'Show the chart',
      duration,
      aspectRatio: '16:9',
    },
    signAsset: async () => 'https://example.test/input.png',
  });
describe('duration-based paid video credits', () => {
  it('rejects 10/15 seconds with one credit, then consumes the 5-second balance', async () => {
    await account('entry', ['screenshot_credits_1_v1']);
    for (const seconds of [10, 15] as const)
      await expect(
        create('entry', `entry-${seconds}-request`, seconds)
      ).rejects.toMatchObject({ key: 'INSUFFICIENT_CREDITS' });
    await create('entry', 'entry-five-request', 5);
    expect(await service.getVideoBalance('entry')).toEqual({
      remainingCredits: 0,
      legacyRenders: 0,
    });
  });
  it('reserves the last three credits once under concurrent 15-second requests and replays once', async () => {
    await account('race');
    const results = await Promise.allSettled([
      create('race', 'concurrent-one', 15),
      create('race', 'concurrent-two', 15),
    ]);
    const winners = results.filter(
      (r) => r.status === 'fulfilled'
    ) as PromiseFulfilledResult<any>[];
    expect(winners).toHaveLength(1);
    await create('race', winners[0].value.requestKey, 15);
    expect(await service.getVideoBalance('race')).toEqual({
      remainingCredits: 0,
      legacyRenders: 0,
    });
    const { eq } = await import('drizzle-orm');
    expect(
      await database
        .select()
        .from(schema.screenshotCreditAllocation)
        .where(
          eq(schema.screenshotCreditAllocation.taskId, winners[0].value.id)
        )
    ).toHaveLength(1);
  });
  it('allows three distinct 5-second videos from three credits', async () => {
    await account('short');
    for (let i = 0; i < 3; i++) await create('short', `short-video-${i}`, 5);
    await expect(create('short', 'short-video-four', 5)).rejects.toMatchObject({
      key: 'INSUFFICIENT_CREDITS',
    });
  });
  it('combines purchased balances, blocks refunds of every contributing order and returns the exact reservation once', async () => {
    await account('split', [
      'screenshot_credits_1_v1',
      'screenshot_credits_1_v1',
      'screenshot_credits_1_v1',
    ]);
    const task = await create('split', 'split-long-video', 15);
    const { refundOrder } = await import('../src/modules/payment/service');
    for (let i = 0; i < 3; i++)
      await expect(
        refundOrder({ orderNo: `order-split-${i}`, operatorId: 'admin-test' })
      ).rejects.toThrow('used or reserved');
    await service.recordRenderIssue(task.id, 'PROVIDER_RETRY');
    expect((await service.getVideoBalance('split')).remainingCredits).toBe(0);
    for (let i = 0; i < 2; i++)
      await service.settleRender(task.id, {
        id: 'provider-split',
        status: 'failed',
        videoUrl: null,
      });
    expect((await service.getVideoBalance('split')).remainingCredits).toBe(3);
    expect(await service.claimSubmission('split', task.id)).toBeNull();
  });
  it('keeps old single-pack rights for 15 seconds, without converting them into credits', async () => {
    await account('old', ['screenshot_video_single']);
    expect(await service.getVideoBalance('old')).toEqual({
      remainingCredits: 0,
      legacyRenders: 1,
    });
    const task = await create('old', 'legacy-fifteen', 15);
    expect(await service.getVideoBalance('old')).toEqual({
      remainingCredits: 0,
      legacyRenders: 0,
    });
    await service.settleRender(task.id, {
      id: 'provider-old',
      status: 'failed',
      videoUrl: null,
    });
    expect(await service.getVideoBalance('old')).toEqual({
      remainingCredits: 0,
      legacyRenders: 1,
    });
  });
  it('does not let one user consume another user’s paid credits', async () => {
    await account('no-money', []);
    await expect(
      create('no-money', 'cross-user-request', 15)
    ).rejects.toMatchObject({ key: 'PAID_ACCESS_REQUIRED' });
  });
  it.each([
    [390, 'screenshot_credits_1_v1', 1],
    [990, 'screenshot_credits_3_v1', 3],
    [1990, 'screenshot_credits_6_v1', 6],
    [2990, 'screenshot_credits_10_v1', 10],
  ] as const)(
    'duplicate settlements for %i cents grant only catalog rights',
    async (amount, productId, credits) => {
      const userId = `webhook-${amount}`;
      await account(userId, [productId]);
      const { eq } = await import('drizzle-orm');
      await database
        .update(schema.order)
        .set({ status: 'created' })
        .where(eq(schema.order.id, `order-${userId}-0`));
      const { handleCheckoutSuccess } =
        await import('../src/modules/payment/service');
      const session: any = {
        paymentStatus: 'paid',
        paymentResult: {
          id: `order-${userId}-0`,
          metadata: { credits: '99999' },
        },
        paymentInfo: {
          paymentAmount: amount,
          paymentCurrency: 'usd',
          transactionId: `new-credit-transaction-${amount}`,
        },
      };
      await Promise.all([
        handleCheckoutSuccess(session, 'stripe'),
        handleCheckoutSuccess(session, 'stripe'),
      ]);
      expect(await service.getVideoBalance(userId)).toEqual({
        remainingCredits: credits,
        legacyRenders: 0,
      });
      expect(await database.select().from(schema.credit)).toHaveLength(0);
    }
  );
});
