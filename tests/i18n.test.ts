import { describe, expect, it } from 'vitest';
import es from '../src/i18n/es.json';

/** Flattens an object into dotted key paths (arrays by index). */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => keyPaths(item, `${prefix}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe('the Spanish dictionary', () => {
  it('has the sections the pages use', () => {
    expect(es).toHaveProperty('meta.title');
    expect(es).toHaveProperty('landing.title');
    expect(es).toHaveProperty('project.title');
    expect(es.project.repos.items).toHaveLength(3);
  });

  it('has no empty strings', () => {
    const empty = keyPaths(es).filter((path) => {
      const v = path
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], es);
      return typeof v === 'string' && v.trim() === '';
    });
    expect(empty).toEqual([]);
  });
});
