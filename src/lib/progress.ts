import { PROGRESS_PREFIX } from './site';

/** Minimal storage contract so the helpers can run without a DOM (tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** `rukh:progress:<module>/<lesson>` */
export function key(moduleId: string, lessonId: string): string {
  return `${PROGRESS_PREFIX}${moduleId}/${lessonId}`;
}

export function isDone(
  moduleId: string,
  lessonId: string,
  store: KeyValueStore | null = defaultStore(),
): boolean {
  try {
    return store?.getItem(key(moduleId, lessonId)) === '1';
  } catch {
    return false;
  }
}

/** Flips the flag and returns the new state. */
export function toggle(
  moduleId: string,
  lessonId: string,
  store: KeyValueStore | null = defaultStore(),
): boolean {
  const next = !isDone(moduleId, lessonId, store);
  try {
    if (next) store?.setItem(key(moduleId, lessonId), '1');
    else store?.removeItem(key(moduleId, lessonId));
  } catch {
    /* storage unavailable: state lives only in the current page */
  }
  return next;
}

export function countDone(
  moduleId: string,
  lessonIds: readonly string[],
  store: KeyValueStore | null = defaultStore(),
): number {
  return lessonIds.filter((lessonId) => isDone(moduleId, lessonId, store)).length;
}
