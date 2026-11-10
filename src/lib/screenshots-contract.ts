import { z } from 'zod';

import { screenshotLimits } from '@/config/screenshots-product';

export const screenshotRequestSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
    assetIds: z
      .array(z.string().regex(/^[\w-]{8,128}$/))
      .min(1)
      .max(screenshotLimits.maxFiles)
      .refine((ids) => new Set(ids).size === ids.length),
    prompt: z.string().trim().max(screenshotLimits.maxPromptLength).default(''),
    duration: z.union([z.literal(5), z.literal(10), z.literal(15)]),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']),
  })
  .strict();
export type ScreenshotRequest = z.infer<typeof screenshotRequestSchema>;

export const studioErrors = {
  UNAUTHORIZED: { code: 4101, status: 401, message: 'Sign in to continue.' },
  INVALID_REQUEST: {
    code: 4102,
    status: 400,
    message: 'Check your video settings.',
  },
  PAID_ACCESS_REQUIRED: {
    code: 4103,
    status: 402,
    message: 'Purchase video credits to continue.',
  },
  NOT_FOUND: {
    code: 4104,
    status: 404,
    message: 'This video or screenshot is not available.',
  },
  ASSET_EXPIRED: {
    code: 4105,
    status: 410,
    message: 'This screenshot has expired. Upload it again.',
  },
  IDEMPOTENCY_CONFLICT: {
    code: 4106,
    status: 409,
    message: 'Use a new request key after changing settings.',
  },
  UPLOAD_LIMIT: {
    code: 4107,
    status: 413,
    message: 'The upload exceeds the file or size limits.',
  },
  INVALID_IMAGE: {
    code: 4108,
    status: 415,
    message: 'Upload a valid PNG, JPEG or WebP screenshot.',
  },
  IMAGE_DIMENSIONS: {
    code: 4109,
    status: 422,
    message:
      'Images must be 301–5999 pixels on each side, with a width-to-height ratio between 0.4 and 2.5.',
  },
  RATE_LIMIT: {
    code: 4110,
    status: 429,
    message: 'Please wait before trying again.',
  },
  SERVICE_UNAVAILABLE: {
    code: 4111,
    status: 503,
    message: 'Video creation is temporarily unavailable.',
  },
  GENERATION_FAILED: {
    code: 4112,
    status: 422,
    message:
      'Generation failed. Your reserved credits or legacy render have been returned.',
  },
  PROVIDER_RETRY: {
    code: 4113,
    status: 503,
    message:
      'Still confirming the task. Check this task again; do not create a duplicate.',
  },
  INTERNAL_ERROR: {
    code: 4114,
    status: 500,
    message: 'We could not complete the request. Please try again.',
  },
  INSUFFICIENT_CREDITS: {
    code: 4115,
    status: 402,
    message:
      'Not enough credits for this duration. Choose a shorter video or buy credits.',
  },
  SUBMISSION_LIMIT_REACHED: {
    code: 4116,
    status: 503,
    message:
      'Automatic submission stopped after 3 attempts. Contact support with this task ID. Credits remain reserved until the outcome is confirmed.',
  },
} as const;
export type StudioErrorKey = keyof typeof studioErrors;
export class StudioError extends Error {
  constructor(public key: StudioErrorKey) {
    super(studioErrors[key].message);
    this.name = 'StudioError';
  }
}

export interface PublicScreenshotTask {
  id: string;
  status: 'reserved' | 'processing' | 'success' | 'failed';
  duration: number;
  aspectRatio: string;
  createdAt: string;
  errorCode: StudioErrorKey | null;
  videoUrl: string | null;
}
