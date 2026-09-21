/**
 * AttentionMap (lesson M2): the attention matrix of one head of one layer over the moves of a
 * short game, as a moves x moves heat map. Data comes from `src/data/attention.json`, exported by
 * `labs/m2/attention_export.py` and copied here with `pnpm sync:data`; the schema is documented in
 * `src/data/README.md`. Styles live in `src/styles/global.css` (`.am*`), never inline (CSP), and
 * the colour of a cell is a bucket (`data-level`) so the palette stays in the design tokens.
 *
 * With the committed placeholder (empty `weights`) the island renders its "pendiente" state: the
 * lesson ships before the training run that produces the real numbers, and a made-up heat map
 * would teach the wrong thing.
 *
 * The MDX chooses the head the map opens on (`layer`, `head`), so the lesson can land the reader
 * on the one it then discusses instead of on L0H0, which in this model shows no pattern at all.
 */
import { useId, useMemo, useState } from 'preact/hooks';

export interface AttentionData {
  schema?: string;
  game: { moves: string[] };
  layers: number;
  heads: number;
  /** `[layer][head][query][key]`: each query row sums to 1 over the keys a causal query may see. */
  weights: number[][][][];
  meta: { model: string | null; checkpoint: string | null; generated: string | null };
}

/** Number of colour buckets; `.am-cell[data-level="0".."9"]` paints them from global.css. */
export const LEVELS = 10;

/*
 * The JSON is committed as a placeholder, but the glob keeps the island building even if a sync
 * ever removes the file, the same guard TokenizerPlayground uses for `bpe.json`.
 */
const files = import.meta.glob<AttentionData>('../data/attention.json', {
  eager: true,
  import: 'default',
});
const data: AttentionData | undefined = Object.values(files)[0];

/** A payload is usable when it has at least one head with one row of weights. */
export function isReady(value: AttentionData | undefined): value is AttentionData {
  return Boolean(
    value &&
    value.game &&
    value.game.moves.length > 0 &&
    value.layers > 0 &&
    value.heads > 0 &&
    value.weights.length > 0 &&
    value.weights[0].length > 0 &&
    value.weights[0][0].length > 0,
  );
}

/** Largest weight in a matrix; the heat map is normalised by it so one head stays readable. */
export function matrixMax(matrix: number[][]): number {
  let max = 0;
  for (const row of matrix) for (const value of row) if (value > max) max = value;
  return max > 0 ? max : 1;
}

/** Bucket of a weight relative to the matrix maximum, in `[0, LEVELS - 1]`. */
export function levelOf(value: number, max: number): number {
  if (!(value > 0)) return 0;
  return Math.min(LEVELS - 1, Math.floor((value / max) * LEVELS));
}

/** The `n` largest keys of one query row, as `[index, weight]`, largest first. */
export function topKeys(row: number[], n = 3): [number, number][] {
  return row
    .map((weight, index): [number, number] => [index, weight])
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

const pct = (value: number) => `${(value * 100).toFixed(1).replace('.', ',')} %`;

function Pending() {
  return (
    <div class="am am--pending" data-attention-map data-state="pending">
      <p class="am__pending-main">
        Pendiente: el mapa de atención se dibuja con <code>src/data/attention.json</code>, que
        genera <code>labs/m2/attention_export.py</code> sobre un checkpoint real y llega aquí con{' '}
        <code>pnpm sync:data</code>.
      </p>
      <p class="caption am__pending-note">
        Mientras la lección esté en borrador no hay ninguna matriz medida que enseñar, y pintar una
        inventada enseñaría exactamente lo contrario de lo que persigue este módulo.
      </p>
    </div>
  );
}

/** The head the island opens on, from the MDX; both indices are zero-based like the selects. */
export interface AttentionMapProps {
  layer?: number;
  head?: number;
}

/** Clamps a requested index into `[0, count - 1]`; anything unusable falls back to 0. */
export function clampIndex(value: number | undefined, count: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || count <= 0) return 0;
  return Math.min(Math.max(Math.floor(value), 0), count - 1);
}

function Map({ source, initial }: { source: AttentionData; initial: AttentionMapProps }) {
  const base = useId();
  const [layer, setLayer] = useState(() => clampIndex(initial.layer, source.layers));
  const [head, setHead] = useState(() => clampIndex(initial.head, source.heads));
  const [query, setQuery] = useState(0);

  const matrix = useMemo<number[][]>(
    () => source.weights[layer]?.[head] ?? [],
    [source, layer, head],
  );
  const max = useMemo(() => matrixMax(matrix), [matrix]);

  const rows = Math.min(matrix.length, source.game.moves.length);
  const moves = source.game.moves.slice(0, rows);
  const current = Math.min(query, Math.max(rows - 1, 0));
  const best = topKeys(matrix[current] ?? []);

  return (
    <div
      class="am"
      data-attention-map
      data-state="ready"
      data-layer={layer}
      data-head={head}
      data-moves={rows}
    >
      <div class="am__controls">
        <div class="am__field">
          <label class="label" for={`${base}-layer`}>
            Capa
          </label>
          <select
            id={`${base}-layer`}
            class="am__select"
            value={String(layer)}
            onChange={(e) => setLayer(Number((e.currentTarget as HTMLSelectElement).value))}
          >
            {Array.from({ length: source.layers }, (_, i) => (
              <option key={i} value={String(i)}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div class="am__field">
          <label class="label" for={`${base}-head`}>
            Cabeza
          </label>
          <select
            id={`${base}-head`}
            class="am__select"
            value={String(head)}
            onChange={(e) => setHead(Number((e.currentTarget as HTMLSelectElement).value))}
          >
            {Array.from({ length: source.heads }, (_, i) => (
              <option key={i} value={String(i)}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div class="am__field am__field--query">
          <label class="label" for={`${base}-query`}>
            Jugada que mira (fila)
          </label>
          <select
            id={`${base}-query`}
            class="am__select"
            value={String(current)}
            onChange={(e) => setQuery(Number((e.currentTarget as HTMLSelectElement).value))}
          >
            {moves.map((move, i) => (
              <option key={`${i}-${move}`} value={String(i)}>
                {i + 1} · {move}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p class="am__readout" data-readout role="status">
        La jugada <strong>{current + 1}</strong> (<code>{moves[current]}</code>) reparte su atención
        sobre todo en:{' '}
        {best.length > 0
          ? best.map(([index, weight], position) => (
              <span key={index} class="am__readout-item">
                {position > 0 ? ' · ' : ''}
                {index + 1} <code>{moves[index]}</code> ({pct(weight)})
              </span>
            ))
          : 'nada anterior: es la primera posición de la secuencia.'}
      </p>

      <div class="am__scroll">
        <table class="am-table">
          <caption class="caption am-table__caption">
            Capa {layer}, cabeza {head}. Cada fila es una jugada que mira; cada columna, una jugada
            mirada. El color es relativo al máximo de esta cabeza ({pct(max)}) y el valor exacto
            está en el título de cada celda.
          </caption>
          <thead>
            <tr>
              <th scope="col" class="am-table__corner">
                <span class="sr-only">Jugada que mira</span>
              </th>
              {moves.map((move, i) => (
                <th key={`col-${i}`} scope="col" class="am-table__col">
                  <span aria-hidden="true">{i + 1}</span>
                  <span class="sr-only">
                    Jugada {i + 1}, {move}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {moves.map((move, row) => (
              <tr key={`row-${row}`} class={row === current ? 'is-current' : undefined}>
                <th scope="row" class="am-table__row-head">
                  <span class="am-table__n">{row + 1}</span> <code>{move}</code>
                </th>
                {moves.map((target, col) => {
                  const weight = matrix[row]?.[col] ?? 0;
                  return (
                    <td
                      key={`cell-${row}-${col}`}
                      class="am-cell"
                      data-level={levelOf(weight, max)}
                      title={`${row + 1} ${move} → ${col + 1} ${target}: ${pct(weight)}`}
                    >
                      <span class="sr-only">{pct(weight)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p class="caption am__legend" data-legend>
        <span class="am__legend-label">0</span>
        {Array.from({ length: LEVELS }, (_, i) => (
          <span key={i} class="am__legend-cell" data-level={i} aria-hidden="true" />
        ))}
        <span class="am__legend-label">{pct(max)}</span>
        <span class="am__legend-note">
          Subdiagonal encendida (la celda justo a la izquierda de la diagonal): cada jugada mira a
          la anterior. Diagonal: cada jugada se mira a sí misma. Columna encendida: una jugada a la
          que mira todo el mundo.
        </span>
      </p>

      <p class="caption am__meta">
        {source.meta.model ?? 'modelo sin identificar'} · checkpoint{' '}
        {source.meta.checkpoint ?? 'sin identificar'} · generado{' '}
        {source.meta.generated ?? 'sin fecha'}
      </p>
    </div>
  );
}

export default function AttentionMap(props: AttentionMapProps) {
  return isReady(data) ? <Map source={data} initial={props} /> : <Pending />;
}
