/**
 * The last step of every generation, in the order the course uses (M2 · muestrear jugadas):
 * logits → divide by temperature → softmax → keep the top k → keep the top-p nucleus →
 * renormalise → draw. Shared by the SamplingDial widget and its tests.
 */

export interface Candidate {
  token: string;
  logit: number;
}

export interface Scored extends Candidate {
  /** Probability after temperature and softmax, before any filter. */
  prob: number;
  /** Probability after the filters and renormalisation; 0 when filtered out. */
  final: number;
  kept: boolean;
}

export function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Temperature 0 is the argmax (all the mass on the best logit), which is the limit of
 * temperature → 0 and what every library does.
 */
export function withTemperature(logits: number[], temperature: number): number[] {
  if (temperature <= 0) {
    const best = logits.indexOf(Math.max(...logits));
    return logits.map((_, i) => (i === best ? 1 : 0));
  }
  return softmax(logits.map((l) => l / temperature));
}

export function score(
  candidates: Candidate[],
  { temperature, topK, topP }: { temperature: number; topK: number; topP: number },
): Scored[] {
  const probs = withTemperature(
    candidates.map((c) => c.logit),
    temperature,
  );
  const order = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const kept = new Set<number>();
  let cumulative = 0;
  for (const [rank, { p, i }] of order.entries()) {
    if (rank >= topK) break;
    /* The nucleus always keeps the token that crosses p, so it is never empty. */
    if (rank > 0 && cumulative >= topP) break;
    kept.add(i);
    cumulative += p;
  }
  const mass = [...kept].reduce((sum, i) => sum + probs[i], 0);
  return candidates.map((c, i) => ({
    ...c,
    prob: probs[i],
    kept: kept.has(i),
    final: kept.has(i) && mass > 0 ? probs[i] / mass : 0,
  }));
}

/** Draws one index from the final distribution; `r` is a number in [0, 1). */
export function draw(scored: Scored[], r: number): number {
  let acc = 0;
  for (const [i, s] of scored.entries()) {
    acc += s.final;
    if (r < acc) return i;
  }
  /* Rounding can leave the sum a hair under 1: fall back to the last kept candidate. */
  return scored.map((s) => s.kept).lastIndexOf(true);
}
