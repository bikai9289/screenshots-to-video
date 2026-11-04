import { createFileRoute } from '@tanstack/react-router';
import { checkPaymentOrder } from '@/server/payment-reconciliation';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

export async function POST({ request }: { request: Request }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return respErr('PAYMENT_CHECK_FORBIDDEN', { status: 403 });
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'payment-check-ip',
  });
  if (limited) return limited;
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });
  const userLimited = enforceMinIntervalRateLimit(request, {
    intervalMs: 5000,
    keyPrefix: 'payment-check-user',
    extraKey: session.user.id,
  });
  if (userLimited) return userLimited;
  const parsed = z
    .object({
      orderNo: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[A-Za-z0-9_-]+$/),
    })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return respErr('PAYMENT_CHECK_INVALID_INPUT', { status: 400 });
  try {
    const result = await checkPaymentOrder(
      parsed.data.orderNo,
      session.user.id
    );
    if (!result) return respErr('PAYMENT_ORDER_NOT_FOUND', { status: 404 });
    return respData(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return respErr('PAYMENT_STATUS_UNAVAILABLE', { status: 503 });
  }
}

export const Route = createFileRoute('/api/user/orders/check')({
  server: { handlers: { POST } },
});
