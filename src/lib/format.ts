/**
 * Number formatting shared by the M6 leaderboard and figures.
 *
 * Hand-rolled rather than `Intl.NumberFormat`, for two reasons. The island is rendered on the
 * server and hydrated in the browser, and a locale that resolves differently in Node's ICU and in
 * the visitor's browser would make Preact re-render a table that already looked right. And the
 * conventions here are typographic, not locale data: Spanish groups thousands with a thin
 * no-break space (RAE), never with a dot, and leaves four-digit numbers ungrouped.
 */

/** The thin no-break space that separates groups of thousands. */
export const THIN = ' ';

/** The typographic minus, so `−200` reads as a sign and not as a dash. */
export const MINUS = '−';

/** Groups the digits of a non-negative integer string by three, only from five digits up. */
function group(digits: string): string {
  if (digits.length < 5) return digits;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
}

/** `115120128` → `115 120 128`; `1504` → `1504`; `-200` → `−200`. */
export function formatInt(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? MINUS : '';
  return sign + group(String(Math.abs(rounded)));
}

/** A number with a fixed count of decimals, comma as the separator and grouped thousands. */
export function formatDecimal(value: number, digits = 1): string {
  const fixed = Math.abs(value).toFixed(digits);
  const [whole, fraction] = fixed.split('.');
  const sign = value < 0 && Number(fixed) !== 0 ? MINUS : '';
  return sign + group(whole) + (fraction ? `,${fraction}` : '');
}

/**
 * A fraction in [0, 1] as a percentage, `toFixed` like `rukh eval`'s own report.md so the two
 * renderings of the same measurement never disagree by a tenth.
 */
export function formatPercent(fraction: number, digits = 1): string {
  return `${formatDecimal(fraction * 100, digits)}${THIN}%`;
}

/** Parameter counts: millions above a million, plain integers below. */
export function formatParams(value: number): string {
  return value >= 1e6 ? `${formatDecimal(value / 1e6, 1)}${THIN}M` : formatInt(value);
}

/** `2026-09-20T23:32:19+00:00` → `20/09/2026`; null for anything that is not a date. */
export function formatDate(iso: string | null | undefined): string | null {
  if (typeof iso !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

/** A finite number, or `NaN` for anything else (`null`, a string, a hole in the data). */
export function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}
