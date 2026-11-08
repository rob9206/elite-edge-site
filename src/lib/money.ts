/**
 * Money and percentage helpers.
 *
 * Invariant: money is ALWAYS integer cents inside the app and DB. Decimal
 * strings exist only at the Uniwire boundary. Percentages are integer basis
 * points (bps): 10% = 1000, 12.5% = 1250.
 */

/** Round half-up to the nearest cent. Keeps totals deterministic. */
export function roundCents(value: number): number {
  // Math.round rounds .5 toward +Infinity for positive numbers, which is the
  // behavior we want for currency here.
  return Math.round(value);
}

/** Apply a basis-point rate to a cents amount, returning rounded cents. */
export function applyBps(cents: number, bps: number): number {
  return roundCents((cents * bps) / 10_000);
}

/** cents -> "1234.56" (decimal string) for the Uniwire boundary only. */
export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${dollars}.${remainder.toString().padStart(2, '0')}`;
}

/** cents -> "$1,234.56" for display. */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/** "1234.56" | 1234.56 -> integer cents. Throws on invalid input. */
export function dollarsToCents(value: string | number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) throw new Error(`Invalid money value: ${value}`);
  return roundCents(n * 100);
}

/** bps -> "12.5%" for display. */
export function formatPct(bps: number): string {
  return `${(bps / 100).toString()}%`;
}
