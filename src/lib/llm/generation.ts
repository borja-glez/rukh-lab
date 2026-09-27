/**
 * What each position of the sequence is doing at one step of the GenerationLoop widget
 * (/como-funciona-un-llm/, chapter 9). Step `k` (from 1) produces the k-th new token from the
 * `prompt + k - 1` tokens before it.
 *
 * - `computed`: the network works this position out in this step (its keys and values included).
 * - `reused`: with a KV cache, its keys and values come from memory; nothing is recomputed.
 * - `output`: the token this step has just produced.
 * - `idle`: nothing has run yet (step 0).
 *
 * The totals agree with src/lib/llm/kv-cache.ts: summing `computed` over steps 1..n gives
 * `passesWithoutCache` or `passesWithCache`.
 */
export type Mark = 'idle' | 'computed' | 'reused' | 'output';

export function marks(prompt: number, step: number, cache: boolean): Mark[] {
  if (step <= 0) return Array.from({ length: prompt }, () => 'idle');
  const read = prompt + step - 1;
  const out: Mark[] = [];
  for (let i = 0; i < read; i++) {
    /* With a cache, the first step (the prompt, "prefill") still computes everything. */
    out.push(cache && step > 1 && i < read - 1 ? 'reused' : 'computed');
  }
  out.push('output');
  return out;
}

/** Positions computed in one step: what the pass counters add up. */
export function computedAt(prompt: number, step: number, cache: boolean): number {
  return marks(prompt, step, cache).filter((m) => m === 'computed').length;
}
