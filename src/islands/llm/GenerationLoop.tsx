/**
 * GenerationLoop (/como-funciona-un-llm/, chapter 9): a model writing one token at a time. Each
 * step shows which positions the network works out and which, with a KV cache, it only reads back
 * from memory, and two counters add up the work. The continuation is scripted (no model runs in
 * the page); the bookkeeping is src/lib/llm/generation.ts. Styles are src/styles/llm/generation-loop.css
 * (`.gl*`), never inline (CSP).
 */
import { useEffect, useState } from 'preact/hooks';
import { computedAt, marks, type Mark } from '../../lib/llm/generation';
import '../../styles/llm/generation-loop.css';

export const PROMPT = ['El', '␣gato', '␣se', '␣subió', '␣al'];
export const CONTINUATION = ['␣tejado', '␣y', '␣no', '␣quiso', '␣bajar', '.', '<fin>'];
const TICK_MS = 1100;

const MARK_LABEL: Record<Mark, string> = {
  idle: 'aún sin procesar',
  computed: 'calculado en este paso',
  reused: 'leído de la caché',
  output: 'token recién escrito',
};

export default function GenerationLoop() {
  const [step, setStep] = useState(0);
  const [cache, setCache] = useState(false);
  const [playing, setPlaying] = useState(false);
  const done = step >= CONTINUATION.length;

  useEffect(() => {
    if (!playing) return;
    if (done) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((s) => s + 1), TICK_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step, done]);

  const tokens = [...PROMPT, ...CONTINUATION.slice(0, step)];
  const current = marks(PROMPT.length, step, cache);
  const total = (withCache: boolean) => {
    let sum = 0;
    for (let s = 1; s <= step; s++) sum += computedAt(PROMPT.length, s, withCache);
    return sum;
  };
  const withCache = total(true);
  const without = total(false);

  const newest = CONTINUATION[step - 1];
  const status =
    step === 0
      ? 'El texto de partida tiene 5 tokens. Pulsa «Siguiente token».'
      : newest === '<fin>'
        ? `Paso ${step}: el modelo escribe el token de fin y se para. Ha procesado ${cache ? withCache : without} posiciones en total.`
        : cache && step > 1
          ? `Paso ${step}: calcula solo el último token y lee de la caché las claves y valores de los ${step + PROMPT.length - 2} anteriores. Escribe «${newest}».`
          : `Paso ${step}: vuelve a pasar por la red los ${PROMPT.length + step - 1} tokens y escribe «${newest}».`;

  const reset = () => {
    setPlaying(false);
    setStep(0);
  };

  return (
    <div class="gl">
      <div class="gl__controls">
        <button
          type="button"
          class="btn btn--primary btn--small"
          disabled={done || playing}
          onClick={() => setStep(step + 1)}
        >
          Siguiente token
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          disabled={done}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? 'Parar' : 'Reproducir'}
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          disabled={step === 0}
          onClick={reset}
        >
          Empezar de nuevo
        </button>
        <label class="gl__toggle">
          <input
            type="checkbox"
            checked={cache}
            onChange={(e) => setCache((e.currentTarget as HTMLInputElement).checked)}
          />
          <span>Con KV cache</span>
        </label>
      </div>

      <ol class="gl__strip" aria-label="Secuencia de tokens y qué hace el modelo con cada uno">
        {tokens.map((t, i) => (
          <li
            key={i}
            class={`gl__tok gl__tok--${current[i]}${i < PROMPT.length ? ' gl__tok--prompt' : ''}`}
          >
            <span class="gl__text">{t}</span>
            <span class="sr-only">, {MARK_LABEL[current[i]]}</span>
          </li>
        ))}
      </ol>

      <ul class="gl__legend" aria-hidden="true">
        <li>
          <span class="gl__swatch gl__swatch--computed" />
          calculado en este paso
        </li>
        <li>
          <span class="gl__swatch gl__swatch--reused" />
          leído de la caché
        </li>
        <li>
          <span class="gl__swatch gl__swatch--output" />
          token recién escrito
        </li>
      </ul>

      <p class="gl__status" role="status" aria-live="polite">
        {status}
      </p>

      <dl class="gl__numbers">
        <div class={cache ? '' : 'gl__number--on'}>
          <dt class="label">Posiciones calculadas sin caché</dt>
          <dd>{without}</dd>
        </div>
        <div class={cache ? 'gl__number--on' : ''}>
          <dt class="label">Con KV cache</dt>
          <dd>{withCache}</dd>
        </div>
        <div>
          <dt class="label">Tokens escritos</dt>
          <dd>{step}</dd>
        </div>
      </dl>
    </div>
  );
}
