/**
 * LoraPatch (/como-funciona-un-llm/, chapter 10): the size of a LoRA next to the matrix it
 * corrects. A slider sets the rank r; the drawing keeps W (768 × 768, a query projection of
 * `medium`, the model M4 fine-tunes) at scale and draws B (768 × r) and A (r × 768) at the same
 * scale, so r = 8 really is a sliver. The counts use src/lib/llm/lora.ts; the whole-model figures
 * assume what M4 adapts: query and value in each of the sixteen layers of a 115 120 128-parameter
 * model. Styles are src/styles/llm/lora-patch.css (`.lp*`), never inline (CSP).
 */
import { useId, useState } from 'preact/hooks';
import { fullParams, loraParams, loraShare } from '../../lib/llm/lora';
import '../../styles/llm/lora-patch.css';

export const D = 768;
export const LAYERS = 16;
export const TARGETS = 2;
export const MODEL_PARAMS = 115_120_128;
const COURSE_RANK = 8;

/** Thousands with a narrow space, as the lessons write them (589 824), and a decimal comma. */
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = (x: number) => {
  const digits = x < 0.1 ? 2 : 1;
  return `${(x * 100).toFixed(digits).replace('.', ',')} %`;
};

export default function LoraPatch() {
  const [rank, setRank] = useState(COURSE_RANK);
  const id = useId();
  const perMatrix = loraParams(D, D, rank);
  const adapter = perMatrix * LAYERS * TARGETS;
  const mb = (adapter * 4) / 1e6;

  return (
    <div class="lp">
      <div class="lp__control">
        <label class="lp__label" for={id}>
          <span class="label">Rango r</span>
          <strong class="lp__rank">{rank}</strong>
          {rank === COURSE_RANK && <span class="chip">el del curso</span>}
        </label>
        <input
          id={id}
          class="lp__slider"
          type="range"
          min={1}
          max={64}
          step={1}
          value={rank}
          aria-valuetext={`rango ${rank}`}
          onInput={(e) => setRank(Number((e.currentTarget as HTMLInputElement).value))}
        />
      </div>

      <Diagram rank={rank} side={180} wide />
      <Diagram rank={rank} side={130} />

      <dl class="lp__numbers">
        <div>
          <dt class="label">W, congelada</dt>
          <dd>{fmt(fullParams(D, D))}</dd>
        </div>
        <div class="lp__number--accent">
          <dt class="label">B y A, entrenables</dt>
          <dd>
            {fmt(perMatrix)} <span class="lp__small">{pct(loraShare(D, D, rank))} de W</span>
          </dd>
        </div>
        <div>
          <dt class="label">Adaptador entero (q y v × 16 capas)</dt>
          <dd>
            {fmt(adapter)}{' '}
            <span class="lp__small">
              {pct(adapter / MODEL_PARAMS)} del modelo · {mb.toFixed(1).replace('.', ',')} MB
            </span>
          </dd>
        </div>
      </dl>
      <p class="lp__note" role="status" aria-live="polite">
        Con r = {rank}, la corrección solo puede empujar en {rank}{' '}
        {rank === 1 ? 'dirección' : 'direcciones'} de las 768 posibles de cada matriz.
      </p>
    </div>
  );
}

/**
 * W and its correction at one scale. `wide` draws the whole sum, W + B·A = ΔW, in one row; the
 * narrow version (phones, swapped by CSS) drops ΔW so the rest keeps a legible size. A rank never
 * shrinks below a pixel and a half, or r = 1 would vanish.
 */
function Diagram({ rank, side, wide = false }: { rank: number; side: number; wide?: boolean }) {
  const w = Math.max(1.5, (rank / D) * side);
  const y = 30;
  const xW = 10;
  const xB = xW + side + 40;
  const xA = xB + w + 26;
  const xD = xA + side + 40;
  /* Fixed widths, sized for r = 64, so the drawing does not rescale as the slider moves. */
  const width = wide ? 690 : 360;
  const font = wide ? 11 : 12;
  return (
    <svg
      class={wide ? 'lp__svg lp__svg--wide' : 'lp__svg lp__svg--narrow'}
      viewBox={`0 0 ${width} ${side + 70}`}
      role="img"
      aria-label={`La matriz W de 768 por 768, congelada, más la corrección B por A: B mide 768 por ${rank} y A ${rank} por 768, dibujadas a la misma escala. Su producto es una matriz del tamaño de W pero de rango ${rank}.`}
    >
      <g font-family="var(--font-mono)" font-size={font}>
        <rect x={xW} y={y} width={side} height={side} fill="var(--box-fill)" stroke="var(--ink)" />
        <text
          x={xW + side / 2}
          y={y + side / 2 - 6}
          text-anchor="middle"
          font-size="16"
          font-weight="600"
          fill="var(--ink)"
          font-family="var(--font-display)"
        >
          W
        </text>
        <text x={xW + side / 2} y={y + side / 2 + 14} text-anchor="middle" fill="var(--muted)">
          congelada
        </text>
        <text x={xW} y={y + side + 20} fill="var(--muted)">
          768 × 768
        </text>

        <text
          x={xW + side + 20}
          y={y + side / 2 + 6}
          text-anchor="middle"
          font-size="20"
          fill="var(--ink)"
        >
          +
        </text>

        <rect
          x={xB}
          y={y}
          width={w}
          height={side}
          fill="var(--accent)"
          fill-opacity="0.85"
          stroke="var(--accent-text-aa)"
        />
        <text x={xB + w / 2} y={y - 8} text-anchor="middle" fill="var(--accent-text-aa)">
          B
        </text>
        <text
          x={xB + w + 13}
          y={y + side / 2 + 6}
          text-anchor="middle"
          font-size="16"
          fill="var(--ink)"
        >
          ·
        </text>
        <rect
          x={xA}
          y={y}
          width={side}
          height={w}
          fill="var(--accent)"
          fill-opacity="0.85"
          stroke="var(--accent-text-aa)"
        />
        <text x={xA + side / 2} y={y - 8} text-anchor="middle" fill="var(--accent-text-aa)">
          A
        </text>
        <text x={xB} y={y + side + 20} fill="var(--accent-text-aa)">
          {wide ? `768 × ${rank} y ${rank} × 768` : `B: 768 × ${rank}`}
        </text>
        {!wide && (
          <text x={xB} y={y + side + 38} fill="var(--accent-text-aa)">
            A: {rank} × 768
          </text>
        )}

        {wide && (
          <>
            <text
              x={xA + side + 20}
              y={y + side / 2 + 6}
              text-anchor="middle"
              font-size="16"
              fill="var(--ink)"
            >
              =
            </text>
            <rect
              x={xD}
              y={y}
              width={side}
              height={side}
              fill="var(--accent)"
              fill-opacity={Math.min(0.5, 0.06 + rank / 128)}
              stroke="var(--accent-text-aa)"
              stroke-dasharray="4 4"
            />
            <text
              x={xD + side / 2}
              y={y + side / 2 - 6}
              text-anchor="middle"
              font-size="16"
              font-weight="600"
              fill="var(--ink)"
              font-family="var(--font-display)"
            >
              ΔW
            </text>
            <text x={xD + side / 2} y={y + side / 2 + 14} text-anchor="middle" fill="var(--ink-2)">
              rango {rank}
            </text>
            <text x={xD} y={y + side + 20} fill="var(--muted)">
              del tamaño de W
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
