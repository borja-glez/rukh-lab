/**
 * The pure half of the M6 leaderboard: what a row of `results.json` is, which columns the table
 * shows, how a column is read, sorted and printed, and where a row links to. No DOM here, so the
 * tests can cover it without rendering the island (`src/islands/Leaderboard.tsx`).
 *
 * The columns live here and not in the data: the ML repo publishes measurements, the site decides
 * how to name and order them (same rule as `<ResultsTable>`).
 */
import { formatDecimal, formatInt, formatParams, formatPercent, toNumber } from './format';
import { demoUrl, hubUrl, stageLinks } from './stages';

/** One row of `results.json`, as `rukh eval` serialises it; every measurement is optional. */
export interface ResultRow {
  stage: string;
  /** `"encoder"` on the rows of the encoder, which share no column with a decoder. */
  kind?: string;
  /** Set by the exporter on the rows of external models; the stage name is the fallback. */
  baseline?: boolean;
  params?: number | null;
  legality?: number | null;
  legality_sampled?: number | null;
  top1?: number | null;
  top3?: number | null;
  puzzles?: Record<string, number | null> | null;
  elo?: number | null;
  elo_ci?: [number, number] | null;
  elo_lower?: number | null;
  elo_upper?: number | null;
  delta_cp?: number | null;
  date?: string | null;
  /** Already-formatted Hub link of the committed placeholder shape. */
  hub?: string | null;
  [key: string]: unknown;
}

export interface ResultsFile {
  updated_at?: string | null;
  /** The committed placeholder's name for `updated_at`. */
  updated?: string | null;
  meta?: { generated?: string | null; [key: string]: unknown };
  rows?: ResultRow[];
  [key: string]: unknown;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  /** A column key, or null for the file's own order (course order). */
  key: string | null;
  direction: SortDirection;
}

export interface Column {
  key: string;
  label: string;
  /** A short label for the narrow layout; the full one stays in the header's `title`. */
  short?: string;
  /** The value the column sorts by: a number, a string, or null when the row has no measurement. */
  value: (row: ResultRow) => number | string | null;
  /** The value as printed; null prints as an em dash. */
  text: (row: ResultRow) => string | null;
  numeric: boolean;
}

const puzzles = (row: ResultRow, band: string): number | null => {
  const value = toNumber(row.puzzles?.[band]);
  return Number.isFinite(value) ? value : null;
};

const number = (value: unknown): number | null => {
  const n = toNumber(value);
  return Number.isFinite(n) ? n : null;
};

const percent = (value: unknown): string | null => {
  const n = number(value);
  return n === null ? null : formatPercent(n);
};

/** Low and high ends of a row's interval, when the file carries one or both. */
export function eloBounds(row: ResultRow): [number | null, number | null] {
  if (Array.isArray(row.elo_ci) && row.elo_ci.length === 2) {
    return [number(row.elo_ci[0]), number(row.elo_ci[1])];
  }
  return [number(row.elo_lower), number(row.elo_upper)];
}

/**
 * `1504 (1446 … 1558)` with a two-sided interval; `320 (… 807)` when only one bound survived, as
 * with a baseline whose lower end hit the floor of the ladder; the point alone otherwise.
 */
export function eloText(row: ResultRow): string | null {
  const point = number(row.elo);
  if (point === null) return null;
  const [lo, hi] = eloBounds(row);
  const rounded = formatInt(point);
  if (lo === null && hi === null) return rounded;
  const interval =
    lo !== null && hi !== null
      ? `${formatInt(lo)} … ${formatInt(hi)}`
      : lo !== null
        ? `${formatInt(lo)} …`
        : `… ${formatInt(hi as number)}`;
  return `${rounded} (${interval})`;
}

export const COLUMNS: readonly Column[] = [
  {
    key: 'stage',
    label: 'Etapa',
    value: (row) => row.stage,
    text: (row) => row.stage,
    numeric: false,
  },
  {
    key: 'params',
    label: 'Parámetros',
    short: 'Parám.',
    value: (row) => number(row.params),
    text: (row) => {
      const n = number(row.params);
      return n === null ? null : formatParams(n);
    },
    numeric: true,
  },
  {
    key: 'legality',
    label: 'Legalidad sin máscara',
    short: 'Legal.',
    value: (row) => number(row.legality),
    text: (row) => percent(row.legality),
    numeric: true,
  },
  {
    key: 'top1',
    label: 'Top-1',
    value: (row) => number(row.top1),
    text: (row) => percent(row.top1),
    numeric: true,
  },
  {
    key: 'top3',
    label: 'Top-3',
    value: (row) => number(row.top3),
    text: (row) => percent(row.top3),
    numeric: true,
  },
  {
    key: 'puzzles_1000',
    label: 'Puzles 1000-1500',
    short: 'Puz. 1000',
    value: (row) => puzzles(row, '1000-1500'),
    text: (row) => percent(puzzles(row, '1000-1500')),
    numeric: true,
  },
  {
    key: 'puzzles_1500',
    label: 'Puzles 1500-2000',
    short: 'Puz. 1500',
    value: (row) => puzzles(row, '1500-2000'),
    text: (row) => percent(puzzles(row, '1500-2000')),
    numeric: true,
  },
  {
    key: 'puzzles_2000',
    label: 'Puzles 2000+',
    short: 'Puz. 2000+',
    value: (row) => puzzles(row, '2000+'),
    text: (row) => percent(puzzles(row, '2000+')),
    numeric: true,
  },
  {
    key: 'elo',
    label: 'Elo vs Stockfish (IC 95 %)',
    short: 'Elo (IC 95 %)',
    value: (row) => number(row.elo),
    text: eloText,
    numeric: true,
  },
  {
    key: 'delta_cp',
    label: 'Δ medio (cp)',
    short: 'Δ cp',
    value: (row) => number(row.delta_cp),
    text: (row) => {
      const n = number(row.delta_cp);
      return n === null ? null : formatDecimal(n, 1);
    },
    numeric: true,
  },
];

/** A column by key, or undefined. */
export function column(key: string | null): Column | undefined {
  return key === null ? undefined : COLUMNS.find((c) => c.key === key);
}

/** The rows the leaderboard shows: the encoder measures nothing a player is measured by. */
export function decoderRows(file: ResultsFile | undefined): ResultRow[] {
  const rows = Array.isArray(file?.rows) ? file.rows : [];
  return rows.filter((row) => row && typeof row.stage === 'string' && row.kind !== 'encoder');
}

/** Rows of the file that are the encoder's, so the table can say how many it left out. */
export function encoderRows(file: ResultsFile | undefined): ResultRow[] {
  const rows = Array.isArray(file?.rows) ? file.rows : [];
  return rows.filter((row) => row && row.kind === 'encoder');
}

/**
 * True for the committed placeholder: nothing evaluated yet, or a `meta.generated` that is
 * explicitly null. A file with rows and no `meta` is what `rukh eval` writes, and is real.
 */
export function isPlaceholder(file: ResultsFile | undefined): boolean {
  if (!file) return true;
  if (file.meta && file.meta.generated === null) return true;
  return decoderRows(file).length === 0;
}

/** Baselines: flagged by the exporter, or an external model by name. */
export function isBaseline(row: Pick<ResultRow, 'stage' | 'baseline'>): boolean {
  if (row.baseline === true) return true;
  return /^(qwen|karvonen|maia)/i.test(row.stage);
}

export interface RowLinks {
  /** The model card on the Hub. */
  hub?: string;
  /** The demo, with this stage in the arena. */
  demo?: string;
}

/** Where a row links to: the stage map first, the placeholder's own `hub` string as fallback. */
export function linksFor(row: Pick<ResultRow, 'stage' | 'hub'>): RowLinks {
  const known = stageLinks(row.stage);
  const links: RowLinks = {};
  if (known) {
    links.hub = hubUrl(known.repo);
    if (known.demo) links.demo = demoUrl(known.demo);
  } else if (typeof row.hub === 'string' && row.hub.length > 0) {
    links.hub = row.hub.startsWith('http') ? row.hub : hubUrl(row.hub);
  }
  return links;
}

/** The next state after clicking a header: same column toggles, a new column starts descending. */
export function nextSort(current: SortState, key: string): SortState {
  if (current.key !== key) {
    const c = column(key);
    return { key, direction: c?.numeric ? 'desc' : 'asc' };
  }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/**
 * The rows in the requested order. Stable, so ties keep the file's order; a row with no
 * measurement in that column goes last whichever the direction, because "unmeasured" is not a
 * value that can be smaller than every number in one direction and larger in the other.
 */
export function sortRows<T extends ResultRow>(rows: readonly T[], sort: SortState): T[] {
  const c = column(sort.key);
  if (!c) return [...rows];
  const sign = sort.direction === 'asc' ? 1 : -1;
  const decorated = rows.map((row, index) => ({ row, index, value: c.value(row) }));
  decorated.sort((a, b) => {
    if (a.value === null && b.value === null) return a.index - b.index;
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    const order =
      typeof a.value === 'number' && typeof b.value === 'number'
        ? a.value - b.value
        : String(a.value).localeCompare(String(b.value), 'es');
    return order !== 0 ? order * sign : a.index - b.index;
  });
  return decorated.map((entry) => entry.row);
}
