import { Route } from '@/routes/api/config/public';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ configs: vi.fn() }));
vi.mock('@/modules/config/service', () => ({
  getAllConfigs: mocks.configs,
  filterPublicConfigs: (config: Record<string, string>, keys: string[]) =>
    Object.fromEntries(
      Object.entries(config).filter(([key]) => keys.includes(key))
    ),
}));
vi.mock('@/server/screenshots', () => ({ screenshotServiceReady: () => true }));

afterEach(() => {
  vi.unstubAllGlobals();
  mocks.configs.mockReset();
});
const request = () =>
  (Route.options.server!.handlers as any).GET({
    request: new Request('https://example.test/api/config/public', {
      headers: { Cookie: 'private-session=do-not-cache' },
    }),
  });
describe('public configuration edge caching', () => {
  it('caches only filtered public configuration for 60 seconds', async () => {
    let stored: Response | undefined;
    const put = vi.fn(async (_key: Request, response: Response) => {
      stored = response;
    });
    vi.stubGlobal('caches', {
      default: { match: async () => stored?.clone(), put },
    });
    mocks.configs.mockResolvedValue({
      app_name: 'Test',
      stripe_secret_key: 'test-only-private-value',
      stripe_enabled: 'true',
    });
    const first = await request();
    expect(first.headers.get('cache-control')).toContain('s-maxage=60');
    expect(first.headers.has('set-cookie')).toBe(false);
    expect(await first.text()).not.toContain('test-only-private-value');
    expect((await request()).status).toBe(200);
    expect(mocks.configs).toHaveBeenCalledTimes(1);
    expect(mocks.configs).toHaveBeenCalledWith({ throwOnError: true });
    expect(put).toHaveBeenCalledOnce();
  });
  it('does not turn a database error into a cached unavailable or available decision', async () => {
    const put = vi.fn();
    vi.stubGlobal('caches', { default: { match: async () => undefined, put } });
    mocks.configs.mockRejectedValue(new Error('private database diagnostic'));
    const response = await request();
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain('private database diagnostic');
    expect(put).not.toHaveBeenCalled();
  });
});
