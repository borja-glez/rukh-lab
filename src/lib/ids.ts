/**
 * Deterministic element ids for components rendered several times on a page.
 * A counter per prefix lives in `Astro.locals` (one object per page render), so
 * the same page always builds to the same HTML and ids never collide within it.
 */
const KEY = '__rukhIdCounters';

export function pageId(locals: object, prefix: string): string {
  const store = locals as Record<string, unknown>;
  const counters = (store[KEY] ??= new Map<string, number>()) as Map<string, number>;
  const n = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, n);
  return n === 1 ? prefix : `${prefix}-${n}`;
}
