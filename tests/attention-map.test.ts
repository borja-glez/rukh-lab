import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { clampIndex, isReady, matrixMax, topKeys } from '../src/islands/AttentionMap';

const root = resolve(__dirname, '..');

describe('AttentionMap opening head', () => {
  it('clamps the MDX props into the exported layers and heads', () => {
    expect(clampIndex(9, 12)).toBe(9);
    expect(clampIndex(4, 8)).toBe(4);
    expect(clampIndex(12, 12)).toBe(11);
    expect(clampIndex(-1, 8)).toBe(0);
    expect(clampIndex(undefined, 8)).toBe(0);
    expect(clampIndex(Number.NaN, 8)).toBe(0);
    expect(clampIndex(3.7, 8)).toBe(3);
    expect(clampIndex(3, 0)).toBe(0);
  });

  it('opens the lesson on the previous-move head it discusses (L9H4)', () => {
    const lesson = readFileSync(
      resolve(root, 'src/content/lessons/m2/07-exportar-a-onnx.mdx'),
      'utf8',
    );
    expect(lesson).toMatch(/<AttentionMap[^>]*\blayer=\{9\}[^>]*\bhead=\{4\}/);
    const data = JSON.parse(readFileSync(resolve(root, 'src/data/attention.json'), 'utf8'));
    if (!isReady(data)) return; // placeholder: the island renders "pendiente"
    expect(clampIndex(9, data.layers)).toBe(9);
    expect(clampIndex(4, data.heads)).toBe(4);
    /* The head the text describes: its mass sits on the cell left of the diagonal. */
    const matrix: number[][] = data.weights[9][4];
    const sub = matrix.slice(1).map((row, i) => row[i]);
    const mean = sub.reduce((s, v) => s + v, 0) / sub.length;
    expect(mean).toBeGreaterThan(0.75);
    expect(matrixMax(matrix)).toBeLessThanOrEqual(1);
    expect(topKeys(matrix[matrix.length - 1], 1)[0][0]).toBe(matrix.length - 2);
  });
});
