import { expect, it, vi } from 'vitest';

import { Route } from '../../routes/api/auth/$';

const mocks = vi.hoisted(() => ({
  configs: {
    google_client_id: 'test-client',
    google_client_secret: 'test-secret',
  },
  getAllConfigs: vi.fn(),
  getAuth: vi.fn(),
  handler: vi.fn(),
}));

vi.mock('@/modules/config/service', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));
vi.mock('@/core/auth', () => ({ getAuth: mocks.getAuth }));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
}));

it('passes merged environment and database settings to auth for GET and POST', async () => {
  mocks.getAllConfigs.mockResolvedValue(mocks.configs);
  mocks.getAuth.mockReturnValue({ handler: mocks.handler });
  mocks.handler.mockImplementation(() => new Response('ok'));
  for (const method of ['GET', 'POST'] as const) {
    const request = new Request('https://example.com/api/auth/sign-in/social', {
      method,
    });
    const route = Route as unknown as {
      server: {
        handlers: Record<
          string,
          (ctx: { request: Request }) => Promise<Response>
        >;
      };
    };
    const response = await route.server.handlers[method]({ request });
    expect(mocks.getAuth).toHaveBeenLastCalledWith(mocks.configs);
    expect(mocks.handler).toHaveBeenLastCalledWith(request);
    expect(await response.text()).toBe('ok');
  }
});
