import { describe, expect, it } from 'vitest';

import { getPricingProduct } from './pricing';
import { getScreenshotPack, screenshotPacks } from './screenshots-product';

describe('paid screenshot video packs', () => {
  it('matches the approved amounts and credit balances', () => {
    expect(
      screenshotPacks.map((pack) => [pack.priceInCents, pack.credits])
    ).toEqual([
      [390, 1],
      [990, 3],
      [1990, 6],
      [2990, 10],
    ]);
  });
  it('does not grant generic AI credits or accept legacy products', () => {
    for (const pack of screenshotPacks) {
      const product = getPricingProduct(pack.productId);
      expect(product?.priceInCents).toBe(pack.priceInCents);
      expect(product?.currency).toBe('usd');
      expect(product?.credits).toBe(0);
    }
    expect(getScreenshotPack('nanobanana_joyflix_starter')).toBeUndefined();
    expect(getScreenshotPack('starter_monthly')).toBeUndefined();
  });
});
