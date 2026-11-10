export const screenshotPacks = [
  {
    productId: 'screenshot_credits_1_v1',
    name: 'Entry',
    priceInCents: 390,
    credits: 1,
    legacy: false,
  },
  {
    productId: 'screenshot_credits_3_v1',
    name: 'Single',
    priceInCents: 990,
    credits: 3,
    legacy: false,
  },
  {
    productId: 'screenshot_credits_6_v1',
    name: 'Launch',
    priceInCents: 1990,
    credits: 6,
    legacy: false,
  },
  {
    productId: 'screenshot_credits_10_v1',
    name: 'Studio',
    priceInCents: 2990,
    credits: 10,
    legacy: false,
  },
] as const;

// Keep historical product IDs immutable: each render still buys any supported duration.
export const legacyScreenshotPacks = [
  {
    productId: 'screenshot_video_single',
    name: 'Single',
    priceInCents: 990,
    renders: 1,
    legacy: true,
  },
  {
    productId: 'screenshot_video_three',
    name: 'Launch',
    priceInCents: 1990,
    renders: 3,
    legacy: true,
  },
  {
    productId: 'screenshot_video_five',
    name: 'Studio',
    priceInCents: 2990,
    renders: 5,
    legacy: true,
  },
] as const;

export function getScreenshotPack(productId: string | null | undefined) {
  return [...screenshotPacks, ...legacyScreenshotPacks].find(
    (pack) => pack.productId === productId
  );
}

export const screenshotCreditCost = { 5: 1, 10: 2, 15: 3 } as const;

// Includes the initial submission. Status queries do not consume attempts.
export const MAX_SCREENSHOT_SUBMISSION_ATTEMPTS = 3;

export const screenshotLimits = {
  maxFiles: 4,
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  maxPromptLength: 2000,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
} as const;
