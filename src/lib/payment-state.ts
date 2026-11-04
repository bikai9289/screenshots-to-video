export type PaymentDisplayState =
  | 'pending'
  | 'processing'
  | 'retryable'
  | 'paid'
  | 'expired'
  | 'failed'
  | 'refunding'
  | 'refunded'
  | 'abnormal';

export function paymentDisplayState(
  status: string,
  result: { status?: string; payment_status?: string } = {},
  failedAttempt = false
): PaymentDisplayState {
  if (['paid', 'refunding', 'refunded', 'abnormal'].includes(status))
    return status as PaymentDisplayState;
  if (result.status === 'expired') return 'expired';
  if (status === 'failed') return 'failed';
  if (result.status === 'complete') return 'processing';
  return failedAttempt ? 'retryable' : 'pending';
}
