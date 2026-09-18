import { describe, expect, it } from 'vitest';
import { countDone, isDone, key, toggle, type KeyValueStore } from '../src/lib/progress';

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('progress', () => {
  it('builds the localStorage key as rukh:progress:<module>/<lesson>', () => {
    expect(key('m0', '00-taller')).toBe('rukh:progress:m0/00-taller');
  });

  it('toggles a lesson on and off', () => {
    const store = memoryStore();
    expect(isDone('m0', '00-taller', store)).toBe(false);
    expect(toggle('m0', '00-taller', store)).toBe(true);
    expect(isDone('m0', '00-taller', store)).toBe(true);
    expect(store.getItem('rukh:progress:m0/00-taller')).toBe('1');
    expect(toggle('m0', '00-taller', store)).toBe(false);
    expect(store.getItem('rukh:progress:m0/00-taller')).toBeNull();
  });

  it('counts completed lessons per module', () => {
    const store = memoryStore();
    toggle('m1', '01-parquet', store);
    toggle('m1', '03-tokens', store);
    toggle('m2', '01-decoder', store);
    expect(countDone('m1', ['01-parquet', '02-uci', '03-tokens'], store)).toBe(2);
    expect(countDone('m2', ['01-decoder'], store)).toBe(1);
    expect(countDone('m3', ['01-mmm'], store)).toBe(0);
  });

  it('is safe without any storage', () => {
    expect(isDone('m0', '00-taller', null)).toBe(false);
    expect(toggle('m0', '00-taller', null)).toBe(true);
    expect(countDone('m0', ['00-taller'], null)).toBe(0);
  });
});
