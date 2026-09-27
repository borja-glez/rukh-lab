/**
 * Parameter arithmetic for the LoraPatch widget: a d_out × d_in weight matrix W stays frozen and
 * LoRA trains B (d_out × r) and A (r × d_in) instead, so the update B·A has rank at most r.
 */

export function fullParams(dOut: number, dIn: number): number {
  return dOut * dIn;
}

export function loraParams(dOut: number, dIn: number, rank: number): number {
  return rank * (dOut + dIn);
}

/** Share of W's parameters that LoRA trains, in [0, 1]. */
export function loraShare(dOut: number, dIn: number, rank: number): number {
  return loraParams(dOut, dIn, rank) / fullParams(dOut, dIn);
}
