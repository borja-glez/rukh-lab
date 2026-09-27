/**
 * BackpropByHand (/como-funciona-un-llm/, chapter 8): one training cycle of the smallest chain
 * that has everything, x → ×w1 → ReLU → ×w2 → ŷ, done in three visible steps. Forward computes
 * each value and the error; backward passes the blame link by link with real numbers; adjust moves
 * each weight against its own blame. Repeating the cycle makes the error fall, which the sparkline
 * keeps. The logic is src/lib/llm/backprop.ts; styles are src/styles/llm/backprop-by-hand.css
 * (`.bh*`), never inline (CSP).
 */
import { useState } from 'preact/hooks';
import {
  INPUT,
  LEARNING_RATE,
  START,
  TARGET,
  backward,
  forward,
  update,
  type Backward,
  type Forward,
  type Weights,
} from '../../lib/llm/backprop';
import '../../styles/llm/backprop-by-hand.css';

type Stage = 'inicio' | 'delante' | 'atras' | 'ajustado';

interface State {
  stage: Stage;
  w: Weights;
  /** The weights before the last adjustment, to print "old → new". */
  before: Weights | null;
  f: Forward | null;
  g: Backward | null;
  /** The error measured at each forward pass. */
  history: number[];
}

const INITIAL: State = { stage: 'inicio', w: START, before: null, f: null, g: null, history: [] };

/** Two decimals, Spanish comma, a real minus sign, and never a "−0,00". */
const fmt = (n: number) => {
  const v = Math.abs(n) < 0.005 ? 0 : n;
  return v.toFixed(2).replace('.', ',').replace('-', '−');
};

function goForward(s: State): State {
  const f = forward(s.w);
  return { ...s, stage: 'delante', f, g: null, history: [...s.history, f.loss] };
}

function goBackward(s: State): State {
  return s.f ? { ...s, stage: 'atras', g: backward(s.w, s.f) } : s;
}

function goAdjust(s: State): State {
  return s.g ? { ...s, stage: 'ajustado', before: s.w, w: update(s.w, s.g) } : s;
}

function fullCycle(s: State): State {
  let next = s;
  if (next.stage === 'inicio' || next.stage === 'ajustado') next = goForward(next);
  if (next.stage === 'delante') next = goBackward(next);
  return goAdjust(next);
}

/* Sparkline geometry, in viewBox units. */
const SW = 240;
const SH = 64;
const PAD = 6;

export default function BackpropByHand() {
  const [s, setS] = useState<State>(INITIAL);
  const { f, g, w, before, stage, history } = s;
  const stale = stage === 'ajustado';

  const status = (() => {
    if (stage === 'inicio')
      return `Dos pesos, w₁ = ${fmt(w.w1)} y w₂ = ${fmt(w.w2)}. Pulsa «Hacia delante» para ver qué predice la cadena.`;
    if (stage === 'delante' && f)
      return `Hacia delante: con x = ${fmt(f.x)} la cadena predice ${fmt(f.yhat)} y quería ${fmt(f.y)}. Error: ${fmt(f.loss)}.`;
    if (stage === 'atras' && g)
      return g.relu === 0
        ? `Hacia atrás: la ReLU estaba apagada, así que la culpa no pasa de ella: w₂ carga con ${fmt(g.dw2)} y w₁ con 0.`
        : `Hacia atrás: la culpa sale del error (${fmt(g.dyhat)}) y se multiplica eslabón a eslabón. w₂ carga con ${fmt(g.dw2)} y w₁ con ${fmt(g.dw1)}; el signo negativo dice que hay que subirlos.`;
    if (stage === 'ajustado' && before)
      return `Ajuste: w₁ ${fmt(before.w1)} → ${fmt(w.w1)}, w₂ ${fmt(before.w2)} → ${fmt(w.w2)}. Ve otra vez hacia delante para ver si el error ha bajado.`;
    return '';
  })();

  const max = Math.max(...history, 0.01);
  const sx = (i: number) =>
    history.length < 2 ? SW / 2 : PAD + (i / (history.length - 1)) * (SW - 2 * PAD);
  const sy = (l: number) => PAD + (1 - l / max) * (SH - 2 * PAD);
  const points = history.map((l, i) => `${sx(i).toFixed(1)},${sy(l).toFixed(1)}`).join(' ');
  const last = history[history.length - 1];

  const value = (n: number | undefined) => (n === undefined ? '—' : fmt(n));

  return (
    <div class="bh">
      <div class="bh__actions">
        <button
          type="button"
          class="btn btn--primary btn--small"
          disabled={!(stage === 'inicio' || stage === 'ajustado')}
          onClick={() => setS(goForward(s))}
        >
          1 · Hacia delante
        </button>
        <button
          type="button"
          class="btn btn--primary btn--small"
          disabled={stage !== 'delante'}
          onClick={() => setS(goBackward(s))}
        >
          2 · Hacia atrás
        </button>
        <button
          type="button"
          class="btn btn--primary btn--small"
          disabled={stage !== 'atras'}
          onClick={() => setS(goAdjust(s))}
        >
          3 · Ajustar
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          onClick={() => setS(fullCycle(s))}
        >
          Ciclo completo
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          disabled={stage === 'inicio'}
          onClick={() => setS(INITIAL)}
        >
          Empezar de nuevo
        </button>
      </div>

      <p class="bh__status" role="status" aria-live="polite">
        {status}
      </p>

      <div class="bh__section">
        <p class="label">1 · Hacia delante: la señal</p>
        <ol class="bh__chain" aria-label="La cadena, de la entrada a la predicción">
          <li class="bh__cell">
            <span class="bh__name">x · entrada</span>
            <span class="bh__value">{fmt(INPUT)}</span>
          </li>
          <li class="bh__cell bh__cell--weight">
            <span class="bh__name">× w₁</span>
            <span class="bh__value">{fmt(w.w1)}</span>
          </li>
          <li class="bh__cell" data-stale={stale ? '' : undefined}>
            <span class="bh__name">z</span>
            <span class="bh__value">{value(f?.z)}</span>
          </li>
          <li class="bh__cell bh__cell--op">
            <span class="bh__name">ReLU</span>
            <span class="bh__value">{f ? (f.z > 0 ? 'pasa' : 'a 0') : '—'}</span>
          </li>
          <li class="bh__cell" data-stale={stale ? '' : undefined}>
            <span class="bh__name">h</span>
            <span class="bh__value">{value(f?.h)}</span>
          </li>
          <li class="bh__cell bh__cell--weight">
            <span class="bh__name">× w₂</span>
            <span class="bh__value">{fmt(w.w2)}</span>
          </li>
          <li class="bh__cell bh__cell--out" data-stale={stale ? '' : undefined}>
            <span class="bh__name">ŷ · predice</span>
            <span class="bh__value">{value(f?.yhat)}</span>
          </li>
          <li class="bh__cell">
            <span class="bh__name">y · quería</span>
            <span class="bh__value">{fmt(TARGET)}</span>
          </li>
          <li class="bh__cell bh__cell--error" data-stale={stale ? '' : undefined}>
            <span class="bh__name">error</span>
            <span class="bh__value">{value(f?.loss)}</span>
          </li>
        </ol>
        {stale && (
          <p class="bh__stale">
            Los valores tachados son de la pasada anterior: los pesos ya han cambiado. Pulsa «Hacia
            delante» para recalcularlos con los nuevos.
          </p>
        )}
        <p class="bh__note caption">
          Error = la mitad de (ŷ − y) al cuadrado: el cuadrado lo hace siempre positivo y castiga
          más los fallos grandes.
        </p>
      </div>

      <div class="bh__section">
        <p class="label">2 · Hacia atrás: la culpa, eslabón a eslabón</p>
        {g && f ? (
          <ol class="bh__blame">
            <li>
              <span class="bh__what">en ŷ</span>
              <span>
                ŷ − y = {fmt(f.yhat)} − {fmt(f.y)} = <strong>{fmt(g.dyhat)}</strong>
              </span>
            </li>
            <li class="bh__blame-weight">
              <span class="bh__what">en w₂</span>
              <span>
                {fmt(g.dyhat)} × h ({fmt(f.h)}) = <strong>{fmt(g.dw2)}</strong>
              </span>
            </li>
            <li>
              <span class="bh__what">en h</span>
              <span>
                {fmt(g.dyhat)} × w₂ ({fmt(stale && before ? before.w2 : w.w2)}) ={' '}
                <strong>{fmt(g.dh)}</strong>
              </span>
            </li>
            <li>
              <span class="bh__what">por la ReLU</span>
              <span>
                × {g.relu} ({g.relu ? 'dejó pasar' : 'estaba apagada'}) ={' '}
                <strong>{fmt(g.dz)}</strong>
              </span>
            </li>
            <li class="bh__blame-weight">
              <span class="bh__what">en w₁</span>
              <span>
                {fmt(g.dz)} × x ({fmt(f.x)}) = <strong>{fmt(g.dw1)}</strong>
              </span>
            </li>
          </ol>
        ) : (
          <p class="bh__empty">Aún no: primero hay que ir hacia delante y medir el error.</p>
        )}
      </div>

      <div class="bh__grid">
        <div class="bh__section">
          <p class="label">3 · Ajustar: cada peso contra su culpa</p>
          {stage === 'ajustado' && before && g ? (
            <ul class="bh__adjust">
              <li>
                w₁: {fmt(before.w1)} − {fmt(LEARNING_RATE)} × ({fmt(g.dw1)}) ={' '}
                <strong>{fmt(w.w1)}</strong>
              </li>
              <li>
                w₂: {fmt(before.w2)} − {fmt(LEARNING_RATE)} × ({fmt(g.dw2)}) ={' '}
                <strong>{fmt(w.w2)}</strong>
              </li>
            </ul>
          ) : (
            <p class="bh__empty">
              Cuando haya culpas, cada peso se moverá {fmt(LEARNING_RATE)} veces su culpa, en
              sentido contrario.
            </p>
          )}
        </div>

        <div class="bh__section">
          <p class="label">El error en cada ciclo</p>
          <svg
            class="bh__spark"
            viewBox={`0 0 ${SW} ${SH}`}
            role="img"
            aria-label={
              history.length === 0
                ? 'Todavía no hay ningún error medido.'
                : `Error medido en cada pasada hacia delante: ${history.map(fmt).join(', ')}.`
            }
          >
            <line class="bh__spark-axis" x1={PAD} x2={SW - PAD} y1={SH - PAD} y2={SH - PAD} />
            {history.length > 1 && <polyline class="bh__spark-line" points={points} fill="none" />}
            {history.map((l, i) => (
              <circle class="bh__spark-dot" cx={sx(i)} cy={sy(l)} r="3" />
            ))}
          </svg>
          <p class="bh__spark-label caption">
            {history.length === 0
              ? 'Cada pasada hacia delante añade un punto.'
              : `${history.length} ${history.length === 1 ? 'pasada' : 'pasadas'} · último error ${fmt(last)}`}
          </p>
        </div>
      </div>
    </div>
  );
}
