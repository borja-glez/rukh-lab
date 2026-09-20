/**
 * EloDial (lesson M4): the acceptance criterion of P4, drawn.
 *
 * The criterion is "Elo by condition monotonic, 1500 < 2000 < 2400, with intervals", and it is
 * two claims that a table of numbers hides. The point estimates can rise while the confidence
 * intervals sit on top of each other, which is not evidence of anything — it is how a 32-game
 * trial once read as a win for `<2600>` and had to be taken back at 160 games (D-069). So the
 * chart draws the intervals as bars and the estimates as marks on them: overlap is something you
 * see, not something you have to compute.
 *
 * Data comes from `src/data/elo-conditioning.json`, written by `rukh eval sweep` and copied here
 * with `pnpm sync:data`. Until that run exists the island renders its "pendiente" state rather
 * than a plausible-looking ladder: a fabricated one would teach the opposite of this module.
 *
 * Styles live in `src/styles/global.css` (`.ed*`), never inline (CSP).
 */
import { useId, useMemo, useState } from 'preact/hooks';

/** One condition of the sweep, exactly as `SweepRow` serialises it. */
export interface EloRow {
  header_elo: number;
  elo?: number | null;
  elo_ci?: [number, number] | null;
  elo_lower?: number | null;
  elo_upper?: number | null;
  score?: number | null;
  legality?: number | null;
  top1?: number | null;
  puzzles?: number | null;
  first_move_entropy?: number | null;
  stage?: string;
}

export interface EloSweep {
  stage: string;
  checkpoint?: string;
  params?: number;
  date?: string;
  rows: EloRow[];
  monotonic: boolean;
  separated: boolean;
  span?: number | null;
}

const files = import.meta.glob<EloSweep>('../data/elo-conditioning.json', {
  eager: true,
  import: 'default',
});
const data: EloSweep | undefined = Object.values(files)[0];

/** Chart geometry in user units; the SVG scales to the container width. */
export const VIEW = { w: 680, h: 240, left: 86, right: 20, top: 18, bottom: 34 };

/** A payload is usable when at least two conditions actually produced a rating. */
export function isReady(value: EloSweep | undefined): value is EloSweep {
  return Boolean(value && Array.isArray(value.rows) && measured(value.rows).length >= 2);
}

export function measured(rows: EloRow[]): EloRow[] {
  return rows.filter((row) => typeof row.elo === 'number');
}

/** Low and high ends of a row's interval, falling back to the one-sided bound, then the point. */
export function bounds(row: EloRow): [number, number] {
  const point = row.elo ?? 0;
  if (row.elo_ci && row.elo_ci.length === 2) return [row.elo_ci[0], row.elo_ci[1]];
  if (typeof row.elo_lower === 'number') return [row.elo_lower, point];
  if (typeof row.elo_upper === 'number') return [point, row.elo_upper];
  return [point, point];
}

/**
 * The rating axis, padded and rounded outwards to a multiple of 100.
 *
 * Fitted to the data rather than fixed, because the whole question is how far apart the rows are
 * and a fixed 0-3000 axis would squash every sweep into the same flat stack. Padded so a bar
 * never touches the edge, which would read as "it continues off the chart".
 */
export function domain(rows: EloRow[]): [number, number] {
  const ends = measured(rows).flatMap(bounds);
  const low = Math.min(...ends);
  const high = Math.max(...ends);
  const pad = Math.max((high - low) * 0.12, 25);
  return [Math.floor((low - pad) / 100) * 100, Math.ceil((high + pad) / 100) * 100];
}

export function scaleX(value: number, span: [number, number]): number {
  const usable = VIEW.w - VIEW.left - VIEW.right;
  const ratio = (value - span[0]) / (span[1] - span[0] || 1);
  return VIEW.left + usable * Math.min(Math.max(ratio, 0), 1);
}

/** Ticks every 100, 200 or 500 Elo, whichever keeps the axis under about eight labels. */
export function ticks(span: [number, number]): number[] {
  const width = span[1] - span[0];
  const step = width > 1600 ? 500 : width > 700 ? 200 : 100;
  const out: number[] = [];
  for (let value = span[0]; value <= span[1]; value += step) out.push(value);
  return out;
}

/** Which consecutive pairs overlap: the reason the chart exists rather than a column of numbers. */
export function overlaps(rows: EloRow[]): boolean[] {
  const usable = measured(rows);
  return usable.slice(1).map((row, index) => bounds(usable[index])[1] >= bounds(row)[0]);
}

const percent = (value: number | null | undefined) =>
  typeof value === 'number' ? `${(value * 100).toFixed(2)} %` : '—';

const round = (value: number | null | undefined) =>
  typeof value === 'number' ? Math.round(value).toLocaleString('es-ES') : '—';

function Pending() {
  return (
    <div class="ed ed--pending" data-elo-dial data-state="pending">
      <p class="ed__pending-main">
        <strong>Pendiente:</strong> el barrido por condición todavía no se ha ejecutado.
      </p>
      <p class="ed__pending-note caption">
        Este gráfico se rellena con <code>rukh eval sweep</code> y <code>pnpm sync:data</code>.
        Hasta entonces no hay escalera que enseñar: inventarla sería justo lo contrario de lo que
        enseña este módulo.
      </p>
    </div>
  );
}

export default function EloDial() {
  if (!isReady(data)) return <Pending />;
  const sweep = data;
  const rows = useMemo(() => measured(sweep.rows), [sweep]);
  const [selected, setSelected] = useState(rows.length - 1);
  const span = useMemo(() => domain(rows), [rows]);
  const marks = useMemo(() => ticks(span), [span]);
  const pairOverlaps = useMemo(() => overlaps(rows), [rows]);
  const titleId = useId();
  const current = rows[Math.min(selected, rows.length - 1)];
  const rowHeight = (VIEW.h - VIEW.top - VIEW.bottom) / rows.length;
  const y = (index: number) => VIEW.top + rowHeight * (index + 0.5);

  return (
    <div class="ed" data-elo-dial data-state="ready">
      <div class="ed__head">
        <p class="ed__title">Elo medido pidiéndole al modelo que juegue a cada nivel</p>
        <p class="ed__sub caption">
          Una fila por condición. La barra es el intervalo de confianza del 95 %; la marca, la
          estimación. Todo lo demás de la medición es idéntico entre filas: mismos rivales, mismas
          posiciones, misma semilla, misma temperatura.
        </p>
      </div>

      <svg class="ed__svg" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="img" aria-labelledby={titleId}>
        <title id={titleId}>
          {rows
            .map(
              (row) =>
                `Pedido ${row.header_elo}: ${round(row.elo)} Elo, intervalo ${round(
                  bounds(row)[0],
                )} a ${round(bounds(row)[1])}.`,
            )
            .join(' ')}
        </title>
        {marks.map((mark) => (
          <g key={mark}>
            <line
              class="ed__grid"
              x1={scaleX(mark, span)}
              y1={VIEW.top - 6}
              x2={scaleX(mark, span)}
              y2={VIEW.h - VIEW.bottom + 4}
            />
            <text class="ed__tick" x={scaleX(mark, span)} y={VIEW.h - VIEW.bottom + 18}>
              {mark}
            </text>
          </g>
        ))}
        {rows.map((row, index) => {
          const [low, high] = bounds(row);
          const isCurrent = index === Math.min(selected, rows.length - 1);
          return (
            <g key={row.header_elo} class={isCurrent ? 'ed__row ed__row--on' : 'ed__row'}>
              <text class="ed__label" x={VIEW.left - 12} y={y(index) + 4}>
                {`<w${String(row.header_elo).padStart(4, '0')}>`}
              </text>
              <line
                class="ed__interval"
                x1={scaleX(low, span)}
                y1={y(index)}
                x2={scaleX(high, span)}
                y2={y(index)}
              />
              <line
                class="ed__cap"
                x1={scaleX(low, span)}
                y1={y(index) - 6}
                x2={scaleX(low, span)}
                y2={y(index) + 6}
              />
              <line
                class="ed__cap"
                x1={scaleX(high, span)}
                y1={y(index) - 6}
                x2={scaleX(high, span)}
                y2={y(index) + 6}
              />
              <circle class="ed__point" cx={scaleX(row.elo ?? low, span)} cy={y(index)} r="4.5" />
            </g>
          );
        })}
      </svg>

      <ul class="ed__pairs">
        {pairOverlaps.map((overlap, index) => (
          <li key={index} class={overlap ? 'ed__pair ed__pair--overlap' : 'ed__pair'}>
            {`${rows[index].header_elo} → ${rows[index + 1].header_elo}: `}
            {overlap ? 'los intervalos se solapan' : 'los intervalos se separan'}
          </li>
        ))}
      </ul>

      <div class="ed__control">
        <label class="label" for={`${titleId}-pick`}>
          Condición
        </label>
        <select
          id={`${titleId}-pick`}
          class="ed__select"
          value={String(current.header_elo)}
          onChange={(event) => {
            const wanted = Number((event.currentTarget as HTMLSelectElement).value);
            setSelected(rows.findIndex((row) => row.header_elo === wanted));
          }}
        >
          {rows.map((row) => (
            <option key={row.header_elo} value={String(row.header_elo)}>
              {`juega como ${row.header_elo}`}
            </option>
          ))}
        </select>
      </div>

      <dl class="ed__numbers">
        <div class="ed__number">
          <dt class="label">Elo medido</dt>
          <dd>
            {round(current.elo)}
            <span class="caption">
              {` (IC ${round(bounds(current)[0])}–${round(bounds(current)[1])})`}
            </span>
          </dd>
        </div>
        <div class="ed__number">
          <dt class="label">Legales sin máscara</dt>
          <dd>{percent(current.legality)}</dd>
        </div>
        <div class="ed__number">
          <dt class="label">Top-1</dt>
          <dd>{percent(current.top1)}</dd>
        </div>
        <div class="ed__number">
          <dt class="label">Puzles</dt>
          <dd>{percent(current.puzzles)}</dd>
        </div>
      </dl>

      <p class="ed__verdict">
        Estimaciones {sweep.monotonic ? 'monótonas' : 'no monótonas'} · intervalos{' '}
        {sweep.separated ? 'separados' : 'no separados'}
        {typeof sweep.span === 'number' ? ` · ${Math.round(sweep.span)} Elo entre extremos` : ''}
      </p>
      {/* The dial would otherwise read as "the axis is worth this many Elo", and the control run
          says it is not: the model *before* the fine-tune covers 161 of those points with a
          header it never trained on, simply because an unknown prefix gets in its way. The
          caption is here and not in the lesson's prose because this island is the thing a reader
          screenshots. */}
      <p class="ed__caveat caption">
        El recorrido no es mérito del condicionamiento por sí solo: el modelo <em>sin</em> afinar
        cubre 161 de esos puntos con una cabecera que nunca entrenó. La diferencia entre los dos
        está en las otras columnas, no en el Elo.
      </p>
      <p class="ed__meta caption">
        <code>{sweep.stage}</code>
        {typeof sweep.params === 'number'
          ? ` · ${sweep.params.toLocaleString('es-ES')} parámetros`
          : ''}
        {sweep.date ? ` · ${sweep.date}` : ''}
      </p>
    </div>
  );
}
