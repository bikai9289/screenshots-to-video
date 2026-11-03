import { imageSize } from 'image-size';

import { SeeAPIClient, SeeAPIError, type SeeAPIInput } from '@/core/ai/seeapi';
import { getAuth } from '@/core/auth';
import {
  ScreenshotStorage,
  screenshotStorageReady,
} from '@/core/storage/screenshots';
import { screenshotLimits } from '@/config/screenshots-product';
import { getAllConfigs } from '@/modules/config/service';
import {
  claimSubmission,
  findRender,
  publicRender,
  recordRenderIssue,
  settleRender,
} from '@/modules/screenshots/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respJson } from '@/lib/resp';
import { StudioError, studioErrors } from '@/lib/screenshots-contract';

export function studioFailure(error: unknown) {
  const key = error instanceof StudioError ? error.key : 'INTERNAL_ERROR';
  const definition = studioErrors[key];
  return respJson(
    definition.code,
    definition.message,
    { errorKey: key },
    {
      status: definition.status,
      headers: {
        'Cache-Control': 'no-store',
        ...(key === 'RATE_LIMIT' ? { 'Retry-After': '2' } : {}),
      },
    }
  );
}

export async function studioSession(request: Request, intervalMs = 1000) {
  const resource = new URL(request.url).pathname.split('/')[3] || 'root';
  if (
    enforceMinIntervalRateLimit(request, {
      intervalMs,
      keyPrefix: `screenshots-ip:${resource}`,
    })
  )
    throw new StudioError('RATE_LIMIT');
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) throw new StudioError('UNAUTHORIZED');
  if (
    enforceMinIntervalRateLimit(request, {
      intervalMs,
      keyPrefix: `screenshots-user:${resource}`,
      extraKey: session.user.id,
    })
  )
    throw new StudioError('RATE_LIMIT');
  return session;
}

export function screenshotServiceReady(config: Record<string, string>) {
  return !!config.seeapi_api_key?.trim() && screenshotStorageReady(config);
}

export async function studioConfig() {
  const config = await getAllConfigs();
  if (!screenshotServiceReady(config))
    throw new StudioError('SERVICE_UNAVAILABLE');
  return {
    config,
    storage: new ScreenshotStorage(config),
    provider: new SeeAPIClient(config.seeapi_api_key),
  };
}

export async function limitedBody(request: Request, maximum: number) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maximum) throw new StudioError('UPLOAD_LIMIT');
  const reader = request.body?.getReader();
  if (!reader) throw new StudioError('INVALID_REQUEST');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximum) {
      await reader.cancel();
      throw new StudioError('UPLOAD_LIMIT');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function validateScreenshot(file: File) {
  if (
    !file.size ||
    !screenshotLimits.allowedMimeTypes.includes(file.type as never)
  )
    throw new StudioError('INVALID_IMAGE');
  if (file.size > screenshotLimits.maxFileBytes)
    throw new StudioError('UPLOAD_LIMIT');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let dimensions: ReturnType<typeof imageSize>;
  try {
    dimensions = imageSize(bytes);
  } catch {
    throw new StudioError('INVALID_IMAGE');
  }
  const actual = (
    { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' } as Record<
      string,
      string
    >
  )[dimensions.type ?? ''];
  if (actual !== file.type) throw new StudioError('INVALID_IMAGE');
  const { width, height } = dimensions;
  if (
    width <= 300 ||
    height <= 300 ||
    width >= 6000 ||
    height >= 6000 ||
    width / height <= 0.4 ||
    width / height >= 2.5
  )
    throw new StudioError('IMAGE_DIMENSIONS');
  return { bytes, width, height, mimeType: actual, byteSize: bytes.length };
}

export async function refreshScreenshotTask(userId: string, id: string) {
  let task = await findRender(userId, id);
  if (task.status === 'success' || task.status === 'failed')
    return publicRender(task);
  const { provider } = await studioConfig();
  try {
    if (task.status === 'reserved') {
      const claimed = await claimSubmission(userId, id);
      if (claimed) {
        const result = await provider.create(
          id,
          JSON.parse(claimed.input) as SeeAPIInput
        );
        await settleRender(id, result);
      }
    } else if (task.providerTaskId) {
      await settleRender(id, await provider.query(task.providerTaskId));
    }
  } catch (error) {
    // A lost create response or a failed status lookup is not evidence of terminal failure.
    const rejected =
      task.status === 'reserved' &&
      error instanceof SeeAPIError &&
      [400, 401, 402, 403, 404, 422].includes(error.status);
    await recordRenderIssue(
      id,
      rejected ? 'SERVICE_UNAVAILABLE' : 'PROVIDER_RETRY',
      rejected
    );
  }
  task = await findRender(userId, id);
  return publicRender(task);
}
