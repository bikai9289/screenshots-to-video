import { describe, expect, it, vi } from 'vitest';

import plugin from './payment-reconciliation';

const job = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ checked: 1, unavailable: 0 })
);
vi.mock('nitro', () => ({ definePlugin: (fn: unknown) => fn }));
vi.mock('@/server/payment-reconciliation', () => ({ reconcilePayments: job }));

describe('payment cron routing', () => {
  it('only runs on the five-minute trigger and initializes bindings', async () => {
    let scheduled: any;
    (plugin as any)({
      hooks: { hook: (_: string, fn: any) => (scheduled = fn) },
    });
    const promises: Promise<unknown>[] = [];
    const env = { DB: {} };
    const context = { waitUntil: (p: Promise<unknown>) => promises.push(p) };
    scheduled({ controller: { cron: '0 16 * * *' }, env, context });
    expect(job).not.toHaveBeenCalled();
    scheduled({ controller: { cron: '*/5 * * * *' }, env, context });
    await Promise.all(promises);
    expect(job).toHaveBeenCalledOnce();
    expect((globalThis as any).__CF_ENV__).toBe(env);
  });
});
