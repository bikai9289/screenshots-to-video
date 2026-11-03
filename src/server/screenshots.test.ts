import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { screenshotRequestSchema } from '@/lib/screenshots-contract';

import { limitedBody, validateScreenshot } from './screenshots';

describe('screenshot input boundaries', () => {
  const valid = {
    idempotencyKey: 'stable-key-123',
    assetIds: ['asset-12345'],
    prompt: 'Show chart',
    duration: 5,
    aspectRatio: '16:9',
  };
  it('rejects prices, external URLs, duplicate screenshots and mismatched parameter types', () => {
    for (const input of [
      { ...valid, price: 1 },
      { ...valid, imageUrl: 'https://evil.test/a.png' },
      { ...valid, assetIds: ['asset-12345', 'asset-12345'] },
      { ...valid, duration: '5' },
      { ...valid, duration: 16 },
      { ...valid, aspectRatio: '4:3' },
      { ...valid, assetIds: [] },
    ])
      expect(screenshotRequestSchema.safeParse(input).success).toBe(false);
    expect(screenshotRequestSchema.safeParse(valid).success).toBe(true);
  });
  it('accepts a real supported screenshot and rejects MIME spoofing', async () => {
    const bytes = readFileSync(
      'public/imgs/screenshots-to-video/orbit-dashboard.png'
    );
    expect(
      (
        await validateScreenshot(
          new File([bytes], 'screen.png', { type: 'image/png' })
        )
      ).width
    ).toBe(2000);
    await expect(
      validateScreenshot(
        new File([bytes], 'screen.jpg', { type: 'image/jpeg' })
      )
    ).rejects.toMatchObject({ key: 'INVALID_IMAGE' });
  });
  it('rejects SVG, empty files and corrupt image data before storage', async () => {
    for (const file of [
      new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }),
      new File([], 'a.png', { type: 'image/png' }),
      new File(['not a PNG'], 'a.png', { type: 'image/png' }),
    ])
      await expect(validateScreenshot(file)).rejects.toMatchObject({
        key: 'INVALID_IMAGE',
      });
  });
  it('enforces bounds even when Content-Length is omitted', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(6));
        controller.enqueue(new Uint8Array(6));
        controller.close();
      },
    });
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      body,
      duplex: 'half',
    } as RequestInit);
    await expect(limitedBody(request, 8)).rejects.toMatchObject({
      key: 'UPLOAD_LIMIT',
    });
  });
});
