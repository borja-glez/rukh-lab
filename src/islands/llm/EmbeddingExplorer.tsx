/**
 * EmbeddingExplorer (/como-funciona-un-llm/, chapter 3): a map of twenty words placed by hand.
 * "Vecinos" picks a word and joins it to its three nearest; "Analogía" computes A − B + C, draws
 * the arrow from B to A copied onto C and names the word nearest to where it lands. The logic is
 * src/lib/llm/embeddings.ts; styles are src/styles/llm/embedding-explorer.css (`.ee*`), never
 * inline (CSP).
 */
import { useId, useMemo, useState } from 'preact/hooks';
import {
  WORDS,
  nearest,
  solveAnalogy,
  wordByName,
  type Point,
  type Word,
} from '../../lib/llm/embeddings';
import '../../styles/llm/embedding-explorer.css';

const SCALE = 3.5;
const px = (x: number) => 15 + x * SCALE;
const py = (y: number) => 10 + y * SCALE;

/**
 * Where a neighbour's distance goes: the middle of its line, pushed 10 px off it on the upper side
 * (or the left, for a vertical line), so the digits sit beside the line instead of on a word.
 */
function distLabel(a: Word, b: Word): { x: number; y: number } {
  const [x1, y1, x2, y2] = [px(a.x), py(a.y), px(b.x), py(b.y)];
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  let nx = -(y2 - y1) / len;
  let ny = (x2 - x1) / len;
  if (ny > 0 || (ny === 0 && nx > 0)) [nx, ny] = [-nx, -ny];
  return { x: (x1 + x2) / 2 + nx * 10, y: (y1 + y2) / 2 + ny * 10 + 4 };
}

const GROUPS: { name: Word['group']; x: number; y: number }[] = [
  { name: 'animales', x: 4, y: 4 },
  { name: 'personas', x: 54, y: 4 },
  { name: 'fruta', x: 4, y: 56 },
  { name: 'lugares', x: 54, y: 56 },
];

const PRESETS: [string, string, string][] = [
  ['rey', 'hombre', 'mujer'],
  ['París', 'Francia', 'España'],
  ['gatito', 'gato', 'perro'],
];

const fmt = (n: number) => n.toFixed(1).replace('.', ',');

/** A line from `from` to `to` in map units, with a two-stroke arrowhead at `to`. */
function arrowPath(from: Point, to: Point): string {
  const x1 = px(from.x);
  const y1 = py(from.y);
  const x2 = px(to.x);
  const y2 = py(to.y);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 8;
  const left = angle + Math.PI - 0.45;
  const right = angle + Math.PI + 0.45;
  return (
    `M ${x1} ${y1} L ${x2} ${y2} ` +
    `M ${x2 + head * Math.cos(left)} ${y2 + head * Math.sin(left)} L ${x2} ${y2} ` +
    `L ${x2 + head * Math.cos(right)} ${y2 + head * Math.sin(right)}`
  );
}

type Mode = 'vecinos' | 'analogia';

export default function EmbeddingExplorer() {
  const id = useId();
  const [mode, setMode] = useState<Mode>('vecinos');
  const [selected, setSelected] = useState('gato');
  const [abc, setAbc] = useState<[string, string, string]>(PRESETS[0]);

  const neighbours = useMemo(() => nearest(wordByName(selected), 3, [selected]), [selected]);
  const analogy = useMemo(() => solveAnalogy(...abc), [abc]);
  const [a, b, c] = abc.map(wordByName);

  const highlighted = new Set<string>(
    mode === 'vecinos' ? neighbours.map((n) => n.word.word) : [analogy.word.word],
  );
  const inputs = new Set<string>(mode === 'vecinos' ? [selected] : abc);

  const status =
    mode === 'vecinos'
      ? `Las tres palabras más cerca de «${selected}»: ${neighbours
          .map((n) => `«${n.word.word}» (${fmt(n.distance)})`)
          .join(', ')}.`
      : `${abc[0]} − ${abc[1]} + ${abc[2]} cae en el punto (${Math.round(analogy.point.x)}; ${Math.round(analogy.point.y)}); la palabra más cercana es «${analogy.word.word}», a ${fmt(analogy.distance)}.`;

  const setSlot = (slot: 0 | 1 | 2, value: string) => {
    const next = [...abc] as [string, string, string];
    next[slot] = value;
    setAbc(next);
  };

  return (
    <div class="ee">
      <div class="ee__modes" role="group" aria-label="Qué explorar">
        <button
          type="button"
          class="btn btn--secondary btn--small"
          aria-pressed={mode === 'vecinos'}
          onClick={() => setMode('vecinos')}
        >
          Vecinos
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--small"
          aria-pressed={mode === 'analogia'}
          onClick={() => setMode('analogia')}
        >
          Analogía: A − B + C
        </button>
      </div>

      {mode === 'vecinos' ? (
        <div class="ee__words" role="group" aria-label="Elige una palabra">
          {WORDS.map((w) => (
            <button
              key={w.word}
              type="button"
              class="ee__word"
              aria-pressed={selected === w.word}
              onClick={() => setSelected(w.word)}
            >
              {w.word}
            </button>
          ))}
        </div>
      ) : (
        <div class="ee__analogy">
          {(['A', 'B', 'C'] as const).map((label, slot) => (
            <label class="ee__slot" key={label}>
              <span class="label">
                {label}
                {slot === 1 ? ' (se resta)' : slot === 2 ? ' (se suma)' : ''}
              </span>
              <select
                class="ee__select"
                id={`${id}-${label}`}
                value={abc[slot]}
                onChange={(e) =>
                  setSlot(slot as 0 | 1 | 2, (e.currentTarget as HTMLSelectElement).value)
                }
              >
                {WORDS.map((w) => (
                  <option key={w.word} value={w.word}>
                    {w.word}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div class="ee__presets">
            {PRESETS.map((p) => (
              <button
                key={p.join()}
                type="button"
                class="btn btn--secondary btn--small"
                aria-pressed={p.join() === abc.join()}
                onClick={() => setAbc(p)}
              >
                {p[0]} − {p[1]} + {p[2]}
              </button>
            ))}
          </div>
        </div>
      )}

      <p class="ee__status" role="status" aria-live="polite">
        {status}
      </p>

      <svg
        class="ee__map"
        viewBox="0 0 380 320"
        role="img"
        aria-label={`Mapa de veinte palabras. ${status}`}
      >
        {GROUPS.map((g) => (
          <text key={g.name} class="ee__group" x={px(g.x)} y={py(g.y)}>
            {g.name}
          </text>
        ))}

        {mode === 'vecinos' &&
          neighbours.map((n) => {
            const from = wordByName(selected);
            return (
              <g key={n.word.word}>
                <line
                  class="ee__link"
                  x1={px(from.x)}
                  y1={py(from.y)}
                  x2={px(n.word.x)}
                  y2={py(n.word.y)}
                />
                <text class="ee__dist" text-anchor="middle" {...distLabel(from, n.word)}>
                  {fmt(n.distance)}
                </text>
              </g>
            );
          })}

        {mode === 'analogia' && (
          <g>
            <path class="ee__arrow" d={arrowPath(b, a)} />
            <path class="ee__arrow ee__arrow--copy" d={arrowPath(c, analogy.point)} />
            <circle class="ee__result" cx={px(analogy.point.x)} cy={py(analogy.point.y)} r="11" />
          </g>
        )}

        {WORDS.map((w) => {
          const cls = inputs.has(w.word)
            ? 'ee__dot ee__dot--input'
            : highlighted.has(w.word)
              ? 'ee__dot ee__dot--hit'
              : 'ee__dot';
          return (
            <g
              key={w.word}
              class={cls}
              onClick={() => {
                if (mode === 'vecinos') setSelected(w.word);
              }}
            >
              <circle cx={px(w.x)} cy={py(w.y)} r="5" />
              <text x={px(w.x) + 8} y={py(w.y) + 4}>
                {w.word}
              </text>
            </g>
          );
        })}
      </svg>

      <p class="ee__legend caption">
        {mode === 'vecinos'
          ? 'Distancia euclídea en el mapa: la que mide una regla. Los modelos de verdad suelen comparar por el ángulo entre vectores (similitud coseno), en cientos de dimensiones.'
          : 'Flecha llena: de B a A. Flecha discontinua: la misma flecha, puesta en C. El círculo es donde cae A − B + C; se nombra la palabra más cercana que no sea ninguna de las tres.'}
      </p>
    </div>
  );
}
