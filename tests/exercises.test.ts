import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every exercise carries a number and a title.
 *
 * M5 and M6 shipped seventeen `<Exercise>` with neither, which renders a bare `// Ejercicio`
 * label and an empty title span: fine to read straight through, useless to come back to after a
 * pause, and invisible to anyone scanning the lesson for where they left off. `Exercise.astro`
 * now throws, and this test says so before the build does.
 */

const LESSONS = resolve(__dirname, '../src/content/lessons');

const lessons = readdirSync(LESSONS, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => f.replace(/\\/g, '/').replace(/\.mdx$/, ''));

const opens = (mdx: string): string[] => [...mdx.matchAll(/<Exercise\b[^>]*>/g)].map((m) => m[0]);

describe('exercises', () => {
  it.each(lessons)('%s numbers and titles every exercise', (lesson) => {
    const tags = opens(readFileSync(resolve(LESSONS, `${lesson}.mdx`), 'utf8'));
    for (const tag of tags) {
      expect(tag, `${lesson}: ${tag} sin title`).toMatch(/\btitle="[^"]+"/);
      expect(tag, `${lesson}: ${tag} sin n`).toMatch(/\bn="\d{2}"/);
    }
  });

  it.each(lessons)('%s numbers its exercises from 01 without gaps', (lesson) => {
    const ns = opens(readFileSync(resolve(LESSONS, `${lesson}.mdx`), 'utf8'))
      .map((tag) => tag.match(/\bn="(\d{2})"/)?.[1])
      .filter((n): n is string => n !== undefined);
    /* m2/03 continues M2's numbering across lesson files, so only the sequence has to hold. */
    for (let i = 1; i < ns.length; i += 1) {
      expect(Number(ns[i])).toBe(Number(ns[i - 1]) + 1);
    }
  });
});
