import { describe, expect, it } from 'vitest';

import { CreemProvider } from './creem';
import {
  fromPayPalAmountValue,
  PayPalProvider,
  toPayPalAmountValue,
} from './paypal';
import { stripeCheckoutSessionAmounts, StripeProvider } from './stripe';
import { PaymentStatus } from './types';

// Bare instances: the mapping paths under test make no API calls when there
// is no subscription / discount to resolve.
function bare<T extends object>(ctor: { prototype: T }): T {
  return Object.create(ctor.prototype) as T;
}

function stripeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_1',
    object: 'checkout.session',
    status: 'complete',
    payment_status: 'paid',
    mode: 'payment',
    currency: 'usd',
    amount_subtotal: 999,
    amount_total: 999,
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
    currency_conversion: null,
    discounts: [],
    metadata: { order_no: 'ORD-1' },
    created: 1767225600,
    ...overrides,
  } as any;
}

describe('stripeCheckoutSessionAmounts', () => {
  it('reports session amounts when there is no currency conversion', () => {
    expect(stripeCheckoutSessionAmounts(stripeSession())).toEqual({
      paymentAmount: 999,
      paymentCurrency: 'usd',
      subtotalAmount: 999,
      discountAmount: 0,
      discountCurrency: 'usd',
    });
  });

  it('keeps a missing amount_total undefined (pending), not 0', () => {
    const r = stripeCheckoutSessionAmounts(
      stripeSession({ amount_total: null, amount_subtotal: null })
    );
    expect(r.paymentAmount).toBeUndefined();
    expect(r.subtotalAmount).toBeUndefined();
  });

  it('keeps a real 0 total (100% promo)', () => {
    const r = stripeCheckoutSessionAmounts(
      stripeSession({
        amount_total: 0,
        total_details: { amount_discount: 999 },
      })
    );
    expect(r.paymentAmount).toBe(0);
    expect(r.discountAmount).toBe(999);
  });

  it('uses source-currency amounts under Adaptive Pricing', () => {
    const r = stripeCheckoutSessionAmounts(
      stripeSession({
        currency: 'eur',
        amount_subtotal: 921,
        amount_total: 921,
        currency_conversion: {
          amount_subtotal: 999,
          amount_total: 999,
          fx_rate: '0.9219',
          source_currency: 'usd',
        },
      })
    );
    expect(r).toEqual({
      paymentAmount: 999,
      paymentCurrency: 'usd',
      subtotalAmount: 999,
      discountAmount: 0,
      discountCurrency: 'usd',
    });
  });

  it('derives the source-currency discount from converted amounts', () => {
    const r = stripeCheckoutSessionAmounts(
      stripeSession({
        currency: 'eur',
        amount_subtotal: 921,
        amount_total: 461,
        total_details: { amount_discount: 460 },
        currency_conversion: {
          amount_subtotal: 999,
          amount_total: 500,
          fx_rate: '0.9219',
          source_currency: 'usd',
        },
      })
    );
    expect(r.paymentAmount).toBe(500);
    expect(r.subtotalAmount).toBe(999);
    expect(r.discountAmount).toBe(499);
    expect(r.paymentCurrency).toBe('usd');
    expect(r.discountCurrency).toBe('usd');
  });

  it('never reports a negative converted discount', () => {
    const r = stripeCheckoutSessionAmounts(
      stripeSession({
        total_details: { amount_discount: 5 },
        currency_conversion: {
          amount_subtotal: 999,
          amount_total: 1100, // tax pushed total above subtotal
          fx_rate: '1',
          source_currency: 'usd',
        },
      })
    );
    expect(r.discountAmount).toBe(0);
  });
});

describe('StripeProvider checkout session mapping', () => {
  it('maps Adaptive Pricing session to source currency, keeps raw session', async () => {
    const provider = bare(StripeProvider);
    const session = stripeSession({
      currency: 'jpy',
      amount_subtotal: 1500,
      amount_total: 1500,
      currency_conversion: {
        amount_subtotal: 999,
        amount_total: 999,
        fx_rate: '150.15',
        source_currency: 'usd',
      },
    });
    const result = await (
      provider as any
    ).buildPaymentSessionFromCheckoutSession(session);
    expect(result.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(result.paymentInfo.paymentAmount).toBe(999);
    expect(result.paymentInfo.paymentCurrency).toBe('usd');
    expect(result.paymentInfo.subtotalAmount).toBe(999);
    expect(result.paymentResult).toBe(session);
  });

  it('maps missing amount_total to undefined', async () => {
    const provider = bare(StripeProvider);
    const result = await (
      provider as any
    ).buildPaymentSessionFromCheckoutSession(
      stripeSession({ amount_total: null })
    );
    expect(result.paymentInfo.paymentAmount).toBeUndefined();
  });
});

describe('CreemProvider checkout mapping', () => {
  const session = (order: Record<string, unknown>) => ({
    id: 'ch_1',
    status: 'completed',
    order: { id: 'ord_1', status: 'paid', currency: 'USD', ...order },
    customer: { id: 'cus_1', email: 'a@b.c' },
    metadata: {},
  });

  it('maps absent amount_paid to undefined', async () => {
    const provider = bare(CreemProvider);
    const result = await (
      provider as any
    ).buildPaymentSessionFromCheckoutSession(session({ amount: 999 }));
    expect(result.paymentInfo.paymentAmount).toBeUndefined();
  });

  it('keeps a real 0 amount_paid', async () => {
    const provider = bare(CreemProvider);
    const result = await (
      provider as any
    ).buildPaymentSessionFromCheckoutSession(
      session({ amount: 999, amount_paid: 0, discount_amount: 999 })
    );
    expect(result.paymentInfo.paymentAmount).toBe(0);
    expect(result.paymentInfo.subtotalAmount).toBe(999);
  });

  it('maps a reported amount_paid', async () => {
    const provider = bare(CreemProvider);
    const result = await (
      provider as any
    ).buildPaymentSessionFromCheckoutSession(
      session({ amount: 999, amount_paid: 999 })
    );
    expect(result.paymentInfo.paymentAmount).toBe(999);
  });
});

describe('PayPalProvider order mapping', () => {
  it('maps a missing amount to undefined', async () => {
    const provider = bare(PayPalProvider);
    const result = await (provider as any).buildPaymentSessionFromOrder({
      id: 'PP-1',
      status: 'COMPLETED',
      purchase_units: [{ custom_id: '{"order_no":"ORD-1"}' }],
    });
    expect(result.paymentInfo.paymentAmount).toBeUndefined();
  });

  it('maps a capture amount to cents', async () => {
    const provider = bare(PayPalProvider);
    const result = await (provider as any).buildPaymentSessionFromOrder({
      id: 'PP-2',
      status: 'COMPLETED',
      purchase_units: [
        {
          amount: { value: '9.99', currency_code: 'USD' },
          payments: {
            captures: [
              { id: 'CAP-1', amount: { value: '9.99', currency_code: 'USD' } },
            ],
          },
        },
      ],
    });
    expect(result.paymentInfo.paymentAmount).toBe(999);
    expect(result.paymentInfo.paymentCurrency).toBe('USD');
  });
});

describe('PayPal currency minor units', () => {
  it('formats amounts with PayPal decimals per currency', () => {
    expect(toPayPalAmountValue(999, 'usd')).toBe('9.99');
    expect(toPayPalAmountValue(7199, 'CNY')).toBe('71.99');
    expect(toPayPalAmountValue(1000, 'JPY')).toBe('1000');
    // ISO gives HUF/TWD 2 decimals but PayPal accepts none
    expect(toPayPalAmountValue(150000, 'HUF')).toBe('1500');
    expect(toPayPalAmountValue(30000, 'TWD')).toBe('300');
    expect(toPayPalAmountValue(1234, 'KWD')).toBe('1.234');
    expect(toPayPalAmountValue(0, 'USD')).toBe('0.00');
    expect(toPayPalAmountValue(0, 'JPY')).toBe('0');
  });

  it('parses values back to minor units of their currency', () => {
    expect(fromPayPalAmountValue('9.99', 'USD')).toBe(999);
    expect(fromPayPalAmountValue('1000', 'JPY')).toBe(1000);
    expect(fromPayPalAmountValue('1500', 'HUF')).toBe(150000);
    expect(fromPayPalAmountValue('0.00', 'USD')).toBe(0);
    expect(fromPayPalAmountValue('', 'USD')).toBeUndefined();
    expect(fromPayPalAmountValue(undefined, 'USD')).toBeUndefined();
  });

  it('sends JPY checkout without decimals', async () => {
    const provider = bare(PayPalProvider);
    let payload: any;
    (provider as any).makeRequest = async (
      _path: string,
      _m: string,
      body: any
    ) => {
      payload = body;
      return { id: 'PP-1', links: [{ rel: 'approve', href: 'https://pp/x' }] };
    };
    await (provider as any).createOneTimePayment({
      orderNo: 'ORD-1',
      description: 'Pack',
      price: { amount: 1500, currency: 'jpy' },
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/cancel',
    });
    const unit = payload.purchase_units[0];
    expect(unit.amount).toEqual({
      currency_code: 'JPY',
      value: '1500',
      breakdown: { item_total: { currency_code: 'JPY', value: '1500' } },
    });
    expect(unit.items[0].unit_amount).toEqual({
      currency_code: 'JPY',
      value: '1500',
    });
  });

  it('maps a JPY order (amount, discount, item_total) without x100', async () => {
    const provider = bare(PayPalProvider);
    const result = await (provider as any).buildPaymentSessionFromOrder({
      id: 'PP-3',
      status: 'COMPLETED',
      purchase_units: [
        {
          amount: {
            value: '1300',
            currency_code: 'JPY',
            breakdown: {
              item_total: { value: '1500', currency_code: 'JPY' },
              discount: { value: '200', currency_code: 'JPY' },
            },
          },
          payments: {
            captures: [
              { id: 'CAP-3', amount: { value: '1300', currency_code: 'JPY' } },
            ],
          },
        },
      ],
    });
    expect(result.paymentInfo).toMatchObject({
      paymentAmount: 1300,
      paymentCurrency: 'JPY',
      subtotalAmount: 1500,
      discountAmount: 200,
    });
  });

  it('maps a capture event in USD', async () => {
    const provider = bare(PayPalProvider);
    const result = await (provider as any).buildPaymentSessionFromCapture({
      id: 'CAP-4',
      status: 'COMPLETED',
      amount: { value: '9.99', currency_code: 'USD' },
      custom_id: '{"order_no":"ORD-4"}',
    });
    expect(result.paymentInfo.paymentAmount).toBe(999);
    expect(result.paymentInfo.discountAmount).toBe(0);
  });
});
