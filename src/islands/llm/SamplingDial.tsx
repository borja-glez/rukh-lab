/**
 * SamplingDial (/como-funciona-un-llm/, chapter 8): the three knobs of every chat API over one
 * fixed set of next-word logits. Moving temperature, top-k or top-p redraws the probabilities
 * (outline: after temperature; filled: what is left after the filters, renormalised), and
 * «Muestrear» draws words from the final distribution. The maths is src/lib/llm/sampling.ts;
 * styles are src/styles/llm/sampling-dial.css (`.sd*`), never inline (CSP).
 */
import { useId, useMemo, useState } from 'preact/hooks';
import { draw, score, type Candidate } from '../../lib/llm/sampling';
import '../../styles/llm/sampling-dial.css';

export const PROMPT = 'Hoy llueve en Ourense, así que me llevo el';

/** Made-up logits, in the order the model would rank them. */
export const CANDIDATES: Candidate[] = [
  { token: 'paraguas', logit: 4.0 },
  { token: 'abrigo', logit: 2.6 },
  { token: 'chubasquero', logit: 2.3 },
  { token: 'coche', logit: 1.4 },
  { token: 'libro', logit: 0.3 },
  { token: 'bocadillo', logit: 0 },
  { token: 'perro', logit: -0.4 },
  { token: 'piano', logit: -2 },
];

const PRESETS = [
  { name: 'Siempre el favorito', temperature: 0, topK: 8, topP: 1 },
  { name: 'Un chat típico', temperature: 0.7, topK: 8, topP: 0.9 },
  { name: 'Caos', temperature: 1.8, topK: 8, topP: 1 },
];

const HISTORY = 20;
const pct = (p: number) =>
  p === 0 ? '0 %' : p < 0.005 ? '< 1 %' : `${Math.round(p * 100).toLocaleString('es-ES')} %`;
const num = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export default function SamplingDial() {
  const id = useId();
  const [temperature, setTemperature] = useState(1);
  const [topK, setTopK] = useState(CANDIDATES.length);
  const [topP, setTopP] = useState(1);
  const [drawn, setDrawn] = useState<number[]>([]);

  const scored = useMemo(
    () => score(CANDIDATES, { temperature, topK, topP }),
    [temperature, topK, topP],
  );
  const kept = scored.filter((s) => s.kept).length;
  const last = drawn[drawn.length - 1];

  const sample = (times: number) => {
    const next = [...drawn];
    for (let i = 0; i < times; i++) next.push(draw(scored, Math.random()));
    setDrawn(next.slice(-HISTORY));
  };

  const set = (fn: (v: number) => void) => (e: Event) => {
    fn(Number((e.currentTarget as HTMLInputElement).value));
    setDrawn([]);
  };

  const counts = CANDIDATES.map((_, i) => drawn.filter((d) => d === i).length);

  return (
    <div class="sd">
      <div class="sd__presets" role="group" aria-label="Ajustes de ejemplo">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            class="btn btn--secondary btn--small"
            aria-pressed={p.temperature === temperature && p.topK === topK && p.topP === topP}
            onClick={() => {
              setTemperature(p.temperature);
              setTopK(p.topK);
              setTopP(p.topP);
              setDrawn([]);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div class="sd__knobs">
        <label class="sd__knob" for={`${id}-t`}>
          <span class="label">Temperatura</span>
          <output class="sd__value" for={`${id}-t`}>
            {num(temperature)}
          </output>
          <input
            id={`${id}-t`}
            class="sd__range"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onInput={set(setTemperature)}
          />
        </label>
        <label class="sd__knob" for={`${id}-k`}>
          <span class="label">Top-k</span>
          <output class="sd__value" for={`${id}-k`}>
            {topK}
          </output>
          <input
            id={`${id}-k`}
            class="sd__range"
            type="range"
            min="1"
            max={CANDIDATES.length}
            step="1"
            value={topK}
            onInput={set(setTopK)}
          />
        </label>
        <label class="sd__knob" for={`${id}-p`}>
          <span class="label">Top-p</span>
          <output class="sd__value" for={`${id}-p`}>
            {num(topP)}
          </output>
          <input
            id={`${id}-p`}
            class="sd__range"
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={topP}
            onInput={set(setTopP)}
          />
        </label>
      </div>

      <p class="sd__prompt">
        {PROMPT}{' '}
        <strong class="sd__word">{last === undefined ? '…' : CANDIDATES[last].token}</strong>
      </p>

      <ol class="sd__rows" aria-label="Probabilidad de cada palabra candidata">
        {scored.map((s, i) => (
          <li key={s.token} class={s.kept ? 'sd__row' : 'sd__row sd__row--out'}>
            <span class="sd__token">{s.token}</span>
            <svg class="sd__bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
              <rect class="sd__track" x="0" y="0" width="100" height="10" />
              <rect class="sd__before" x="0" y="0" width={s.prob * 100} height="10" />
              <rect class="sd__after" x="0" y="0" width={s.final * 100} height="10" />
            </svg>
            <span class="sd__pct">{s.kept ? pct(s.final) : 'fuera'}</span>
            <span class="sd__tally">
              {counts[i] > 0 && (
                <>
                  <span aria-hidden="true">×{counts[i]}</span>
                  <span class="sr-only">{`, salió ${counts[i]} veces`}</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>

      <p class="sd__legend caption">
        Contorno: probabilidad tras la temperatura. Relleno: lo que queda tras top-k y top-p,
        repartido de nuevo para que sume 100 %.
      </p>

      <div class="sd__actions">
        <button type="button" class="btn btn--primary btn--small" onClick={() => sample(1)}>
          Muestrear
        </button>
        <button type="button" class="btn btn--secondary btn--small" onClick={() => sample(HISTORY)}>
          Muestrear 20 veces
        </button>
      </div>

      <p class="sd__status" role="status" aria-live="polite">
        {drawn.length === 0
          ? `Quedan ${kept} de ${CANDIDATES.length} candidatas. Pulsa «Muestrear».`
          : `Últimas ${drawn.length}: ${drawn.map((d) => CANDIDATES[d].token).join(', ')}.`}
      </p>
    </div>
  );
}
