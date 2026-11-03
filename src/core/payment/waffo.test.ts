import { describe, expect, it } from 'vitest';

import { PaymentStatus, PaymentType } from './types';
import { WaffoProvider } from './waffo';

function buildProviderWithPayments(payments: Array<Record<string, unknown>>) {
  const provider = Object.create(WaffoProvider.prototype) as WaffoProvider;
  (provider as unknown as { client: { graphql: { query: unknown } } }).client =
    {
      graphql: {
        async query() {
          return { data: { payments } };
        },
      },
    };
  return provider;
}

describe('WaffoProvider.getPaymentSession amount completeness', () => {
  it('keeps PROCESSING when succeeded without amount details', async () => {
    const provider = buildProviderWithPayments([
      {
        id: 'pay-1',
        status: 'succeeded',
        orderId: 'ord-1',
        orderMerchantExternalId: 'ORDER-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const session = await provider.getPaymentSession({ sessionId: 'ORDER-1' });
    expect(session.paymentStatus).toBe(PaymentStatus.PROCESSING);
    expect(session.paymentInfo?.paymentAmount).toBeUndefined();
    expect(session.paymentInfo?.paymentCurrency).toBe('');
  });

  it('keeps PROCESSING when total is empty or currency is missing', async () => {
    for (const snapshotAmountDetails of [
      { currency: 'USD', total: '' },
      { currency: 'USD' },
      { total: '5.99' },
      { currency: '', total: '0' },
    ]) {
      const provider = buildProviderWithPayments([
        {
          id: 'pay-3',
          status: 'succeeded',
          orderId: 'ord-3',
          orderMerchantExternalId: 'ORDER-3',
          createdAt: '2026-01-01T00:00:00.000Z',
          snapshotAmountDetails,
        },
      ]);
      const session = await provider.getPaymentSession({
        sessionId: 'ORDER-3',
      });
      expect(session.paymentStatus).toBe(PaymentStatus.PROCESSING);
      expect(session.paymentInfo?.paymentAmount).toBeUndefined();
    }
  });

  it('returns SUCCESS with a genuine reported 0 (100% discount)', async () => {
    for (const total of ['0', '0.00']) {
      const provider = buildProviderWithPayments([
        {
          id: 'pay-4',
          status: 'succeeded',
          orderId: 'ord-4',
          orderMerchantExternalId: 'ORDER-4',
          createdAt: '2026-01-01T00:00:00.000Z',
          snapshotAmountDetails: { currency: 'USD', total },
        },
      ]);
      const session = await provider.getPaymentSession({
        sessionId: 'ORDER-4',
      });
      expect(session.paymentStatus).toBe(PaymentStatus.SUCCESS);
      expect(session.paymentInfo?.paymentAmount).toBe(0);
      expect(session.paymentInfo?.paymentCurrency).toBe('USD');
    }
  });

  it('returns SUCCESS when succeeded with amount details', async () => {
    const provider = buildProviderWithPayments([
      {
        id: 'pay-2',
        status: 'succeeded',
        orderId: 'ord-2',
        orderMerchantExternalId: 'ORDER-2',
        createdAt: '2026-01-01T00:00:00.000Z',
        snapshotAmountDetails: {
          currency: 'USD',
          total: '5.99',
        },
      },
    ]);

    const session = await provider.getPaymentSession({ sessionId: 'ORDER-2' });
    expect(session.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(session.paymentInfo?.paymentAmount).toBe(599);
    expect(session.paymentInfo?.paymentCurrency).toBe('USD');
  });
});

describe('WaffoProvider webhook paymentInfo amounts', () => {
  const provider = Object.create(WaffoProvider.prototype) as WaffoProvider;
  const info = (data: Record<string, unknown>) =>
    (provider as any).paymentInfo(
      {
        orderId: 'ord-1',
        buyerEmail: 'a@b.c',
        productName: 'Pack',
        paymentId: 'pay-1',
        ...data,
      },
      'evt-1'
    );

  it('maps missing total/amount to undefined', () => {
    expect(info({ currency: 'USD' }).paymentAmount).toBeUndefined();
    expect(
      info({ currency: 'USD', total: '', amount: '' }).paymentAmount
    ).toBeUndefined();
  });

  it('maps missing currency to undefined', () => {
    expect(info({ total: '5.99' }).paymentAmount).toBeUndefined();
  });

  it('prefers total, falls back to amount, keeps a real 0', () => {
    expect(
      info({ currency: 'USD', total: '6.59', amount: '5.99' }).paymentAmount
    ).toBe(659);
    expect(info({ currency: 'USD', amount: '5.99' }).paymentAmount).toBe(599);
    expect(info({ currency: 'USD', total: '0' }).paymentAmount).toBe(0);
    expect(info({ currency: 'JPY', total: '1000' }).paymentAmount).toBe(1000);
  });
});

describe('WaffoProvider.createPayment price snapshot', () => {
  function providerCapturingCheckout() {
    const calls: Array<Record<string, any>> = [];
    const provider = Object.create(WaffoProvider.prototype) as WaffoProvider;
    (provider as any).client = {
      checkout: {
        authenticated: {
          async create(params: Record<string, any>) {
            calls.push(params);
            return { sessionId: 'sess-1', checkoutUrl: 'https://waffo/x' };
          },
        },
      },
    };
    return { provider, calls };
  }

  const baseOrder = {
    orderNo: 'ORD-1',
    productId: 'PROD_1',
    customer: { id: 'u1', email: 'a@b.c' },
    successUrl: 'https://app/cb',
  };

  it('one-time CNY: passes currency + exact amount snapshot', async () => {
    const { provider, calls } = providerCapturingCheckout();
    await provider.createPayment({
      order: {
        ...baseOrder,
        type: PaymentType.ONE_TIME,
        locale: 'zh',
        price: { amount: 7199, currency: 'cny' },
      } as any,
    });
    expect(calls[0]).toMatchObject({
      productId: 'PROD_1',
      currency: 'CNY',
      priceSnapshot: { amount: '71.99', taxCategory: 'digital_goods' },
      language: 'zh-Hans',
    });
  });

  it('subscription: no snapshot (keeps Waffo recurring price)', async () => {
    const { provider, calls } = providerCapturingCheckout();
    await provider.createPayment({
      order: {
        ...baseOrder,
        type: PaymentType.SUBSCRIPTION,
        price: { amount: 999, currency: 'usd' },
      } as any,
    });
    expect(calls[0].currency).toBe('USD');
    expect(calls[0].priceSnapshot).toBeUndefined();
  });
});
