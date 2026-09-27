import { describe, expect, it } from 'vitest';
import { WORDS, nearest, solveAnalogy, wordByName } from '../src/lib/llm/embeddings';

describe('toy embedding space', () => {
  it('has twenty distinct words inside the 0-100 map', () => {
    expect(WORDS).toHaveLength(20);
    expect(new Set(WORDS.map((w) => w.word)).size).toBe(20);
    for (const w of WORDS) {
      expect(w.x).toBeGreaterThanOrEqual(0);
      expect(w.x).toBeLessThanOrEqual(100);
      expect(w.y).toBeGreaterThanOrEqual(0);
      expect(w.y).toBeLessThanOrEqual(100);
    }
  });

  it('puts each word nearest to words of its own group', () => {
    for (const w of WORDS) {
      const [first] = nearest(w, 1, [w.word]);
      expect(first.word.group, `${w.word} → ${first.word.word}`).toBe(w.group);
    }
  });

  it('solves the analogies the widget offers', () => {
    expect(solveAnalogy('rey', 'hombre', 'mujer').word.word).toBe('reina');
    expect(solveAnalogy('París', 'Francia', 'España').word.word).toBe('Madrid');
    expect(solveAnalogy('gatito', 'gato', 'perro').word.word).toBe('cachorro');
    expect(solveAnalogy('príncipe', 'rey', 'reina').word.word).toBe('princesa');
  });

  it('never answers with one of the three input words', () => {
    const { word } = solveAnalogy('rey', 'rey', 'mujer');
    expect(['rey', 'mujer']).not.toContain(word.word);
  });

  it('rejects unknown words', () => {
    expect(() => wordByName('unicornio')).toThrow();
  });
});
