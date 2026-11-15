/**
 * Money is an integer number of KES cents everywhere (API, DB, client state).
 * Mirrors server/src/utils/money.ts. Convert only at the edges: parse user input
 * with kesToCents, show values with formatKes.
 */
export const CENTS_PER_UNIT = 100;

const kes = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatKes(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error('formatKes expects integer cents');
  return kes.format(cents / CENTS_PER_UNIT);
}

/**
 * Parses what a person typed ("1,200", "350.5") into integer cents.
 * Returns null for anything that is not a non-negative amount with at most 2 decimals.
 * Works on the decimal string, so there is no floating-point error.
 */
export function kesToCents(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, '');
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const cents = Number(m[1]) * CENTS_PER_UNIT + Number((m[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Cents to the text shown in an input: 35000 -> "350", 35050 -> "350.50". */
export function centsToInput(cents: number): string {
  return cents % CENTS_PER_UNIT === 0 ? String(cents / CENTS_PER_UNIT) : (cents / CENTS_PER_UNIT).toFixed(2);
}
