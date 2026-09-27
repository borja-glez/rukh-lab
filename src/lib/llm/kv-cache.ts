/**
 * Work counted in "token passes" for the GenerationLoop widget: how many token positions go
 * through the network to produce `generated` new tokens after a prompt of `prompt` tokens.
 *
 * Without a KV cache every step re-reads the whole sequence so far; with it, the prompt is read
 * once and each later step reads only the newest token (the keys and values of the others are
 * remembered). Attention still looks at every earlier token either way; what the cache saves is
 * recomputing their keys and values.
 */
export function passesWithoutCache(prompt: number, generated: number): number {
  let total = 0;
  for (let step = 0; step < generated; step++) total += prompt + step;
  return total;
}

export function passesWithCache(prompt: number, generated: number): number {
  if (generated === 0) return 0;
  return prompt + (generated - 1);
}
