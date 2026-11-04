import { createFileRoute } from '@tanstack/react-router';
import { limitedBody } from '@/server/screenshots';

import { getAllConfigs } from '@/modules/config/service';
import { ContactConflictError, submitContact } from '@/modules/contact/service';
import { contactSchema } from '@/lib/contact-contract';
import { md5 } from '@/lib/hash';
import {
  consumeProviderSlidingWindowRateLimit,
  enforceMinIntervalRateLimit,
} from '@/lib/rate-limit';
import { respData, respJson } from '@/lib/resp';
import { StudioError } from '@/lib/screenshots-contract';

async function POST({ request }: { request: Request }) {
  const fail = (code: number, message: string, status: number) =>
    respJson(code, message, null, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return fail(4701, 'This form must be submitted from this website.', 403);
  if (
    enforceMinIntervalRateLimit(request, {
      intervalMs: 30_000,
      keyPrefix: 'public-contact',
    })
  )
    return fail(4703, 'Please wait before sending another message.', 429);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return fail(4702, 'Invalid message format.', 400);
  try {
    const raw = new TextDecoder().decode(await limitedBody(request, 24_576));
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return fail(4702, 'Invalid message format.', 400);
    }
    const parsed = contactSchema.safeParse(json);
    if (!parsed.success)
      return fail(4702, 'Check your name, email, subject and message.', 400);
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const limiter = await consumeProviderSlidingWindowRateLimit({
      key: `contact:${md5(ip)}`,
      limit: 5,
      windowMs: 3_600_000,
    });
    if (!limiter.allowed)
      return fail(4703, 'Message limit reached. Please try again later.', 429);
    return respData(await submitContact(parsed.data, await getAllConfigs()), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof ContactConflictError)
      return fail(
        4704,
        'This request was already used for a different message.',
        409
      );
    if (error instanceof StudioError && error.key === 'UPLOAD_LIMIT')
      return fail(4702, 'Message is too large.', 413);
    return fail(
      4705,
      'We could not save your message. Please try again or email support.',
      503
    );
  }
}

export const Route = createFileRoute('/api/contact')({
  server: { handlers: { POST } },
});
