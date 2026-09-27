/**
 * ToyTraining (/como-funciona-un-llm/, chapter 8): train a character-level bigram model in the
 * browser and watch the loss fall from ln(V) towards the best a bigram can do, while a sample
 * written by the current model turns from noise into Spanish-looking syllables. The logic is
 * src/lib/llm/toy-train.ts; styles are src/styles/llm/toy-training.css (`.tt*`), never inline (CSP).
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  LEARNING_RATE,
  bestLoss,
  createModel,
  loss,
  sample,
  trainStep,
  type ToyModel,
} from '../../lib/llm/toy-train';
import '../../styles/llm/toy-training.css';

const MAX_STEPS = 300;
const STEPS_PER_TICK = 2;
const TICK_MS = 30;
const SAMPLE_LENGTH = 72;
const SAMPLE_SEED = 11;

/* Loss curve geometry, in viewBox units. */
const W = 320;
const H = 150;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 14;
const PAD_B = 18;

const fmt = (x: number) => x.toFixed(2).replace('.', ',');

export default function ToyTraining() {
  const model = useRef<ToyModel>(createModel());
  const [history, setHistory] = useState<number[]>(() => [loss(model.current)]);
  const [text, setText] = useState(() => sample(model.current, SAMPLE_LENGTH, SAMPLE_SEED));
  const [running, setRunning] = useState(false);

  const vocabSize = model.current.vocab.length;
  const start = Math.log(vocabSize);
  const best = useMemo(() => bestLoss(model.current), []);
  const step = history.length - 1;
  const current = history[history.length - 1];
  const done = step >= MAX_STEPS;

  const advance = (n: number) => {
    const m = model.current;
    const added: number[] = [];
    for (let i = 0; i < n && m.step < MAX_STEPS; i++) {
      trainStep(m, LEARNING_RATE);
      added.push(loss(m));
    }
    if (added.length === 0) return;
    setHistory((h) => [...h, ...added]);
    /* A new sample every ten steps is enough to see it change without flicker. */
    if (n === 1 || m.step % 10 < n || m.step >= MAX_STEPS)
      setText(sample(m, SAMPLE_LENGTH, SAMPLE_SEED));
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (model.current.step >= MAX_STEPS) {
        setRunning(false);
        return;
      }
      advance(STEPS_PER_TICK);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const reset = () => {
    setRunning(false);
    model.current = createModel();
    setHistory([loss(model.current)]);
    setText(sample(model.current, SAMPLE_LENGTH, SAMPLE_SEED));
  };

  const top = start + 0.15;
  const bottom = best - 0.2;
  const x = (s: number) => PAD_L + (s / MAX_STEPS) * (W - PAD_L - PAD_R);
  const y = (l: number) => PAD_T + ((top - l) / (top - bottom)) * (H - PAD_T - PAD_B);
  const points = history.map((l, s) => `${x(s).toFixed(1)},${y(l).toFixed(1)}`).join(' ');

  const status = done
    ? `Entrenamiento terminado: ${MAX_STEPS} pasos, pérdida ${fmt(current)}. Empezó en ${fmt(start)}.`
    : step === 0
      ? `Modelo recién creado: pérdida ${fmt(current)}, la de adivinar al azar entre ${vocabSize} caracteres.`
      : `Paso ${step}: pérdida ${fmt(current)}.`;

  return (
    <div class="tt">
      <div class="tt__actions">
        <button
          type="button"
          class="btn btn--primary btn--small"
          disabled={done}
          onClick={() => setRunning(!running)}
        >
          {running ? 'Pausar' : 'Entrenar'}
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          disabled={done || running}
          onClick={() => advance(1)}
        >
          Un paso
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          disabled={step === 0}
          onClick={reset}
        >
          Empezar de nuevo
        </button>
      </div>

      <p class="tt__status" role="status" aria-live="polite">
        {running ? `Entrenando… paso ${step} de ${MAX_STEPS}.` : status}
      </p>

      <div class="tt__grid">
        <div class="tt__panel">
          <p class="label">Pérdida en cada paso</p>
          <svg
            class="tt__curve"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Curva de pérdida: empieza en ${fmt(start)}, la de adivinar al azar, y va bajando hacia ${fmt(best)}, lo mejor que puede hacer un modelo que solo mira el carácter anterior. Ahora está en ${fmt(current)} tras ${step} pasos.`}
          >
            <line class="tt__ref" x1={PAD_L} x2={W - PAD_R} y1={y(start)} y2={y(start)} />
            <text class="tt__ref-label" x={W - PAD_R} y={y(start) - 4} text-anchor="end">
              al azar: ln {vocabSize} ≈ {fmt(start)}
            </text>
            <line
              class="tt__ref tt__ref--best"
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(best)}
              y2={y(best)}
            />
            <text class="tt__ref-label" x={W - PAD_R} y={y(best) + 12} text-anchor="end">
              lo mejor de un bigrama ≈ {fmt(best)}
            </text>
            <polyline class="tt__line" points={points} fill="none" />
            <circle class="tt__dot" cx={x(step)} cy={y(current)} r="3.5" />
            <text class="tt__axis" x={PAD_L} y={H - 4}>
              paso 0
            </text>
            <text class="tt__axis" x={W - PAD_R} y={H - 4} text-anchor="end">
              {MAX_STEPS}
            </text>
          </svg>
        </div>

        <div class="tt__panel">
          <p class="label">Lo que escribe el modelo ahora</p>
          <p class="tt__sample">{text}</p>
          <dl class="tt__numbers">
            <div>
              <dt class="label">Paso</dt>
              <dd>{step}</dd>
            </div>
            <div>
              <dt class="label">Pérdida</dt>
              <dd>{fmt(current)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
