import { describe, expect, it } from 'vitest';

import { paymentDisplayState } from './payment-state';

describe('payment display state', () => {
  it('keeps a declined attempt retryable while Checkout remains open', () => {
    expect(
      paymentDisplayState(
        'created',
        { status: 'open', payment_status: 'unpaid' },
        true
      )
    ).toBe('retryable');
  });
  it('does not call unpaid asynchronous completion a failure', () => {
    expect(
      paymentDisplayState(
        'created',
        { status: 'complete', payment_status: 'unpaid' },
        false
      )
    ).toBe('processing');
  });
  it('shows paid even if an old failed attempt exists', () => {
    expect(paymentDisplayState('paid', { status: 'open' }, true)).toBe('paid');
  });
  it('distinguishes expired Checkout from a failed attempt', () => {
    expect(paymentDisplayState('failed', { status: 'expired' }, true)).toBe(
      'expired'
    );
  });
});
