export const screenshotPacks = [
  {
    productId: 'screenshot_video_single',
    name: 'Single',
    priceInCents: 990,
    renders: 1,
  },
  {
    productId: 'screenshot_video_three',
    name: 'Launch',
    priceInCents: 1990,
    renders: 3,
  },
  {
    productId: 'screenshot_video_five',
    name: 'Studio',
    priceInCents: 2990,
    renders: 5,
  },
] as const;

export function getScreenshotPack(productId: string | null | undefined) {
  return screenshotPacks.find((pack) => pack.productId === productId);
}

export const screenshotLimits = {
  maxFiles: 4,
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  maxPromptLength: 2000,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
} as const;
