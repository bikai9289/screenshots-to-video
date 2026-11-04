import { fetchWithTimeout } from './fetch';

export type SeeAPIStatus =
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'expired';
export type SeeAPIInput = {
  images: string[];
  prompt: string;
  duration: 5 | 10 | 15;
  aspectRatio: '16:9' | '9:16' | '1:1';
};
export interface SeeAPIResult {
  id: string;
  status: SeeAPIStatus;
  videoUrl: string | null;
}

export class SeeAPIError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'SeeAPIError';
  }
}

export function buildSeeAPIRequest(input: SeeAPIInput) {
  return {
    model: 'seedance-2-fast',
    endpoint: 'reference-to-video',
    provider: 'seeapi',
    input: {
      prompt: `Create a product demo using the supplied app screenshots in their given order. Use restrained camera moves and transitions. Preserve the original interface, layout and text as closely as possible; do not invent product features, figures or testimonials. ${input.prompt}`,
      reference_images: input.images,
      aspect_ratio: input.aspectRatio,
      duration_seconds: input.duration,
      resolution: '720p',
      generate_audio: false,
      nsfw_checker: true,
    },
  };
}

export class SeeAPIClient {
  constructor(private apiKey: string) {
    if (!apiKey.trim()) throw new SeeAPIError(503, 'SEEAPI_NOT_CONFIGURED');
  }

  private async request(
    path: string,
    init: RequestInit,
    expectedId?: string
  ): Promise<SeeAPIResult> {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `https://api.seeapi.com/v1/generations${path}`,
        {
          ...init,
          redirect: 'manual',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...init.headers,
          },
        },
        25_000
      );
    } catch {
      throw new SeeAPIError(0, 'SEEAPI_CONNECTION_UNCERTAIN');
    }
    if (!response.ok)
      throw new SeeAPIError(response.status, `SEEAPI_HTTP_${response.status}`);
    const body = await response.json().catch(() => null);
    const generation = body?.generation;
    if (
      !generation ||
      typeof generation.id !== 'string' ||
      !/^[\w-]{1,180}$/.test(generation.id) ||
      (expectedId && generation.id !== expectedId) ||
      ![
        'processing',
        'succeeded',
        'failed',
        'canceled',
        'refunded',
        'expired',
      ].includes(generation.status)
    )
      throw new SeeAPIError(502, 'SEEAPI_INVALID_RESPONSE');
    let videoUrl: string | null = null;
    if (generation.status === 'succeeded') {
      const assets = generation.result?.assets;
      if (!Array.isArray(assets))
        throw new SeeAPIError(502, 'SEEAPI_INVALID_RESPONSE');
      const video = assets.find(
        (asset) => asset?.type === 'video' && typeof asset.url === 'string'
      );
      try {
        const parsed = new URL(video?.url);
        if (
          parsed.protocol !== 'https:' ||
          parsed.username ||
          parsed.password ||
          parsed.hostname === 'localhost' ||
          parsed.hostname.includes(':') ||
          /^\d+(\.\d+){3}$/.test(parsed.hostname)
        )
          throw new Error();
        videoUrl = parsed.href;
      } catch {
        throw new SeeAPIError(502, 'SEEAPI_INVALID_RESPONSE');
      }
    }
    return { id: generation.id, status: generation.status, videoUrl };
  }

  create(idempotencyKey: string, input: SeeAPIInput) {
    if (!/^[\w-]{1,180}$/.test(idempotencyKey))
      throw new SeeAPIError(400, 'SEEAPI_INVALID_KEY');
    return this.request('', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(buildSeeAPIRequest(input)),
    });
  }

  query(id: string) {
    if (!/^[\w-]{1,180}$/.test(id))
      throw new SeeAPIError(400, 'SEEAPI_INVALID_ID');
    return this.request(`/${encodeURIComponent(id)}`, { method: 'GET' }, id);
  }
}
