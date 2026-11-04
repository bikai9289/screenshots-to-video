import { afterEach, describe, expect, it, vi } from 'vitest';

import plugin from './ai-storage-migration';

const jobs = vi.hoisted(() => ({
  maintain: vi.fn(),
  migrate: vi.fn(),
  expire: vi.fn(),
}));
vi.mock('nitro', () => ({ definePlugin: (plugin: unknown) => plugin }));
vi.mock('@/server/screenshots-maintenance', () => ({
  maintainScreenshots: jobs.maintain,
}));
vi.mock('@/modules/ai/storage-migration', () => ({
  syncDailyAITasksToR2: jobs.migrate,
}));
vi.mock('@/modules/ai-tasks/service', () => ({
  expireTimedOutTasks: jobs.expire,
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('Worker scheduled screenshot maintenance', () => {
  it('initializes bindings without HTTP and runs despite a legacy job failure', async () => {
    vi.stubGlobal('__CF_ENV__', undefined);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const env = { DB: { name: 'test-d1' } };
    jobs.maintain.mockImplementation(async (apply) => {
      expect(apply).toBe(true);
      expect((globalThis as any).__CF_ENV__).toBe(env);
      return { failed: 0, deleted: 0 };
    });
    jobs.migrate.mockRejectedValue(new Error('legacy unavailable'));
    jobs.expire.mockResolvedValue(0);
    let scheduled!: (event: unknown) => void;
    (plugin as any)({
      hooks: {
        hook: (name: string, callback: typeof scheduled) => {
          expect(name).toBe('cloudflare:scheduled');
          scheduled = callback;
        },
      },
    });
    const pending: Promise<unknown>[] = [];
    scheduled({
      env,
      context: {
        waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      },
    });
    await Promise.all(pending);
    expect(jobs.maintain).toHaveBeenCalledOnce();
    expect(console.info).toHaveBeenCalledWith(
      'Screenshot maintenance completed:',
      { failed: 0, deleted: 0 }
    );
  });
});
