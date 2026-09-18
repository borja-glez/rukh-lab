/**
 * TrainingReplay (lesson M2): the training run replayed checkpoint by checkpoint. A slider walks
 * the evaluated steps; the chart draws training and validation loss against the left axis and
 * next-move top-1 against the right one, with a marker on the selected step and its numbers
 * underneath. Data comes from `src/data/training-replay.json`, exported from MLflow by
 * `labs/m2/replay_export.py` and copied here with `pnpm sync:data`; the schema is documented in
 * `src/data/README.md`. Styles live in `src/styles/global.css` (`.tr*`), never inline (CSP).
 *
 * With the committed placeholder (empty `steps`) the island renders its "pendiente" state.
 */
import { useId, useMemo, useState } from 'preact/hooks';

export interface ReplayStep {
  step: number;
  train_loss: number;
  val_loss: number;
  val_top1: number;
  /** Optional: only the checkpoints that were evaluated with `rukh eval` carry these. */
  legality?: number | null;
  elo?: number | null;
}

export interface ReplayData {
  schema?: string;
  steps: ReplayStep[];
  meta: {
    run?: string | null;
    preset?: string | null;
    max_steps?: number | null;
    generated: string | null;
    [key: string]: unknown;
  };
}

/* Chart geometry in user units; the SVG scales to the container width. */
export const VIEW = { w: 680, h: 240, left: 46, right: 46, top: 14, bottom: 30 };

const files = import.meta.glob<ReplayData>('../data/training-replay.json', {
  eager: true,
  import: 'default',
});
const data: ReplayData | undefined = Object.values(files)[0];

export function isReady(value: ReplayData | undefined): value is ReplayData {
  return Boolean(value && value.steps.length > 0);
}

/** Inclusive range of a numeric series, padded so a flat series still draws inside the box. */
export function range(values: number[]): [number, number] {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return [0, 1];
  const low = Math.min(...clean);
  const high = Math.max(...clean);
  if (high - low < 1e-9) return [low - 0.5, high + 0.5];
  const pad = (high - low) * 0.08;
  return [low - pad, high + pad];
}

/** Maps a value of `[low, high]` to the vertical user units of the plot area. */
export function scaleY(value: number, [low, high]: [number, number]): number {
  const usable = VIEW.h - VIEW.top - VIEW.bottom;
  const ratio = (value - low) / (high - low || 1);
  return VIEW.top + usable * (1 - Math.min(Math.max(ratio, 0), 1));
}

/** Maps an index of `[0, count - 1]` to the horizontal user units of the plot area. */
export function scaleX(index: number, count: number): number {
  const usable = VIEW.w - VIEW.left - VIEW.right;
  return VIEW.left + (count <= 1 ? usable / 2 : (usable * index) / (count - 1));
}

/** `points` attribute of a polyline, skipping the steps whose value is not finite. */
export function polyline(values: number[], bounds: [number, number]): string {
  return values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => Number.isFinite(value))
    .map(({ value, index }) => `${scaleX(index, values.length)},${scaleY(value, bounds)}`)
    .join(' ');
}

const num = (value: number, digits = 3) =>
  Number.isFinite(value) ? value.toFixed(digits).replace('.', ',') : '—';
const pct = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(1).replace('.', ',')} %`
    : '—';

function Pending() {
  return (
    <div class="tr tr--pending" data-training-replay data-state="pending">
      <p class="tr__pending-main">
        Pendiente: la repetición del entrenamiento se dibuja con{' '}
        <code>src/data/training-replay.json</code>, que exporta{' '}
        <code>labs/m2/replay_export.py</code> desde MLflow cuando el entrenamiento real haya
        terminado, y llega aquí con <code>pnpm sync:data</code>.
      </p>
      <p class="caption tr__pending-note">
        La curva de una tirada inventada es fácil de dibujar y no enseña nada: lo que se mira aquí
        (dónde deja de bajar la validación, cuándo despega la legalidad) solo tiene sentido con
        números medidos.
      </p>
    </div>
  );
}

function Chart({ source }: { source: ReplayData }) {
  const base = useId();
  const steps = source.steps;
  const [index, setIndex] = useState(steps.length - 1);
  const current = steps[Math.min(index, steps.length - 1)];

  const chart = useMemo(() => {
    const train = steps.map((s) => s.train_loss);
    const val = steps.map((s) => s.val_loss);
    const top1 = steps.map((s) => s.val_top1);
    const lossBounds = range([...train, ...val]);
    const top1Bounds = range(top1);
    return {
      lossBounds,
      top1Bounds,
      train: polyline(train, lossBounds),
      val: polyline(val, lossBounds),
      top1: polyline(top1, top1Bounds),
    };
  }, [steps]);

  const x = scaleX(Math.min(index, steps.length - 1), steps.length);
  const bottom = VIEW.h - VIEW.bottom;

  return (
    <div
      class="tr"
      data-training-replay
      data-state="ready"
      data-steps={steps.length}
      data-step={current.step}
    >
      <figure class="tr__figure">
        <svg
          class="tr__svg"
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby={`${base}-title ${base}-desc`}
        >
          <title id={`${base}-title`}>Pérdida y exactitud top-1 a lo largo del entrenamiento</title>
          <desc id={`${base}-desc`}>
            {steps.length} checkpoints, del paso {steps[0].step} al {steps[steps.length - 1].step}.
            Los valores exactos del checkpoint seleccionado están en la lista que sigue al gráfico.
          </desc>
          <line class="tr__axis" x1={VIEW.left} y1={VIEW.top} x2={VIEW.left} y2={bottom} />
          <line
            class="tr__axis"
            x1={VIEW.w - VIEW.right}
            y1={VIEW.top}
            x2={VIEW.w - VIEW.right}
            y2={bottom}
          />
          <line class="tr__axis" x1={VIEW.left} y1={bottom} x2={VIEW.w - VIEW.right} y2={bottom} />
          <text class="tr__tick" x={VIEW.left - 6} y={VIEW.top + 4} text-anchor="end">
            {num(chart.lossBounds[1], 2)}
          </text>
          <text class="tr__tick" x={VIEW.left - 6} y={bottom} text-anchor="end">
            {num(chart.lossBounds[0], 2)}
          </text>
          <text class="tr__tick" x={VIEW.w - VIEW.right + 6} y={VIEW.top + 4}>
            {pct(chart.top1Bounds[1])}
          </text>
          <text class="tr__tick" x={VIEW.w - VIEW.right + 6} y={bottom}>
            {pct(chart.top1Bounds[0])}
          </text>
          <text class="tr__tick" x={VIEW.left} y={VIEW.h - 8}>
            paso {steps[0].step}
          </text>
          <text class="tr__tick" x={VIEW.w - VIEW.right} y={VIEW.h - 8} text-anchor="end">
            paso {steps[steps.length - 1].step}
          </text>
          <polyline class="tr__line tr__line--train" points={chart.train} />
          <polyline class="tr__line tr__line--val" points={chart.val} />
          <polyline class="tr__line tr__line--top1" points={chart.top1} />
          <line class="tr__marker" x1={x} y1={VIEW.top} x2={x} y2={bottom} data-marker />
        </svg>
        <figcaption class="caption tr__caption">
          Eje izquierdo: pérdida (entrenamiento y validación). Eje derecho: top-1 de siguiente
          jugada en validación. La línea vertical marca el checkpoint seleccionado.
        </figcaption>
      </figure>

      <p class="caption tr__legend">
        <span class="tr__key tr__key--train" aria-hidden="true" /> pérdida de entrenamiento
        <span class="tr__key tr__key--val" aria-hidden="true" /> pérdida de validación
        <span class="tr__key tr__key--top1" aria-hidden="true" /> top-1 de validación
      </p>

      <div class="tr__control">
        <label class="label" for={`${base}-slider`}>
          Checkpoint
        </label>
        <input
          id={`${base}-slider`}
          class="tr__slider"
          type="range"
          min={0}
          max={steps.length - 1}
          step={1}
          value={Math.min(index, steps.length - 1)}
          aria-valuetext={`paso ${current.step}, ${Math.min(index, steps.length - 1) + 1} de ${steps.length}`}
          onInput={(e) => setIndex(Number((e.currentTarget as HTMLInputElement).value))}
        />
      </div>

      <dl class="tr__numbers" data-numbers>
        <div class="tr__number">
          <dt class="label">Paso</dt>
          <dd class="mono" data-field="step">
            {current.step}
          </dd>
        </div>
        <div class="tr__number">
          <dt class="label">Pérdida (train)</dt>
          <dd class="mono" data-field="train_loss">
            {num(current.train_loss)}
          </dd>
        </div>
        <div class="tr__number">
          <dt class="label">Pérdida (val)</dt>
          <dd class="mono" data-field="val_loss">
            {num(current.val_loss)}
          </dd>
        </div>
        <div class="tr__number">
          <dt class="label">Top-1 (val)</dt>
          <dd class="mono" data-field="val_top1">
            {pct(current.val_top1)}
          </dd>
        </div>
        <div class="tr__number">
          <dt class="label">Legalidad sin máscara</dt>
          <dd class="mono" data-field="legality">
            {pct(current.legality)}
          </dd>
        </div>
        <div class="tr__number">
          <dt class="label">Elo estimado</dt>
          <dd class="mono" data-field="elo">
            {typeof current.elo === 'number' ? Math.round(current.elo) : '—'}
          </dd>
        </div>
      </dl>

      <p class="caption tr__meta">
        {source.meta.run ?? 'run sin identificar'} · preset {source.meta.preset ?? '—'} ·{' '}
        {steps.length} checkpoints · generado {source.meta.generated ?? 'sin fecha'}
      </p>
    </div>
  );
}

export default function TrainingReplay() {
  return isReady(data) ? <Chart source={data} /> : <Pending />;
}
