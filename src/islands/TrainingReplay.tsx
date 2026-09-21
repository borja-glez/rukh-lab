/**
 * TrainingReplay (lesson M2): the training run replayed checkpoint by checkpoint. A slider walks
 * the checkpoints the run left behind; the chart draws training and validation loss against the
 * left axis and next-move top-1 against the right one, with a marker on the selected step and its
 * numbers underneath. Under the plot, a strip of bars draws the unmasked legality of every
 * checkpoint against the 99 % bar, because that row is the one the lesson asks the reader to watch
 * take off and saturate. Every field but `step` is optional (see `ReplayStep`): a missing one is a
 * dash and a gap in its line (or no bar), never a zero. Data comes from
 * `src/data/training-replay.json`, exported from MLflow by `labs/m2/replay_export.py` and copied
 * here with `pnpm sync:data`; the schema is documented in `src/data/README.md`. Styles live in
 * `src/styles/global.css` (`.tr*`), never inline (CSP); the strip uses SVG presentation
 * attributes with the design tokens, which the CSP allows.
 *
 * With the committed placeholder (empty `steps`) the island renders its "pendiente" state.
 */
import { useId, useMemo, useState } from 'preact/hooks';

/**
 * One checkpoint of the run. Only `step` is guaranteed: `replay_export.py` copies a metric when
 * MLflow logged it at that exact step (with the shipped configs it always does, because
 * `log_every` and `eval_every` divide `ckpt_every`, but the writer does not promise it), and the
 * two measured fields need their own flags (`--with-legality`, `--with-elo`). Everything missing
 * is drawn as a dash and skipped by the polylines.
 */
export interface ReplayStep {
  step: number;
  train_loss?: number | null;
  val_loss?: number | null;
  val_top1?: number | null;
  /** Unmasked **argmax** legality (D-026): the >= 99 % bar, not the sampled rate. */
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

/* The legality strip under the plot: its height and the gap that separates it from the plot. */
export const STRIP = { h: 34, gap: 22 };

/** The `>= 99 %` legality bar of `GOAL.md`, drawn across the strip. */
export const LEGALITY_BAR = 0.99;

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

/**
 * Bounds of the legality strip: the top is pinned to 100 % and the floor is the lowest value
 * rounded down to a multiple of 5 %, capped at 95 % so the strip never collapses to a sliver.
 */
export function legalityBounds(values: number[]): [number, number] {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return [0, 1];
  const low = Math.floor(Math.min(...clean) * 20) / 20;
  return [Math.min(0.95, Math.max(0, low)), 1];
}

/**
 * Round tick values inside `[low, high]`, at most `count` of them, stepping by 1, 2, 2.5 or 5
 * times a power of ten. The extremes are not forced in: the axes label those separately.
 */
export function ticks([low, high]: [number, number], count = 5): number[] {
  const span = high - low;
  if (!(span > 0) || !(count > 0)) return [];
  const power = 10 ** Math.floor(Math.log10(span / count));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => span / s <= count) ?? power * 10;
  const out: number[] = [];
  for (let v = Math.ceil(low / step - 1e-9) * step; v <= high + 1e-9; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

/** Bottom of the plot area: the strip, when drawn, takes its height and gap from the plot. */
export function plotBottom(withStrip: boolean): number {
  return VIEW.h - VIEW.bottom - (withStrip ? STRIP.h + STRIP.gap : 0);
}

/** Maps a value of `[low, high]` to the vertical user units of the plot area. */
export function scaleY(
  value: number,
  [low, high]: [number, number],
  bottom: number = plotBottom(false),
): number {
  const usable = bottom - VIEW.top;
  const ratio = (value - low) / (high - low || 1);
  return VIEW.top + usable * (1 - Math.min(Math.max(ratio, 0), 1));
}

/** Maps an index of `[0, count - 1]` to the horizontal user units of the plot area. */
export function scaleX(index: number, count: number): number {
  const usable = VIEW.w - VIEW.left - VIEW.right;
  return VIEW.left + (count <= 1 ? usable / 2 : (usable * index) / (count - 1));
}

/** `points` attribute of a polyline, skipping the steps whose value is not finite. */
export function polyline(
  values: number[],
  bounds: [number, number],
  bottom: number = plotBottom(false),
): string {
  return values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => Number.isFinite(value))
    .map(({ value, index }) => `${scaleX(index, values.length)},${scaleY(value, bounds, bottom)}`)
    .join(' ');
}

const num = (value: number | null | undefined, digits = 3) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(digits).replace('.', ',')
    : '—';
const pct = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(digits).replace('.', ',')} %`
    : '—';
/** U+202F, the narrow no-break space the lessons put between thousands ("5 000"). */
const NARROW_NBSP = String.fromCharCode(0x202f);

/** Thousands separated with a narrow no-break space, the way the lessons write steps. */
export const stepLabel = (value: number) =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);

/** A series ready for the chart: a missing entry becomes `NaN`, which `polyline` skips. */
const series = (
  steps: readonly ReplayStep[],
  key: 'train_loss' | 'val_loss' | 'val_top1' | 'legality',
) => steps.map((step) => (typeof step[key] === 'number' ? step[key] : Number.NaN));

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
  const selected = Math.min(index, steps.length - 1);
  const current = steps[selected];

  const chart = useMemo(() => {
    const train = series(steps, 'train_loss');
    const val = series(steps, 'val_loss');
    const top1 = series(steps, 'val_top1');
    const legality = series(steps, 'legality');
    const withStrip = legality.some((v) => Number.isFinite(v));
    const bottom = plotBottom(withStrip);
    const lossBounds = range([...train, ...val]);
    const top1Bounds = range(top1);
    const first = steps[0].step;
    const last = steps[steps.length - 1].step;
    const usable = VIEW.w - VIEW.left - VIEW.right;
    const stepX = (value: number) =>
      VIEW.left + (last > first ? (usable * (value - first)) / (last - first) : usable / 2);
    return {
      withStrip,
      bottom,
      lossBounds,
      top1Bounds,
      legalityBounds: legalityBounds(legality),
      legality,
      train: polyline(train, lossBounds, bottom),
      val: polyline(val, lossBounds, bottom),
      top1: polyline(top1, top1Bounds, bottom),
      lossTicks: ticks(lossBounds),
      top1Ticks: ticks(top1Bounds),
      /* Intermediate step ticks only: the two extremes already carry their own label. */
      stepTicks: ticks([first, last])
        .filter((v) => v > first && v < last)
        .map((v) => ({
          value: v,
          x: stepX(v),
        })),
    };
  }, [steps]);

  const x = scaleX(selected, steps.length);
  const bottom = chart.bottom;
  const stripTop = bottom + STRIP.gap;
  const stripBottom = stripTop + STRIP.h;
  const stripY = (value: number) => {
    const [low, high] = chart.legalityBounds;
    const ratio = (value - low) / (high - low || 1);
    return stripBottom - STRIP.h * Math.min(Math.max(ratio, 0), 1);
  };
  const barWidth = Math.min(12, ((VIEW.w - VIEW.left - VIEW.right) / steps.length) * 0.6);

  return (
    <div
      class="tr"
      data-training-replay
      data-state="ready"
      data-steps={steps.length}
      data-step={current.step}
      data-legality-strip={chart.withStrip ? 'on' : 'off'}
    >
      <figure class="tr__figure">
        <svg
          class="tr__svg"
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby={`${base}-title ${base}-desc`}
        >
          <title id={`${base}-title`}>
            Pérdida, exactitud top-1 y legalidad a lo largo del entrenamiento
          </title>
          <desc id={`${base}-desc`}>
            {steps.length} checkpoints, del paso {steps[0].step} al {steps[steps.length - 1].step}.
            {chart.withStrip
              ? ' Debajo de las curvas, una barra por checkpoint con su legalidad sin máscara frente al listón del 99 %.'
              : ''}{' '}
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
          {chart.lossTicks.map((value) => (
            <g key={`loss-${value}`} data-tick="loss">
              <line
                class="tr__axis"
                x1={VIEW.left - 4}
                y1={scaleY(value, chart.lossBounds, bottom)}
                x2={VIEW.left}
                y2={scaleY(value, chart.lossBounds, bottom)}
              />
              <text
                class="tr__tick"
                x={VIEW.left - 6}
                y={scaleY(value, chart.lossBounds, bottom) + 3}
                text-anchor="end"
              >
                {num(value, 2)}
              </text>
            </g>
          ))}
          <text class="tr__tick" x={VIEW.w - VIEW.right + 6} y={VIEW.top + 4}>
            {pct(chart.top1Bounds[1])}
          </text>
          <text class="tr__tick" x={VIEW.w - VIEW.right + 6} y={bottom}>
            {pct(chart.top1Bounds[0])}
          </text>
          {chart.top1Ticks.map((value) => (
            <g key={`top1-${value}`} data-tick="top1">
              <line
                class="tr__axis"
                x1={VIEW.w - VIEW.right}
                y1={scaleY(value, chart.top1Bounds, bottom)}
                x2={VIEW.w - VIEW.right + 4}
                y2={scaleY(value, chart.top1Bounds, bottom)}
              />
              <text
                class="tr__tick"
                x={VIEW.w - VIEW.right + 6}
                y={scaleY(value, chart.top1Bounds, bottom) + 3}
              >
                {pct(value, 0)}
              </text>
            </g>
          ))}
          <text class="tr__tick" x={VIEW.left} y={VIEW.h - 8}>
            paso {stepLabel(steps[0].step)}
          </text>
          <text class="tr__tick" x={VIEW.w - VIEW.right} y={VIEW.h - 8} text-anchor="end">
            paso {stepLabel(steps[steps.length - 1].step)}
          </text>
          {chart.stepTicks.map(({ value, x: tickX }) => (
            <g key={`step-${value}`} data-tick="step">
              <line
                class="tr__axis"
                x1={tickX}
                y1={chart.withStrip ? stripBottom : bottom}
                x2={tickX}
                y2={(chart.withStrip ? stripBottom : bottom) + 4}
              />
              <text class="tr__tick" x={tickX} y={VIEW.h - 8} text-anchor="middle">
                {stepLabel(value)}
              </text>
            </g>
          ))}
          <polyline class="tr__line tr__line--train" points={chart.train} />
          <polyline class="tr__line tr__line--val" points={chart.val} />
          <polyline class="tr__line tr__line--top1" points={chart.top1} />
          {chart.withStrip && (
            <g data-legality-strip>
              <text class="tr__tick" x={VIEW.left} y={stripTop - 6}>
                legalidad sin máscara (argmax)
              </text>
              <line
                class="tr__axis"
                x1={VIEW.left}
                y1={stripBottom}
                x2={VIEW.w - VIEW.right}
                y2={stripBottom}
              />
              <text class="tr__tick" x={VIEW.w - VIEW.right + 6} y={stripTop + 4}>
                {pct(chart.legalityBounds[1], 0)}
              </text>
              <text class="tr__tick" x={VIEW.w - VIEW.right + 6} y={stripBottom}>
                {pct(chart.legalityBounds[0], 0)}
              </text>
              {chart.legality.map((value, i) =>
                Number.isFinite(value) ? (
                  <rect
                    key={`legality-${steps[i].step}`}
                    x={scaleX(i, steps.length) - barWidth / 2}
                    y={stripY(value)}
                    width={barWidth}
                    height={Math.max(0.5, stripBottom - stripY(value))}
                    fill="var(--accent)"
                    fill-opacity={i === selected ? 1 : 0.55}
                    data-legality-bar={steps[i].step}
                  >
                    <title>
                      paso {stepLabel(steps[i].step)}: {pct(value)}
                    </title>
                  </rect>
                ) : null,
              )}
              <line
                class="tr__marker"
                x1={VIEW.left}
                y1={stripY(LEGALITY_BAR)}
                x2={VIEW.w - VIEW.right}
                y2={stripY(LEGALITY_BAR)}
                data-legality-bar-line
              />
              <text
                class="tr__tick"
                x={VIEW.w - VIEW.right - 4}
                y={stripY(LEGALITY_BAR) - 3}
                text-anchor="end"
              >
                listón {pct(LEGALITY_BAR, 0)}
              </text>
            </g>
          )}
          <line
            class="tr__marker"
            x1={x}
            y1={VIEW.top}
            x2={x}
            y2={chart.withStrip ? stripBottom : bottom}
            data-marker
          />
        </svg>
        <figcaption class="caption tr__caption">
          Eje izquierdo: pérdida (entrenamiento y validación). Eje derecho: top-1 de siguiente
          jugada en validación.
          {chart.withStrip
            ? ' Tira inferior: legalidad sin máscara por argmax de cada checkpoint, con el listón del 99 % marcado.'
            : ''}{' '}
          La línea vertical marca el checkpoint seleccionado.
        </figcaption>
      </figure>

      <p class="caption tr__legend">
        <span class="tr__key tr__key--train" aria-hidden="true" /> pérdida de entrenamiento
        <span class="tr__key tr__key--val" aria-hidden="true" /> pérdida de validación
        <span class="tr__key tr__key--top1" aria-hidden="true" /> top-1 de validación
        {chart.withStrip && (
          <>
            {' '}
            <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true" focusable="false">
              <rect x="0" y="2" width="4" height="8" fill="var(--accent)" fill-opacity="0.55" />
              <rect x="5" y="0" width="4" height="10" fill="var(--accent)" fill-opacity="0.55" />
              <rect x="10" y="1" width="4" height="9" fill="var(--accent)" />
            </svg>{' '}
            legalidad sin máscara (barras)
          </>
        )}
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
          value={selected}
          aria-valuetext={`paso ${current.step}, ${selected + 1} de ${steps.length}`}
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
