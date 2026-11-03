import { describe, expect, it } from 'vitest';

import {
  isPaymentAmountPendingError,
  PaymentAmountPendingError,
} from './service';

describe('PaymentAmountPendingError', () => {
  it('isPaymentAmountPendingError matches instanceof and name', () => {
    const err = new PaymentAmountPendingError('ORDER-1');
    expect(isPaymentAmountPendingError(err)).toBe(true);
    expect(
      isPaymentAmountPendingError(
        Object.assign(new Error('payment amount pending for order ORDER-1'), {
          name: 'PaymentAmountPendingError',
        })
      )
    ).toBe(true);
    expect(isPaymentAmountPendingError(new Error('other'))).toBe(false);
  });
});

describe('requiresMappedProviderProduct', () => {
  it('only creem/waffo need a mapped provider product id', async () => {
    const { requiresMappedProviderProduct } = await import('./service');
    expect(requiresMappedProviderProduct('creem')).toBe(true);
    expect(requiresMappedProviderProduct('waffo')).toBe(true);
    for (const p of ['stripe', 'alipay', 'wechat', 'paypal', '', undefined]) {
      expect(requiresMappedProviderProduct(p)).toBe(false);
    }
  });
});
