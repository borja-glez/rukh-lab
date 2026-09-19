/**
 * ValueBar (lesson M3): one game seen through two evaluations. The chart draws the encoder's value
 * head and Stockfish's score on the same bounded `tanh(cp/400)` axis, ply by ply, marks the plies
 * the `blunder` head flagged as a mistake, and a scrubber walks the game while the bar on top shows
 * the selected ply's advantage. Data comes from `src/data/value-bar.json`, exported by
 * `labs/m3/value_bar_export.py` and copied here with `pnpm sync:data`; the schema is documented in
 * `src/data/README.md`. Styles live in `src/styles/global.css` (`.vb*`), never inline (CSP).
 *
 * The sign never depends on colour: the readout says whose advantage it is in words, the bar
 * carries a centre line with a text label at each end, and every flagged ply is also listed as
 * text. Two curves that differ only by hue would be unreadable for a good part of the audience.
 *
 * With the committed placeholder (empty `series`) the island renders its "pendiente" state: the
 * lesson ships before the fine-tuning run that produces the real curves, and an invented pair of
 * curves would teach exactly the opposite of what this module is about.
 */
import { useId, useMemo, useState } from 'preact/hooks';

/** One played ply. `encoder` and `stockfish` are optional: a missing one is skipped, never a zero. */
export interface ValuePoint {
  ply: number;
  encoder?: number | null;
  stockfish?: number | null;
  blunder?: boolean;
}

export interface ValueBarData {
  schema?: string;
  game: { moves: string[]; san: string[] };
  series: ValuePoint[];
  meta: {
    model?: string | null;
    checkpoint?: string | null;
    white?: string | null;
    black?: string | null;
    event?: string | null;
    result?: string | null;
    value_scale?: number | null;
    threshold?: number | null;
    generated: string | null;
    [key: string]: unknown;
  };
}

/* Chart geometry in user units; the SVG scales to the container width. */
export const VIEW = { w: 680, h: 220, left: 40, right: 16, top: 12, bottom: 26 };

/* The value axis is fixed, not fitted: both series are `tanh(cp/400)`, so they live in [-1, 1]
 * by construction and a fitted axis would silently exaggerate a flat game into a dramatic one. */
export const DOMAIN: [number, number] = [-1, 1];

/* Geometry of the advantage bar under the chart, in its own user units. */
export const BAR = { w: 680, h: 26 };

const files = import.meta.glob<ValueBarData>('../data/value-bar.json', {
  eager: true,
  import: 'default',
});
const data: ValueBarData | undefined = Object.values(files)[0];

/** A payload is usable when it has at least one played ply. */
export function isReady(value: ValueBarData | undefined): value is ValueBarData {
  return Boolean(value && value.game && Array.isArray(value.series) && value.series.length > 0);
}

/** Maps a value of `[-1, 1]` to the vertical user units of the plot area. */
export function scaleY(value: number): number {
  const usable = VIEW.h - VIEW.top - VIEW.bottom;
  const ratio = (value - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0]);
  return VIEW.top + usable * (1 - Math.min(Math.max(ratio, 0), 1));
}

/** Maps an index of `[0, count - 1]` to the horizontal user units of the plot area. */
export function scaleX(index: number, count: number): number {
  const usable = VIEW.w - VIEW.left - VIEW.right;
  return VIEW.left + (count <= 1 ? usable / 2 : (usable * index) / (count - 1));
}

/** `points` attribute of a polyline, skipping the plies whose value is not finite. */
export function polyline(values: number[]): string {
  return values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => Number.isFinite(value))
    .map(({ value, index }) => `${scaleX(index, values.length)},${scaleY(value)}`)
    .join(' ');
}

/** A series ready for the chart: a missing entry becomes `NaN`, which `polyline` skips. */
export function series(points: readonly ValuePoint[], key: 'encoder' | 'stockfish'): number[] {
  return points.map((point) => (typeof point[key] === 'number' ? point[key] : Number.NaN));
}

/** Indices of the plies the encoder flagged as a blunder. */
export function flagged(points: readonly ValuePoint[]): number[] {
  return points.map((point, index) => (point.blunder ? index : -1)).filter((index) => index >= 0);
}

/** Whose advantage a value is, in words: the sign must never depend on colour alone. */
export function advantage(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'sin valorar';
  if (value > 0.05) return 'ventaja de las blancas';
  if (value < -0.05) return 'ventaja de las negras';
  return 'posición igualada';
}

/** `1. e4` / `1... e5`: the move number a ply belongs to, in the notation a player reads. */
export function moveLabel(ply: number): string {
  return `${Math.floor((ply - 1) / 2) + 1}${ply % 2 === 1 ? '.' : '...'}`;
}

const num = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  // Rounded first, and `-0` folded into `0`: `−0,00` would hand the advantage to a side that
  // does not have it. The demo's bar guards the same way (`formatValue` in rukh-web's EvalBar).
  const rounded = Math.round(value * 100) / 100;
  const shown = Object.is(rounded, -0) ? 0 : rounded;
  return `${shown > 0 ? '+' : ''}${shown.toFixed(2)}`.replace('.', ',').replace('-', '−');
};

function Pending() {
  return (
    <div class="vb vb--pending" data-value-bar data-state="pending">
      <p class="vb__pending-main">
        Pendiente: las dos curvas de evaluación se dibujan con <code>src/data/value-bar.json</code>,
        que genera <code>labs/m3/value_bar_export.py</code> sobre un checkpoint real de las cabezas
        y llega aquí con <code>pnpm sync:data</code>.
      </p>
      <p class="caption vb__pending-note">
        Lo que se mira en esta isla es exactamente dónde se separa el encoder de Stockfish y qué
        jugadas marca como error. Dos curvas inventadas responderían a esa pregunta con una mentira,
        así que hasta que el afinado real termine aquí no hay gráfico.
      </p>
    </div>
  );
}

function Chart({ source }: { source: ValueBarData }) {
  const base = useId();
  const points = source.series;
  const [index, setIndex] = useState(0);
  const current = points[Math.min(index, points.length - 1)];
  const position = Math.min(index, points.length - 1);

  const chart = useMemo(
    () => ({
      encoder: polyline(series(points, 'encoder')),
      stockfish: polyline(series(points, 'stockfish')),
      blunders: flagged(points),
    }),
    [points],
  );

  const x = scaleX(position, points.length);
  const bottom = VIEW.h - VIEW.bottom;
  const zero = scaleY(0);
  const san = source.game.san[position] ?? source.game.moves[position] ?? '—';
  const uci = source.game.moves[position] ?? '—';
  const value = typeof current.encoder === 'number' ? current.encoder : null;
  const gap =
    typeof current.encoder === 'number' && typeof current.stockfish === 'number'
      ? current.encoder - current.stockfish
      : null;
  const players = `${source.meta.white ?? 'blancas sin identificar'} – ${
    source.meta.black ?? 'negras sin identificar'
  }`;
  /* Bar geometry: the fill grows from the centre towards the side that is better. */
  const half = BAR.w / 2;
  const width = value === null ? 0 : Math.abs(value) * half;
  const left = value === null ? half : value >= 0 ? half : half - width;

  return (
    <div
      class="vb"
      data-value-bar
      data-state="ready"
      data-ply={current.ply}
      data-plies={points.length}
      data-blunder={current.blunder ? 'true' : 'false'}
    >
      <div class="vb__bar-wrap">
        <svg
          class="vb__bar"
          viewBox={`0 0 ${BAR.w} ${BAR.h}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Valor del encoder en el ply ${current.ply}: ${num(value)}, ${advantage(value)}.`}
        >
          <rect class="vb__bar-track" x="0" y="0" width={BAR.w} height={BAR.h} />
          <rect class="vb__bar-fill" x={left} y="0" width={width} height={BAR.h} data-fill />
          <line class="vb__bar-zero" x1={half} y1="0" x2={half} y2={BAR.h} />
        </svg>
        <p class="caption vb__bar-legend">
          <span class="vb__bar-end">← negras</span>
          <span class="vb__bar-mid">igualada</span>
          <span class="vb__bar-end">blancas →</span>
        </p>
      </div>

      <figure class="vb__figure">
        <svg
          class="vb__svg"
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby={`${base}-title ${base}-desc`}
        >
          <title id={`${base}-title`}>
            Valor de la posición según el encoder y según Stockfish, ply a ply
          </title>
          <desc id={`${base}-desc`}>
            {points.length} medias jugadas en la escala acotada tanh(cp/400), de −1 (ganan las
            negras) a +1 (ganan las blancas). Los valores exactos del ply seleccionado están en la
            lista que sigue al gráfico, y los plies marcados como error están enumerados debajo.
          </desc>
          <line class="vb__axis" x1={VIEW.left} y1={VIEW.top} x2={VIEW.left} y2={bottom} />
          <line class="vb__axis" x1={VIEW.left} y1={bottom} x2={VIEW.w - VIEW.right} y2={bottom} />
          <line class="vb__zero" x1={VIEW.left} y1={zero} x2={VIEW.w - VIEW.right} y2={zero} />
          <text class="vb__tick" x={VIEW.left - 6} y={VIEW.top + 4} text-anchor="end">
            +1
          </text>
          <text class="vb__tick" x={VIEW.left - 6} y={zero + 4} text-anchor="end">
            0
          </text>
          <text class="vb__tick" x={VIEW.left - 6} y={bottom} text-anchor="end">
            −1
          </text>
          <text class="vb__tick" x={VIEW.left} y={VIEW.h - 8}>
            ply {points[0].ply}
          </text>
          <text class="vb__tick" x={VIEW.w - VIEW.right} y={VIEW.h - 8} text-anchor="end">
            ply {points[points.length - 1].ply}
          </text>
          {chart.blunders.map((flag) => (
            <line
              key={`flag-${flag}`}
              class="vb__flag"
              x1={scaleX(flag, points.length)}
              y1={VIEW.top}
              x2={scaleX(flag, points.length)}
              y2={bottom}
              data-flag={points[flag].ply}
            />
          ))}
          <polyline class="vb__line vb__line--stockfish" points={chart.stockfish} />
          <polyline class="vb__line vb__line--encoder" points={chart.encoder} />
          <line class="vb__marker" x1={x} y1={VIEW.top} x2={x} y2={bottom} data-marker />
        </svg>
        <figcaption class="caption vb__caption">
          Eje vertical: valor de la posición desde el punto de vista de las blancas, en la escala
          acotada <code>tanh(cp/400)</code>. Línea continua, el encoder; línea de trazos, Stockfish.
          Las verticales punteadas son los plies que la cabeza <code>blunder</code> marca como
          error, y están enumerados en texto debajo del deslizador.
        </figcaption>
      </figure>

      <p class="caption vb__legend">
        <span class="vb__key vb__key--encoder" aria-hidden="true" /> encoder (cabeza de valor)
        <span class="vb__key vb__key--stockfish" aria-hidden="true" /> Stockfish (<code>cp</code>{' '}
        convertido a la misma escala)
        <span class="vb__key vb__key--flag" aria-hidden="true" /> error marcado por el encoder
      </p>

      <div class="vb__control">
        <label class="label" for={`${base}-slider`}>
          Media jugada (ply)
        </label>
        <input
          id={`${base}-slider`}
          class="vb__slider"
          type="range"
          min={0}
          max={points.length - 1}
          step={1}
          value={position}
          aria-valuetext={`ply ${current.ply}, ${moveLabel(current.ply)} ${san}, ${advantage(value)}`}
          onInput={(e) => setIndex(Number((e.currentTarget as HTMLInputElement).value))}
        />
      </div>

      <p class="vb__readout" data-readout role="status">
        <strong>
          {moveLabel(current.ply)} {san}
        </strong>{' '}
        (<code>{uci}</code>, ply {current.ply}): {advantage(value)}, {num(value)} según el encoder y{' '}
        {num(current.stockfish)} según Stockfish.{' '}
        {current.blunder
          ? 'El encoder marca esta jugada como error.'
          : 'El encoder no marca esta jugada como error.'}
      </p>

      <dl class="vb__numbers" data-numbers>
        <div class="vb__number">
          <dt class="label">Ply</dt>
          <dd class="mono" data-field="ply">
            {current.ply}
          </dd>
        </div>
        <div class="vb__number">
          <dt class="label">Encoder</dt>
          <dd class="mono" data-field="encoder">
            {num(value)}
          </dd>
        </div>
        <div class="vb__number">
          <dt class="label">Stockfish</dt>
          <dd class="mono" data-field="stockfish">
            {num(current.stockfish)}
          </dd>
        </div>
        <div class="vb__number">
          <dt class="label">Diferencia</dt>
          <dd class="mono" data-field="gap">
            {num(gap)}
          </dd>
        </div>
      </dl>

      <p class="caption vb__flags" data-flags>
        {chart.blunders.length > 0 ? (
          <>
            Errores marcados por el encoder:{' '}
            {chart.blunders
              .map((flag) => {
                const label = source.game.san[flag] ?? source.game.moves[flag] ?? '?';
                return `${moveLabel(points[flag].ply)} ${label}`;
              })
              .join(' · ')}
          </>
        ) : (
          'El encoder no marca ninguna jugada de esta partida como error.'
        )}
      </p>

      <p class="caption vb__meta">
        {players}
        {source.meta.event ? `, ${source.meta.event}` : ''} · {source.meta.result ?? '—'} ·{' '}
        {source.meta.model ?? 'modelo sin identificar'} · checkpoint{' '}
        {source.meta.checkpoint ?? 'sin identificar'} · generado{' '}
        {source.meta.generated ?? 'sin fecha'}
      </p>
    </div>
  );
}

export default function ValueBar() {
  return isReady(data) ? <Chart source={data} /> : <Pending />;
}
