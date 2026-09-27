/**
 * NeuronDial (/como-funciona-un-llm/, chapter 1): one artificial neuron with its knobs in reach.
 * Two inputs arrive, each is multiplied by its weight, the bias is added and the sum goes through
 * ReLU. Moving the weights is what training does, one knob at a time; the ReLU switch shows what
 * the non-linearity changes. The maths is src/lib/llm/neuron.ts; styles are
 * src/styles/llm/neuron-dial.css (`.nd*`), never inline (CSP).
 */
import { useId, useState } from 'preact/hooks';
import { relu, weightedSum } from '../../lib/llm/neuron';
import '../../styles/llm/neuron-dial.css';

const num = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n: number) => (n < 0 ? `(${num(n).replace('-', '−')})` : num(n));
const show = (n: number) => num(n).replace('-', '−');

interface Knob {
  key: 'x1' | 'x2' | 'w1' | 'w2' | 'b';
  label: string;
  min: number;
  max: number;
}

const INPUTS: Knob[] = [
  { key: 'x1', label: 'Entrada 1 · ¿hace sol?', min: 0, max: 1 },
  { key: 'x2', label: 'Entrada 2 · ¿hace frío?', min: 0, max: 1 },
];

const WEIGHTS: Knob[] = [
  { key: 'w1', label: 'Peso 1', min: -2, max: 2 },
  { key: 'w2', label: 'Peso 2', min: -2, max: 2 },
  { key: 'b', label: 'Sesgo', min: -2, max: 2 },
];

const START = { x1: 0.8, x2: 0.3, w1: 1.5, w2: -1, b: -0.2 };

/** Line thickness for a weight: its size, never its sign (the sign is the dash). */
const thickness = (w: number) => 1 + Math.abs(w) * 2.5;

export default function NeuronDial() {
  const id = useId();
  const [v, setV] = useState(START);
  const [useRelu, setUseRelu] = useState(true);

  const z = weightedSum([v.x1, v.x2], [v.w1, v.w2], v.b);
  const out = useRelu ? relu(z) : z;
  const silenced = useRelu && z <= 0;

  const slider = (k: Knob) => (
    <label class="nd__knob" for={`${id}-${k.key}`} key={k.key}>
      <span class="label">{k.label}</span>
      <output class="nd__value" for={`${id}-${k.key}`}>
        {show(v[k.key])}
      </output>
      <input
        id={`${id}-${k.key}`}
        class="nd__range"
        type="range"
        min={k.min}
        max={k.max}
        step="0.05"
        value={v[k.key]}
        onInput={(e) =>
          setV({ ...v, [k.key]: Number((e.currentTarget as HTMLInputElement).value) })
        }
      />
    </label>
  );

  const formula = `${num(v.x1)} × ${signed(v.w1)} + ${num(v.x2)} × ${signed(v.w2)} + ${signed(v.b)} = ${show(z)}`;
  const status = useRelu
    ? silenced
      ? `La suma da ${show(z)}, negativa: la ReLU la deja en 0 y la neurona se calla.`
      : `La suma da ${show(z)}, positiva: la ReLU la deja pasar y la neurona se activa con ${show(out)}.`
    : `Sin no linealidad la salida es la suma tal cual: ${show(out)}.`;

  return (
    <div class="nd">
      <svg
        class="nd__diagram"
        viewBox="0 0 360 150"
        role="img"
        aria-label={`Diagrama de la neurona: dos entradas, ${num(v.x1)} y ${num(v.x2)}, llegan por dos cables cuyo grosor es el tamaño del peso (${show(v.w1)} y ${show(v.w2)}; discontinuo si el peso es negativo). La neurona suma, añade el sesgo y da ${show(out)}.`}
      >
        {[
          { y: 38, x: v.x1, w: v.w1, name: 'sol' },
          { y: 112, x: v.x2, w: v.w2, name: 'frío' },
        ].map((input) => (
          <g key={input.name}>
            <line
              class={input.w < 0 ? 'nd__wire nd__wire--neg' : 'nd__wire'}
              x1="70"
              y1={input.y}
              x2="178"
              y2="75"
              stroke-width={thickness(input.w)}
            />
            <circle cx="46" cy={input.y} r="24" class="nd__node" />
            <text x="46" y={input.y - 3} class="nd__node-name">
              {input.name}
            </text>
            <text x="46" y={input.y + 11} class="nd__node-value">
              {num(input.x)}
            </text>
            <text x="118" y={input.y < 75 ? input.y - 2 : input.y + 4} class="nd__wire-label">
              × {show(input.w)}
            </text>
          </g>
        ))}
        <circle cx="206" cy="75" r="30" class={silenced ? 'nd__cell nd__cell--off' : 'nd__cell'} />
        <text x="206" y="72" class="nd__cell-text">
          Σ + b
        </text>
        <text x="206" y="87" class="nd__cell-sub">
          {useRelu ? 'ReLU' : 'sin curva'}
        </text>
        <line x1="236" y1="75" x2="286" y2="75" class="nd__out-wire" />
        <path d="M 280 70 L 287 75 L 280 80" class="nd__out-wire" />
        <circle
          cx="314"
          cy="75"
          r="26"
          class={silenced ? 'nd__node nd__node--off' : 'nd__node nd__node--out'}
        />
        <text x="314" y="80" class="nd__node-value nd__node-value--out">
          {show(out)}
        </text>
      </svg>

      <div class="nd__groups">
        <fieldset class="nd__group">
          <legend class="label nd__legend">Lo que llega</legend>
          {INPUTS.map(slider)}
        </fieldset>
        <fieldset class="nd__group">
          <legend class="label nd__legend">Lo que se aprende</legend>
          {WEIGHTS.map(slider)}
        </fieldset>
      </div>

      <p class="nd__formula">{formula}</p>

      <label class="nd__toggle">
        <input
          type="checkbox"
          checked={useRelu}
          onChange={(e) => setUseRelu((e.currentTarget as HTMLInputElement).checked)}
        />
        <span>Con no linealidad (ReLU: lo negativo pasa a 0)</span>
      </label>

      <p class="nd__status" role="status" aria-live="polite">
        {status}
      </p>

      <div class="nd__actions">
        <button
          type="button"
          class="btn btn--secondary btn--small"
          onClick={() => {
            setV(START);
            setUseRelu(true);
          }}
        >
          Empezar de nuevo
        </button>
      </div>
    </div>
  );
}
