/**
 * A toy embedding space for the EmbeddingExplorer widget of /como-funciona-un-llm/ (chapter 3).
 *
 * Twenty Spanish words with 2D coordinates placed by hand, not learned: they are drawn so that the
 * groups (animals, people, fruit, places) and a few parallel directions (male → female, country →
 * capital, adult → young) read at a glance. A real embedding has hundreds of dimensions and its
 * directions are only approximately parallel; the arithmetic here is the same, just exact.
 *
 * Distances are euclidean, which on a flat 2D map is what the eye measures. Real systems usually
 * compare embeddings by cosine similarity (the angle, ignoring length); the widget's caption says so.
 */

export interface Word {
  word: string;
  group: 'animales' | 'personas' | 'fruta' | 'lugares';
  x: number;
  y: number;
}

export const WORDS: Word[] = [
  /* Spread wide enough that three neighbour lines and their distances never land on a label. */
  { word: 'gato', group: 'animales', x: 8, y: 14 },
  { word: 'gatito', group: 'animales', x: 14, y: 30 },
  { word: 'perro', group: 'animales', x: 30, y: 10 },
  { word: 'cachorro', group: 'animales', x: 36, y: 26 },
  { word: 'pato', group: 'animales', x: 6, y: 44 },
  { word: 'caballo', group: 'animales', x: 30, y: 44 },
  { word: 'hombre', group: 'personas', x: 58, y: 40 },
  { word: 'mujer', group: 'personas', x: 82, y: 40 },
  { word: 'rey', group: 'personas', x: 58, y: 16 },
  { word: 'reina', group: 'personas', x: 82, y: 16 },
  { word: 'príncipe', group: 'personas', x: 58, y: 28 },
  { word: 'princesa', group: 'personas', x: 82, y: 28 },
  { word: 'manzana', group: 'fruta', x: 14, y: 68 },
  { word: 'pera', group: 'fruta', x: 22, y: 76 },
  { word: 'naranja', group: 'fruta', x: 33, y: 64 },
  { word: 'limón', group: 'fruta', x: 32, y: 82 },
  { word: 'Francia', group: 'lugares', x: 62, y: 68 },
  { word: 'París', group: 'lugares', x: 64, y: 84 },
  { word: 'España', group: 'lugares', x: 82, y: 66 },
  { word: 'Madrid', group: 'lugares', x: 84, y: 82 },
];

export interface Point {
  x: number;
  y: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function wordByName(name: string): Word {
  const found = WORDS.find((w) => w.word === name);
  if (!found) throw new Error(`embeddings: unknown word "${name}"`);
  return found;
}

/** The `k` words closest to `point`, nearest first, leaving out the words in `exclude`. */
export function nearest(
  point: Point,
  k: number,
  exclude: string[] = [],
): { word: Word; distance: number }[] {
  return WORDS.filter((w) => !exclude.includes(w.word))
    .map((word) => ({ word, distance: distance(point, word) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
}

/** A − B + C, the point the analogy lands on. */
export function analogyPoint(a: Point, b: Point, c: Point): Point {
  return { x: a.x - b.x + c.x, y: a.y - b.y + c.y };
}

/**
 * The word nearest to A − B + C. The three input words are left out, as every word2vec-style
 * analogy test does: otherwise the answer is very often one of them.
 */
export function solveAnalogy(
  a: string,
  b: string,
  c: string,
): { word: Word; distance: number; point: Point } {
  const point = analogyPoint(wordByName(a), wordByName(b), wordByName(c));
  const [best] = nearest(point, 1, [a, b, c]);
  return { ...best, point };
}
