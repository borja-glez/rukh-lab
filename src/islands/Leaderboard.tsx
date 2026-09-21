/**
 * Leaderboard (lesson M6): the single results table, sortable by column.
 *
 * It reads the same `src/data/results.json` as `<ResultsTable>` (copied by `pnpm sync:data` from
 * `rukh/artifacts/web/results.json`, written by `rukh eval`) and shows the decoder rows: the
 * encoder's rows measure nothing a player is measured by and keep their own table. Each row links
 * to its model card on the Hub and, when the demo serves those weights, to the arena with that
 * stage in the second slot (`src/lib/stages.ts`). Baselines are marked with a badge, because the
 * point of a baseline row is that it is *not* one of ours and the eye should not have to read the
 * name to know it.
 *
 * Sorting is the only state. The default order is the file's own, which is course order, and a
 * click on a header sorts by that column; a second click flips it. Rows with no measurement in a
 * column go last in both directions. Everything sortable lives in `src/lib/leaderboard.ts` so the
 * tests cover it without a DOM.
 *
 * With the committed placeholder the island renders its "pendiente" state, like the other
 * islands. Styles live in `src/styles/global.css` (`.lb*`), never inline (CSP).
 */
import { useId, useMemo, useState } from 'preact/hooks';
import {
  COLUMNS,
  decoderRows,
  encoderRows,
  isBaseline,
  isPlaceholder,
  linksFor,
  nextSort,
  sortRows,
  type ResultsFile,
  type SortState,
} from '../lib/leaderboard';
import { formatDate } from '../lib/format';

const files = import.meta.glob<ResultsFile>('../data/results.json', {
  eager: true,
  import: 'default',
});
const data: ResultsFile | undefined = Object.values(files)[0];

const NONE: SortState = { key: null, direction: 'asc' };

function Pending() {
  return (
    <div class="lb lb--pending" data-leaderboard data-state="pending">
      <p class="lb__pending-main">
        <strong>Pendiente:</strong> la tabla única todavía no tiene filas.
      </p>
      <p class="lb__pending-note caption">
        Se rellena con <code>rukh eval nightly</code> y <code>pnpm sync:data</code>. Hasta entonces
        no hay clasificación que ordenar: una fila inventada sería justo lo que este módulo enseña a
        no publicar.
      </p>
    </div>
  );
}

function Table({ source }: { source: ResultsFile }) {
  const base = useId();
  const rows = useMemo(() => decoderRows(source), [source]);
  const hidden = useMemo(() => encoderRows(source).length, [source]);
  const [sort, setSort] = useState<SortState>(NONE);
  const ordered = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const updated = formatDate(source.updated_at ?? source.updated ?? source.meta?.generated);
  const baselines = rows.filter(isBaseline).length;

  const ariaSort = (key: string) => {
    if (sort.key !== key) return undefined;
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div class="lb" data-leaderboard data-state="ready">
      <div class="lb__head">
        <p class="lb__title" id={`${base}-title`}>
          La tabla única del hito
        </p>
        <p class="lb__sub caption">
          Una fila por etapa evaluada, en el orden del curso. Pulsa una cabecera para ordenar por
          esa columna; otra vez, para invertir. Las fracciones son porcentajes; el Elo lleva su
          intervalo del 95 %.
        </p>
      </div>

      <div
        class="lb__wrap"
        role="region"
        aria-labelledby={`${base}-title`}
        aria-describedby={`${base}-scroll`}
        tabindex={0}
      >
        <p class="lb__sr" id={`${base}-scroll`}>
          Tabla con desplazamiento horizontal.
        </p>
        <table class="lb__table">
          <thead>
            <tr>
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    class={c.numeric ? 'lb__th lb__th--num' : 'lb__th'}
                    aria-sort={ariaSort(c.key)}
                  >
                    <button
                      type="button"
                      class={active ? 'lb__sort lb__sort--on' : 'lb__sort'}
                      title={c.label}
                      onClick={() => setSort((current) => nextSort(current, c.key))}
                    >
                      <span class="lb__label-long">{c.label}</span>
                      <span class="lb__label-short" aria-hidden="true">
                        {c.short ?? c.label}
                      </span>
                      <span class="lb__arrow" aria-hidden="true">
                        {active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th scope="col" class="lb__th">
                Enlaces
              </th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => {
              const baseline = isBaseline(row);
              const links = linksFor(row);
              return (
                <tr
                  key={row.stage}
                  class={baseline ? 'lb__row lb__row--baseline' : 'lb__row'}
                  data-stage={row.stage}
                  data-baseline={baseline ? 'true' : undefined}
                >
                  {COLUMNS.map((c) => {
                    const text = c.text(row);
                    if (c.key === 'stage') {
                      return (
                        <th key={c.key} scope="row" class="lb__stage">
                          <code>{row.stage}</code>
                          {baseline && <span class="lb__badge">baseline</span>}
                        </th>
                      );
                    }
                    return (
                      <td key={c.key} class={c.numeric ? 'lb__td lb__td--num' : 'lb__td'}>
                        {text ?? <span class="lb__none">—</span>}
                      </td>
                    );
                  })}
                  <td class="lb__td lb__links">
                    {links.hub ? (
                      <a href={links.hub} rel="noopener" aria-label={`Model card de ${row.stage}`}>
                        card
                      </a>
                    ) : (
                      <span class="lb__none">—</span>
                    )}
                    {links.demo && (
                      <a
                        href={links.demo}
                        rel="noopener"
                        aria-label={`${row.stage} en la arena de la demo`}
                      >
                        demo
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p class="lb__meta caption">
        Fuente: <code>rukh eval nightly</code>
        {updated ? ` · actualizado ${updated}` : ''}
        {` · ${rows.length} etapas`}
        {baselines > 0 ? ` · ${baselines} baseline${baselines === 1 ? '' : 's'}` : ''}
        {hidden > 0
          ? ` · ${hidden} fila${hidden === 1 ? '' : 's'} del encoder en su propia tabla`
          : ''}
      </p>
    </div>
  );
}

export default function Leaderboard() {
  if (isPlaceholder(data)) return <Pending />;
  return <Table source={data as ResultsFile} />;
}
