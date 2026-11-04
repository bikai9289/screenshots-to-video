import { describe, expect, it, vi } from 'vitest';

import { StripeProvider } from './stripe';
import { PaymentStatus } from './types';

describe('Stripe checkout lifecycle', () => {
  it('records an individual decline as an attempt, keeping the open checkout processing', async () => {
    const p = provider();
    p.client.webhooks.constructEventAsync = vi.fn().mockResolvedValue({
      id: 'evt_decline',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_one',
          last_payment_error: {
            code: 'card_declined',
            decline_code: 'insufficient_funds',
          },
        },
      },
    });
    p.client.checkout.sessions.list = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cs_one',
          status: 'open',
          payment_status: 'unpaid',
          amount_total: 990,
          currency: 'usd',
        },
      ],
    });
    const event = await p.getPaymentEvent({
      req: new Request('https://example.test', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'test' },
      }),
    });
    expect(event.paymentSession.paymentStatus).toBe(PaymentStatus.PROCESSING);
    expect(event.paymentSession.paymentAttempt).toEqual({
      id: 'evt_decline',
      code: 'card_declined',
      declineCode: 'insufficient_funds',
    });
    expect(p.client.checkout.sessions.list).toHaveBeenCalledWith({
      payment_intent: 'pi_one',
      limit: 1,
    });
  });
  function provider() {
    const p = new StripeProvider({
      secretKey: 'test-placeholder',
      publishableKey: '',
      signingSecret: 'test-placeholder',
    });
    return p as any;
  }
  it.each([
    'checkout.session.expired',
    'checkout.session.async_payment_failed',
    'checkout.session.async_payment_succeeded',
  ])('handles %s with signed snapshot payload', async (type) => {
    const p = provider();
    p.client.webhooks.constructEventAsync = vi.fn().mockResolvedValue({
      id: 'evt_one',
      type,
      data: {
        object: {
          id: 'cs_one',
          status: type.endsWith('expired') ? 'expired' : 'complete',
          payment_status: type.endsWith('succeeded') ? 'paid' : 'unpaid',
          amount_total: 990,
          currency: 'usd',
        },
      },
    });
    const event = await p.getPaymentEvent({
      req: new Request('https://example.test', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'test' },
      }),
    });
    expect(event.paymentSession.paymentStatus).toBe(
      type.endsWith('succeeded')
        ? PaymentStatus.SUCCESS
        : type.endsWith('expired')
          ? PaymentStatus.CANCELED
          : PaymentStatus.FAILED
    );
  });
  it('retrieves the expanded intent and exposes only structured attempt failure data', async () => {
    const p = provider();
    p.client.checkout.sessions.retrieve = vi.fn().mockResolvedValue({
      id: 'cs_one',
      status: 'open',
      payment_status: 'unpaid',
      amount_total: 990,
      currency: 'usd',
      payment_intent: {
        id: 'pi_one',
        status: 'requires_payment_method',
        last_payment_error: {
          code: 'card_declined',
          decline_code: 'insufficient_funds',
          charge: 'ch_one',
          message: 'sensitive raw provider text',
        },
      },
    });
    const session = await p.getPaymentSession({ sessionId: 'cs_one' });
    expect(p.client.checkout.sessions.retrieve).toHaveBeenCalledWith(
      'cs_one',
      { expand: ['payment_intent'] },
      { timeout: 15_000, maxNetworkRetries: 0 }
    );
    expect(session.paymentStatus).toBe(PaymentStatus.PROCESSING);
    expect(session.paymentAttempt).toEqual({
      id: 'ch_one',
      code: 'card_declined',
      declineCode: 'insufficient_funds',
    });
    expect(JSON.stringify(session.paymentAttempt)).not.toContain('sensitive');
  });
});
