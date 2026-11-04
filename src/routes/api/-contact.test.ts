import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Route } from './contact';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  rate: vi.fn(),
  durable: vi.fn(),
}));
vi.mock('@/modules/config/service', () => ({
  getAllConfigs: async () => ({}),
}));
vi.mock('@/modules/contact/service', () => ({
  submitContact: mocks.save,
  ContactConflictError: class extends Error {},
}));
vi.mock('@/lib/rate-limit', () => ({
  enforceMinIntervalRateLimit: mocks.rate,
  consumeProviderSlidingWindowRateLimit: mocks.durable,
}));

const post = (Route.options as any).server.handlers.POST;
const input = {
  requestId: '7e6e923f-bc65-41db-8ab7-2f52ad82490c',
  name: 'Visitor',
  email: 'visitor@example.test',
  subject: 'A question',
  message: 'I have a question about product videos.',
  website: '',
};
const request = (body: unknown = input, origin = 'https://site.example') =>
  new Request('https://site.example/api/contact', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rate.mockReturnValue(null);
  mocks.durable.mockResolvedValue({ allowed: true });
  mocks.save.mockResolvedValue({ reference: 'contact-reference' });
});

describe('public contact endpoint', () => {
  it('accepts anonymous valid enquiries without returning private data', async () => {
    const response = await post({ request: request() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: { reference: 'contact-reference' },
    });
  });
  it('rejects cross-site requests before saving or sending', async () => {
    expect(
      (await post({ request: request(input, 'https://attacker.example') }))
        .status
    ).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects bad input and excessive bodies', async () => {
    expect(
      (await post({ request: request({ ...input, email: 'bad' }) })).status
    ).toBe(400);
    expect(
      (
        await post({
          request: request({ ...input, message: 'a'.repeat(26000) }),
        })
      ).status
    ).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('enforces both IP limits before notifying', async () => {
    mocks.rate.mockReturnValue(new Response(null, { status: 429 }));
    expect((await post({ request: request() })).status).toBe(429);
    mocks.rate.mockReturnValue(null);
    mocks.durable.mockResolvedValue({ allowed: false });
    expect((await post({ request: request() })).status).toBe(429);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
