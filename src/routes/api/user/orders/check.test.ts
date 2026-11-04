import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './check';

const mocks = vi.hoisted(() => ({
  user: 'user1' as string | null,
  check: vi.fn(),
}));
vi.mock('@/core/auth', () => ({
  getAuth: () => ({
    api: {
      getSession: async () =>
        mocks.user ? { user: { id: mocks.user } } : null,
    },
  }),
}));
vi.mock('@/server/payment-reconciliation', () => ({
  checkPaymentOrder: mocks.check,
}));
vi.mock('@/lib/rate-limit', () => ({
  enforceMinIntervalRateLimit: () => null,
}));

beforeEach(() => {
  mocks.user = 'user1';
  mocks.check.mockReset();
});
function request(body: unknown, origin = 'https://example.test') {
  return {
    request: new Request('https://example.test/api/user/orders/check', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  };
}
describe('owned payment status check', () => {
  it('rejects anonymous requests before querying orders', async () => {
    mocks.user = null;
    expect((await POST(request({ orderNo: 'ORD-1' }))).status).toBe(401);
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it('rejects cross-origin writes', async () => {
    expect(
      (await POST(request({ orderNo: 'ORD-1' }, 'https://other.test'))).status
    ).toBe(403);
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it('rejects extra user IDs and malformed input', async () => {
    expect(
      (await POST(request({ orderNo: 'ORD-1', userId: 'other' }))).status
    ).toBe(400);
    expect((await POST(request({ orderNo: '' }))).status).toBe(400);
  });
  it('passes authenticated ownership and hides absent or foreign orders equally', async () => {
    mocks.check.mockResolvedValue(null);
    expect((await POST(request({ orderNo: 'ORD-1' }))).status).toBe(404);
    expect(mocks.check).toHaveBeenCalledWith('ORD-1', 'user1');
  });
  it('reports uncertainty without exposing provider errors or claiming failure', async () => {
    mocks.check.mockRejectedValue(new Error('private upstream diagnostic'));
    const response = await POST(request({ orderNo: 'ORD-1' }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private');
  });
});
