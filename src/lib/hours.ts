/**
 * Course time, from one source of truth.
 *
 * A module used to declare its own `hours` by hand while its lessons declared their own
 * `duration` in minutes. The two never agreed: M2 said 8 h on the course index and 595 min
 * across its four lessons, which is 9,9 h. A reader who adds them up finds the course lying to
 * itself, and an auditor who divides words by the smaller number concludes the module is
 * impossibly dense. So the module figure is now derived, never written.
 *
 * Two clocks, because they are not the same commitment:
 *
 * - `work`: you, at the keyboard. Reading, writing code, doing the exercises. Lesson `duration`.
 * - `run`: the wall clock with nobody in front of it. Training on the GPU, downloading shards,
 *   engine matches. Lesson `runtime`, taken from `rukh/docs/reproducir.md` and the runbooks.
 *
 * Only modules with no published lesson fall back to their declared `hours` estimate.
 */
import type { CollectionEntry } from 'astro:content';

export interface ModuleTime {
  /** Hours at the keyboard. */
  work: number;
  /** Hours of unattended execution: GPU, network, engine. */
  run: number;
  /** True when no lesson is published and `work` is the module's own estimate. */
  estimated: boolean;
}

/** Rounds to the nearest half hour: a course listing does not need 9,9 h. */
const toHours = (minutes: number): number => Math.round(minutes / 30) / 2;

export function moduleTime(
  module: CollectionEntry<'modules'>,
  lessons: CollectionEntry<'lessons'>[],
): ModuleTime {
  const own = lessons.filter((l) => l.data.module === module.id);
  if (own.length === 0) {
    return { work: module.data.hours ?? 0, run: 0, estimated: true };
  }
  const work = own.reduce((acc, l) => acc + l.data.duration, 0);
  const run = own.reduce((acc, l) => acc + (l.data.runtime ?? 0), 0);
  return { work: toHours(work), run: toHours(run), estimated: false };
}

export function courseTime(
  modules: CollectionEntry<'modules'>[],
  lessons: CollectionEntry<'lessons'>[],
): ModuleTime {
  const times = modules.map((m) => moduleTime(m, lessons));
  return {
    work: Math.round(times.reduce((acc, t) => acc + t.work, 0)),
    run: Math.round(times.reduce((acc, t) => acc + t.run, 0)),
    estimated: times.some((t) => t.estimated),
  };
}

/** `9,5` and not `9.5`: the site is in Spanish. */
export const formatHours = (hours: number): string =>
  `${hours.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`;
