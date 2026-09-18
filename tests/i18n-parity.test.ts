import { describe, expect, it } from 'vitest';
import es from '../src/i18n/es.json';
import en from '../src/i18n/en.json';

/** Flattens an object into dotted key paths (arrays by index) so key sets can be compared. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => keyPaths(item, `${prefix}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe('i18n dictionaries', () => {
  it('es.json and en.json expose exactly the same keys (landing, project, meta)', () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(es).sort());
  });

  it('have the sections the pages use', () => {
    for (const dict of [es, en]) {
      expect(dict).toHaveProperty('meta.title');
      expect(dict).toHaveProperty('landing.title');
      expect(dict).toHaveProperty('project.title');
      expect(dict.project.repos.items).toHaveLength(3);
    }
  });

  it('has no empty strings', () => {
    const empty = (o: unknown): string[] =>
      keyPaths(o).filter((path) => {
        const v = path
          .replace(/\[(\d+)\]/g, '.$1')
          .split('.')
          .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], o);
        return typeof v === 'string' && v.trim() === '';
      });
    expect(empty(es)).toEqual([]);
    expect(empty(en)).toEqual([]);
  });
});
