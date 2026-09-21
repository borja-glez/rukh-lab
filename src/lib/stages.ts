/**
 * Where each evaluated stage of `results.json` lives outside the table: its model card on the Hub
 * and, when the demo serves those weights, the arena stage that plays them.
 *
 * Stage names are the ones `rukh eval` writes (the catalogue in `rukh/docs/benchmarks.md`).
 * `demo` is an id of the demo's registry (`rukh-web/src/lib/registry.ts`, `STAGES`), which is
 * what `?vs=` accepts: the query parser keeps `vs` only when `findStage(vs)` knows it, and it
 * fills the arena's second slot, so the link also opens the arena mode. A stage the demo does not
 * serve has no `demo`: the encoder is loaded through `?encoder=` and never plays, `medium-masters`
 * was never exported, and the baseline is not a Rukh model.
 *
 * The two LoRA rows point at the swappable export they load into (`medium-lora-fp16`): an adapter
 * is 1.6 MB of factors over that graph, not a stage of its own, and that page is where the style
 * selector offers it.
 */
export interface StageLinks {
  /** Hugging Face repo id of the model card. */
  repo: string;
  /** Demo stage id (`?vs=`), when the demo serves these weights. */
  demo?: string;
}

export const HUB = 'https://huggingface.co/';
export const DEMO = 'https://rukh.borjaglez.com/';

export const STAGES: Readonly<Record<string, StageLinks>> = {
  'tiny-greedy': { repo: 'chorcat/rukh-tiny', demo: 'tiny-int8' },
  'small-v3-greedy': { repo: 'chorcat/rukh-small', demo: 'small-fp16' },
  'medium-v4-greedy': { repo: 'chorcat/rukh-medium', demo: 'medium-fp16' },
  'encoder-v4': { repo: 'chorcat/rukh-encoder' },
  'medium-elo': { repo: 'chorcat/rukh-medium-elo', demo: 'medium-elo-fp16' },
  'medium-masters': { repo: 'chorcat/rukh-medium-masters' },
  'lora-e4': { repo: 'chorcat/rukh-lora-e4', demo: 'medium-lora-fp16' },
  'lora-d4': { repo: 'chorcat/rukh-lora-d4', demo: 'medium-lora-fp16' },
  'qwen3-pgn-qlora': { repo: 'chorcat/rukh-qwen3-pgn-qlora' },
  'medium-v4-dpo-onpolicy-greedy': { repo: 'chorcat/rukh-medium-dpo', demo: 'medium-dpo-fp16' },
  'medium-v4-grpo-greedy': { repo: 'chorcat/rukh-medium-grpo', demo: 'medium-grpo-fp16' },
};

/** The links of one stage, or undefined for a stage the map does not know. */
export function stageLinks(stage: string): StageLinks | undefined {
  return STAGES[stage];
}

/** URL of a model card. */
export function hubUrl(repo: string): string {
  return `${HUB}${repo}`;
}

/** URL of the demo with this stage in the arena's second slot. */
export function demoUrl(demo: string): string {
  return `${DEMO}?mode=arena&vs=${encodeURIComponent(demo)}`;
}
