/**
 * BPE training on a toy corpus, one merge at a time, for the BpeStepper widget of
 * /como-funciona-un-llm/. This is the *training* side of BPE (count adjacent pairs, merge the
 * most frequent, repeat), which is what the page wants to show. Encoding with the merges Rukh
 * really learned lives in src/lib/chess-lm/bpe.ts; this module is not a copy of it.
 *
 * Words are split on whitespace and never merged across a space, like Hugging Face's
 * `WhitespaceSplit`. Ties go to the pair seen first when reading the corpus left to right, so a
 * run is deterministic and a reader can follow it by hand.
 */

export interface BpeState {
  /** Each distinct word as its current list of symbols, with how many times it appears. */
  words: { symbols: string[]; count: number }[];
  /** Merges learned so far, in order: `['g', 'a']` means `g` + `a` → `ga`. */
  merges: [string, string][];
}

export interface PairCount {
  pair: [string, string];
  count: number;
}

export function initBpe(corpus: string): BpeState {
  const counts = new Map<string, number>();
  for (const word of corpus.toLowerCase().split(/\s+/)) {
    if (word) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return {
    words: [...counts].map(([word, count]) => ({ symbols: [...word], count })),
    merges: [],
  };
}

/** Adjacent pairs and their frequency, most frequent first (first seen wins a tie). */
export function pairCounts(state: BpeState): PairCount[] {
  const counts = new Map<string, PairCount>();
  for (const { symbols, count } of state.words) {
    for (let i = 0; i < symbols.length - 1; i++) {
      const key = `${symbols[i]}\u0000${symbols[i + 1]}`;
      const entry = counts.get(key);
      if (entry) entry.count += count;
      else counts.set(key, { pair: [symbols[i], symbols[i + 1]], count });
    }
  }
  /* Array.prototype.sort is stable, so insertion order (first seen) breaks ties. */
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

/** Applies the most frequent merge. Returns the same state when nothing is left to merge. */
export function step(state: BpeState): BpeState {
  const [best] = pairCounts(state);
  if (!best) return state;
  const [a, b] = best.pair;
  return {
    words: state.words.map(({ symbols, count }) => {
      const out: string[] = [];
      for (let i = 0; i < symbols.length; i++) {
        if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
          out.push(a + b);
          i++;
        } else {
          out.push(symbols[i]);
        }
      }
      return { symbols: out, count };
    }),
    merges: [...state.merges, [a, b]],
  };
}

/** Distinct symbols in use plus the base characters: the vocabulary a real BPE would keep. */
export function vocabulary(state: BpeState, corpus: string): string[] {
  const chars = new Set([...corpus.toLowerCase().replace(/\s+/g, '')]);
  const merged = state.merges.map(([a, b]) => a + b);
  return [...[...chars].sort((x, y) => x.localeCompare(y, 'es')), ...merged];
}

/** Total number of tokens the corpus takes with the merges so far. */
export function tokenCount(state: BpeState): number {
  return state.words.reduce((sum, { symbols, count }) => sum + symbols.length * count, 0);
}
