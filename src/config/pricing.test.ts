import { describe, expect, it } from 'vitest';

import { PaymentInterval, PaymentType } from '@/core/payment/types';

import {
  formatCheckoutAmount,
  isPaymentProviderAvailableForProduct,
  listPricingProducts,
  resolveCheckoutPricing,
  resolveProviderCheckoutPricing,
  type PricingProduct,
} from './pricing';

const pack = listPricingProducts().find(
  (p) => p.type === PaymentType.ONE_TIME && p.currencies?.cny != null
)!;

// Synthetic: the catalog only sells one-time packs today.
const subscription: PricingProduct = {
  productId: 'test_monthly',
  productName: 'Test',
  planName: 'Test',
  description: 'Test plan',
  type: PaymentType.SUBSCRIPTION,
  priceInCents: 999,
  currency: 'usd',
  credits: 100,
  plan: { name: 'Test', interval: PaymentInterval.MONTH, intervalCount: 1 },
  currencies: { cny: 7199 },
};
const usdOnly: PricingProduct = { ...pack, currencies: undefined };

describe('resolveCheckoutPricing', () => {
  it('uses the requested currency only when the product lists it', () => {
    expect(resolveCheckoutPricing(pack, 'cny')).toEqual({
      amount: pack.currencies!.cny,
      currency: 'cny',
    });
    expect(resolveCheckoutPricing(pack, 'usd')).toEqual({
      amount: pack.priceInCents,
      currency: pack.currency,
    });
    expect(resolveCheckoutPricing(usdOnly, 'cny')).toEqual({
      amount: pack.priceInCents,
      currency: pack.currency,
    });
  });
});

describe('resolveProviderCheckoutPricing', () => {
  it('fixture pack exists', () => {
    expect(pack).toBeTruthy();
    expect(pack.currencies!.cny).toBeGreaterThan(0);
  });

  it.each(['alipay', 'wechat'])(
    '%s: one-time pack is always CNY',
    (provider) => {
      for (const requestedCurrency of ['usd', 'cny', undefined]) {
        expect(
          resolveProviderCheckoutPricing(pack, { provider, requestedCurrency })
        ).toEqual({ ok: true, amount: pack.currencies!.cny, currency: 'cny' });
      }
    }
  );

  it.each(['alipay', 'wechat'])(
    '%s: subscriptions and products without CNY are rejected',
    (provider) => {
      for (const product of [subscription, usdOnly]) {
        expect(
          resolveProviderCheckoutPricing(product, {
            provider,
            requestedCurrency: 'cny',
          })
        ).toEqual({ ok: false, reason: 'cny_price_unavailable' });
        expect(isPaymentProviderAvailableForProduct(product, provider)).toBe(
          false
        );
      }
    }
  );

  it('creem always charges the catalog base price (USD)', () => {
    expect(
      resolveProviderCheckoutPricing(pack, {
        provider: 'creem',
        requestedCurrency: 'cny',
      })
    ).toEqual({ ok: true, amount: pack.priceInCents, currency: pack.currency });
  });

  it.each(['waffo', 'stripe'])(
    '%s: follows the requested currency (CNY for zh)',
    (provider) => {
      expect(
        resolveProviderCheckoutPricing(pack, {
          provider,
          requestedCurrency: 'cny',
        })
      ).toEqual({ ok: true, amount: pack.currencies!.cny, currency: 'cny' });
      expect(
        resolveProviderCheckoutPricing(pack, {
          provider,
          requestedCurrency: 'usd',
        })
      ).toEqual({
        ok: true,
        amount: pack.priceInCents,
        currency: pack.currency,
      });
    }
  );

  it('every provider but alipay/wechat can charge a subscription', () => {
    for (const p of ['stripe', 'creem', 'waffo', 'paypal']) {
      expect(isPaymentProviderAvailableForProduct(subscription, p)).toBe(true);
    }
  });
});

describe('formatCheckoutAmount', () => {
  it('formats minor units', () => {
    expect(formatCheckoutAmount(7199, 'cny')).toBe('¥71.99');
    expect(formatCheckoutAmount(999, 'usd')).toBe('$9.99');
    expect(formatCheckoutAmount(1000, 'usd')).toBe('$10');
    expect(formatCheckoutAmount(500, 'eur')).toBe('5 EUR');
  });
});
