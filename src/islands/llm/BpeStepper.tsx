/**
 * BpeStepper (/como-funciona-un-llm/, chapter 1): train a BPE on a few words, one merge at a time.
 * Each press counts the adjacent pairs, merges the most frequent one everywhere and shows the
 * words re-cut, the merge list and how many tokens the text takes now. The logic is
 * src/lib/llm/bpe-train.ts; styles are src/styles/llm/bpe-stepper.css (`.bpe*`), never inline (CSP).
 */
import { useMemo, useState } from 'preact/hooks';
import {
  initBpe,
  pairCounts,
  step,
  tokenCount,
  vocabulary,
  type BpeState,
} from '../../lib/llm/bpe-train';
import '../../styles/llm/bpe-stepper.css';

export const DEFAULT_CORPUS =
  'gato gatos gatito gata pato patos patito rato ratos ratito gato pato rato';

const MAX_CHARS = 160;

export default function BpeStepper() {
  const [corpus, setCorpus] = useState(DEFAULT_CORPUS);
  const [history, setHistory] = useState<BpeState[]>(() => [initBpe(DEFAULT_CORPUS)]);
  const state = history[history.length - 1];
  const pairs = useMemo(() => pairCounts(state).slice(0, 5), [state]);
  const initialTokens = tokenCount(history[0]);
  const tokens = tokenCount(state);
  const lastMerge = state.merges[state.merges.length - 1];
  const done = pairs.length === 0;

  const reset = (text: string) => {
    setCorpus(text);
    setHistory([initBpe(text)]);
  };

  const status = lastMerge
    ? `Fusión ${state.merges.length}: ${lastMerge[0]} + ${lastMerge[1]} → ${lastMerge.join('')}. El texto ocupa ${tokens} tokens (empezó en ${initialTokens}).`
    : `Sin fusiones: cada letra es un token. El texto ocupa ${tokens} tokens.`;

  return (
    <div class="bpe">
      <label class="bpe__field">
        <span class="label">Texto de entrenamiento (cámbialo si quieres)</span>
        <input
          class="bpe__input"
          type="text"
          value={corpus}
          maxLength={MAX_CHARS}
          spellcheck={false}
          onInput={(e) => reset((e.currentTarget as HTMLInputElement).value)}
        />
      </label>

      <div class="bpe__actions">
        <button
          type="button"
          class="btn btn--primary btn--small"
          disabled={done}
          onClick={() => setHistory([...history, step(state)])}
        >
          {done ? 'No quedan pares' : 'Siguiente fusión'}
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          disabled={history.length === 1}
          onClick={() => setHistory(history.slice(0, -1))}
        >
          Deshacer
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          disabled={history.length === 1 && corpus === DEFAULT_CORPUS}
          onClick={() => reset(DEFAULT_CORPUS)}
        >
          Empezar de nuevo
        </button>
      </div>

      <p class="bpe__status" role="status" aria-live="polite">
        {status}
      </p>

      <div class="bpe__grid">
        <div class="bpe__words">
          <p class="label">Cómo queda cortada cada palabra</p>
          <ul class="bpe__list">
            {state.words.map(({ symbols, count }, w) => (
              <li class="bpe__word" key={w}>
                <span class="bpe__pieces">
                  {symbols.map((s, i) => (
                    <span
                      key={i}
                      class={
                        lastMerge && s === lastMerge.join('')
                          ? 'bpe__piece bpe__piece--new'
                          : s.length > 1
                            ? 'bpe__piece bpe__piece--merged'
                            : 'bpe__piece'
                      }
                    >
                      {s}
                    </span>
                  ))}
                </span>
                {count > 1 && <span class="bpe__count">×{count}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div class="bpe__side">
          <p class="label">Pares más frecuentes ahora</p>
          {pairs.length > 0 ? (
            <ol class="bpe__pairs">
              {pairs.map(({ pair, count }, i) => (
                <li
                  key={pair.join('|')}
                  class={i === 0 ? 'bpe__pair bpe__pair--next' : 'bpe__pair'}
                >
                  <span class="bpe__pair-name">
                    {pair[0]} + {pair[1]}
                  </span>
                  <span
                    class="bpe__pair-bar"
                    data-share={Math.min(10, Math.round((count / pairs[0].count) * 10))}
                  />
                  <span class="bpe__pair-count">{count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p class="bpe__empty">Cada palabra es ya un solo token.</p>
          )}

          <p class="label bpe__merges-label">Fusiones aprendidas ({state.merges.length})</p>
          <p class="bpe__merges">
            {state.merges.length === 0
              ? '—'
              : state.merges.map(([a, b]) => `${a}+${b}`).join(' · ')}
          </p>

          <dl class="bpe__numbers">
            <div>
              <dt class="label">Tokens del texto</dt>
              <dd>
                {tokens} <span class="bpe__from">de {initialTokens}</span>
              </dd>
            </div>
            <div>
              <dt class="label">Vocabulario</dt>
              <dd>{vocabulary(state, corpus).length}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
