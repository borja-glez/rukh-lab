import { describe, expect, it } from 'vitest';
import results from '../src/data/results.json';
import {
  COLUMNS,
  decoderRows,
  eloText,
  encoderRows,
  isBaseline,
  isPlaceholder,
  linksFor,
  nextSort,
  sortRows,
  type ResultRow,
  type ResultsFile,
} from '../src/lib/leaderboard';
import {
  formatDate,
  formatDecimal,
  formatInt,
  formatParams,
  formatPercent,
  MINUS,
  THIN,
} from '../src/lib/format';

const row = (stage: string, extra: Partial<ResultRow> = {}): ResultRow => ({ stage, ...extra });

/** Four rows in "course order", with holes where `rukh eval` leaves them. */
const ROWS: ResultRow[] = [
  row('tiny-greedy', { params: 5_309_952, elo: 920.9, elo_ci: [713.1, 1039.8], top1: 0.403 }),
  row('small-v3-greedy', {
    params: 38_971_392,
    elo: 1365.4,
    elo_ci: [1293.2, 1423.0],
    top1: 0.511,
  }),
  row('lora-e4', { params: 115_120_128, elo: null, elo_ci: null, top1: 0.547 }),
  row('qwen3-pgn-qlora', {
    params: 596_049_920,
    elo: 320,
    elo_ci: null,
    elo_upper: 807.5,
    top1: 0.125,
  }),
];

describe('sortRows', () => {
  it('keeps the file order when no column is selected', () => {
    const sorted = sortRows(ROWS, { key: null, direction: 'asc' });
    expect(sorted.map((r) => r.stage)).toEqual(ROWS.map((r) => r.stage));
    expect(sorted).not.toBe(ROWS);
  });

  it('sorts a numeric column both ways and keeps unmeasured rows last in both', () => {
    const desc = sortRows(ROWS, { key: 'elo', direction: 'desc' }).map((r) => r.stage);
    expect(desc).toEqual(['small-v3-greedy', 'tiny-greedy', 'qwen3-pgn-qlora', 'lora-e4']);
    const asc = sortRows(ROWS, { key: 'elo', direction: 'asc' }).map((r) => r.stage);
    expect(asc).toEqual(['qwen3-pgn-qlora', 'tiny-greedy', 'small-v3-greedy', 'lora-e4']);
  });

  it('sorts the stage column alphabetically', () => {
    const asc = sortRows(ROWS, { key: 'stage', direction: 'asc' }).map((r) => r.stage);
    expect(asc).toEqual(['lora-e4', 'qwen3-pgn-qlora', 'small-v3-greedy', 'tiny-greedy']);
  });

  it('is stable: ties keep the file order', () => {
    const tied = [row('a', { top1: 0.5 }), row('b', { top1: 0.5 }), row('c', { top1: 0.6 })];
    expect(sortRows(tied, { key: 'top1', direction: 'desc' }).map((r) => r.stage)).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(sortRows(tied, { key: 'top1', direction: 'asc' }).map((r) => r.stage)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('reads the puzzle bands out of the nested object', () => {
    const rows = [
      row('a', { puzzles: { '2000+': 0.1 } }),
      row('b', { puzzles: {} }),
      row('c', { puzzles: { '2000+': 0.3 } }),
    ];
    expect(sortRows(rows, { key: 'puzzles_2000', direction: 'desc' }).map((r) => r.stage)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('ignores an unknown column', () => {
    expect(sortRows(ROWS, { key: 'nope', direction: 'desc' }).map((r) => r.stage)).toEqual(
      ROWS.map((r) => r.stage),
    );
  });

  it('does not mutate its input', () => {
    const copy = ROWS.map((r) => ({ ...r }));
    sortRows(ROWS, { key: 'elo', direction: 'asc' });
    expect(ROWS).toEqual(copy);
  });
});

describe('nextSort', () => {
  it('starts a numeric column descending and a text column ascending', () => {
    expect(nextSort({ key: null, direction: 'asc' }, 'elo')).toEqual({
      key: 'elo',
      direction: 'desc',
    });
    expect(nextSort({ key: null, direction: 'asc' }, 'stage')).toEqual({
      key: 'stage',
      direction: 'asc',
    });
  });

  it('toggles the direction on the same column', () => {
    expect(nextSort({ key: 'elo', direction: 'desc' }, 'elo').direction).toBe('asc');
    expect(nextSort({ key: 'elo', direction: 'asc' }, 'elo').direction).toBe('desc');
  });
});

describe('isBaseline', () => {
  it('honours the exporter flag', () => {
    expect(isBaseline({ stage: 'medium-v4-greedy', baseline: true })).toBe(true);
    expect(isBaseline({ stage: 'medium-v4-greedy', baseline: false })).toBe(false);
  });

  it.each(['qwen3-pgn-qlora', 'karvonen-16m', 'maia-1500', 'Maia2'])(
    'recognises %s by name',
    (stage) => {
      expect(isBaseline({ stage })).toBe(true);
    },
  );

  it.each(['tiny-greedy', 'medium-elo', 'lora-e4', 'encoder-v4'])('%s is ours', (stage) => {
    expect(isBaseline({ stage })).toBe(false);
  });
});

describe('linksFor', () => {
  it('links a mapped stage to its card and to the arena', () => {
    expect(linksFor({ stage: 'medium-v4-greedy' })).toEqual({
      hub: 'https://huggingface.co/chorcat/rukh-medium',
      demo: 'https://rukh.borjaglez.com/?mode=arena&vs=medium-fp16',
    });
  });

  it('links a stage the demo does not serve to its card only', () => {
    expect(linksFor({ stage: 'medium-masters' })).toEqual({
      hub: 'https://huggingface.co/chorcat/rukh-medium-masters',
    });
    expect(linksFor({ stage: 'encoder-v4' })).toEqual({
      hub: 'https://huggingface.co/chorcat/rukh-encoder',
    });
  });

  it('links the baseline to its card and never to the demo', () => {
    expect(linksFor({ stage: 'qwen3-pgn-qlora' })).toEqual({
      hub: 'https://huggingface.co/chorcat/rukh-qwen3-pgn-qlora',
    });
  });

  it('falls back to the placeholder row’s own hub string', () => {
    expect(linksFor({ stage: 'x', hub: 'chorcat/rukh-x' })).toEqual({
      hub: 'https://huggingface.co/chorcat/rukh-x',
    });
    expect(linksFor({ stage: 'x', hub: 'https://huggingface.co/chorcat/rukh-x' })).toEqual({
      hub: 'https://huggingface.co/chorcat/rukh-x',
    });
  });

  it('links nothing for an unknown stage', () => {
    expect(linksFor({ stage: 'small' })).toEqual({});
  });
});

describe('eloText', () => {
  it('prints the point with its two-sided interval', () => {
    expect(eloText(ROWS[1])).toBe('1365 (1293 … 1423)');
  });

  it('prints a one-sided bound as such', () => {
    expect(eloText(ROWS[3])).toBe('320 (… 808)');
    expect(eloText(row('x', { elo: 1000, elo_lower: 900 }))).toBe('1000 (900 …)');
  });

  it('prints the point alone without bounds, and nothing without a point', () => {
    expect(eloText(row('x', { elo: 1000.4 }))).toBe('1000');
    expect(eloText(ROWS[2])).toBeNull();
  });

  it('uses the typographic minus below zero', () => {
    expect(eloText(row('x', { elo: 64, elo_ci: [-200, 291.8] }))).toBe(`64 (${MINUS}200 … 292)`);
  });
});

describe('columns', () => {
  it('print Spanish numbers', () => {
    const text = Object.fromEntries(COLUMNS.map((c) => [c.key, c.text(ROWS[1])]));
    expect(text.params).toBe(`39,0${THIN}M`);
    expect(text.top1).toBe(`51,1${THIN}%`);
    expect(text.elo).toBe('1365 (1293 … 1423)');
    expect(text.top3).toBeNull();
    expect(text.first_move_entropy).toBeNull();
  });
});

describe('placeholder detection and row split', () => {
  it('treats an empty file, a null meta.generated and a missing file as pending', () => {
    expect(isPlaceholder(undefined)).toBe(true);
    expect(isPlaceholder({ updated: null, columns: [], rows: [] })).toBe(true);
    expect(isPlaceholder({ meta: { generated: null }, rows: ROWS })).toBe(true);
  });

  it('treats a file with decoder rows as real', () => {
    expect(isPlaceholder({ updated_at: '2026-09-20T23:32:19+00:00', rows: ROWS })).toBe(false);
  });

  it('keeps encoder rows out of the leaderboard', () => {
    const file: ResultsFile = {
      rows: [row('encoder-v4', { kind: 'encoder' }), ...ROWS],
    };
    expect(decoderRows(file).map((r) => r.stage)).toEqual(ROWS.map((r) => r.stage));
    expect(encoderRows(file).map((r) => r.stage)).toEqual(['encoder-v4']);
    expect(isPlaceholder({ rows: [row('encoder-v4', { kind: 'encoder' })] })).toBe(true);
  });

  it('reads the committed results.json', () => {
    const file = results as ResultsFile;
    expect(isPlaceholder(file)).toBe(false);
    for (const r of decoderRows(file)) {
      expect(typeof r.stage).toBe('string');
      /* Every measurement the columns read must be a fraction, never a percentage. */
      for (const key of ['legality', 'top1', 'top3'] as const) {
        const value = r[key];
        if (typeof value === 'number') expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('format', () => {
  it('groups thousands with a thin space from five digits up', () => {
    expect(formatInt(1504)).toBe('1504');
    expect(formatInt(38971392)).toBe(`38${THIN}971${THIN}392`);
    expect(formatInt(-200)).toBe(`${MINUS}200`);
    expect(formatInt(1365.6)).toBe('1366');
  });

  it('uses the comma as the decimal separator', () => {
    expect(formatDecimal(21.15, 1)).toBe('21,1');
    expect(formatDecimal(12345.678, 2)).toBe(`12${THIN}345,68`);
    expect(formatDecimal(-0.04, 1)).toBe('0,0');
    expect(formatPercent(0.9986)).toBe(`99,9${THIN}%`);
    expect(formatPercent(0.954, 1)).toBe(`95,4${THIN}%`);
  });

  it('prints parameter counts in millions', () => {
    expect(formatParams(115_120_128)).toBe(`115,1${THIN}M`);
    expect(formatParams(596_049_920)).toBe(`596,0${THIN}M`);
    expect(formatParams(512)).toBe('512');
  });

  it('prints dates as dd/mm/yyyy without a locale', () => {
    expect(formatDate('2026-09-20T23:32:19+00:00')).toBe('20/09/2026');
    expect(formatDate('2026-09-20')).toBe('20/09/2026');
    expect(formatDate(null)).toBeNull();
    expect(formatDate('ayer')).toBeNull();
  });
});
