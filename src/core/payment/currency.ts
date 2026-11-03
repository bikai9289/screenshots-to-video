/**
 * Minor-unit helpers. Amounts in this app are integers in the currency's
 * ISO 4217 minor unit (USD cents, CNY fen, JPY yen).
 */

/** ISO 4217 minor-unit digits via Intl (JPY 0, USD 2, KWD 3); fallback 2. */
export function currencyMinorDigits(currency?: string | null): number {
  const code = String(currency || '')
    .trim()
    .toUpperCase();
  if (!code) return 2;
  try {
    return (
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** Decimal major-unit value ("9.99", 1000) → minor units; undefined if absent/invalid. */
export function majorToMinor(
  value: string | number | null | undefined,
  currency?: string | null
): number | undefined {
  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined;
  }
  const major = Number(value);
  if (!Number.isFinite(major)) return undefined;
  return Math.round(major * 10 ** currencyMinorDigits(currency));
}
