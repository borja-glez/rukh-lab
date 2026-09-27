/**
 * AttentionPlayground (/como-funciona-un-llm/, chapter 4): pick a word of a toy sentence and see
 * how it shares its attention among the others, under two heads that ask different questions,
 * with the causal mask on or off. The weights are hand-written (src/lib/llm/attention.ts); styles
 * are src/styles/llm/attention-playground.css (`.ap*`), never inline (CSP). Bar widths are SVG
 * attributes, not style.
 */
import { useState } from 'preact/hooks';
import { HEADS, SENTENCE, attentionRow } from '../../lib/llm/attention';
import '../../styles/llm/attention-playground.css';

const pct = (w: number) => `${Math.round(w * 100)} %`;

export default function AttentionPlayground() {
  const [query, setQuery] = useState(SENTENCE.length - 1);
  const [headIndex, setHeadIndex] = useState(0);
  const [causal, setCausal] = useState(true);
  const head = HEADS[headIndex];
  const weights = attentionRow(head.scores, query, causal);

  const ranked = weights
    .map((w, k) => ({ w, k }))
    .filter(({ w }) => w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, 2);
  const status =
    `«${SENTENCE[query]}» reparte su atención: ` +
    ranked.map(({ w, k }) => `${pct(w)} a «${SENTENCE[k]}»`).join(', ') +
    (causal && query < SENTENCE.length - 1
      ? `. Las ${SENTENCE.length - 1 - query} palabras siguientes están tapadas por la máscara.`
      : '.');

  const onKey = (e: KeyboardEvent, k: number) => {
    const move =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!move) return;
    e.preventDefault();
    const next = Math.min(SENTENCE.length - 1, Math.max(0, k + move));
    setQuery(next);
    const list = (e.currentTarget as HTMLElement).closest('.ap__rows');
    list?.querySelectorAll<HTMLButtonElement>('.ap__word')[next]?.focus();
  };

  return (
    <div class="ap">
      <div class="ap__controls">
        <div class="ap__heads" role="group" aria-label="Cabeza de atención">
          {HEADS.map((h, i) => (
            <button
              key={h.id}
              type="button"
              class="btn btn--secondary btn--small ap__head"
              aria-pressed={i === headIndex}
              onClick={() => setHeadIndex(i)}
            >
              {h.name} <span class="ap__question">{h.question}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          class="btn btn--secondary btn--small ap__mask"
          aria-pressed={causal}
          onClick={() => setCausal(!causal)}
        >
          Máscara causal: {causal ? 'puesta' : 'quitada'}
        </button>
      </div>

      <p class="ap__hint">Toca una palabra (o muévete con las flechas) para ver a quién escucha.</p>

      <ol class="ap__rows" aria-label="Palabras de la frase y porcentaje de atención que reciben">
        {SENTENCE.map((word, k) => {
          const hidden = causal && k > query;
          const w = weights[k];
          return (
            <li key={k} class={hidden ? 'ap__row ap__row--hidden' : 'ap__row'}>
              <button
                type="button"
                class={k === query ? 'ap__word ap__word--query' : 'ap__word'}
                aria-pressed={k === query}
                onClick={() => setQuery(k)}
                onKeyDown={(e) => onKey(e, k)}
              >
                {word}
              </button>
              <svg
                class="ap__bar"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect class="ap__track" x="0" y="0" width="100" height="10" />
                <rect class="ap__fill" x="0" y="0" width={w * 100} height="10" />
              </svg>
              <span class="ap__pct">{hidden ? 'futuro' : pct(w)}</span>
            </li>
          );
        })}
      </ol>

      <p class="ap__status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
