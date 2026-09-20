import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const lessons = globSync('src/content/lessons/**/*.mdx', { cwd: root });

describe('lesson figures', () => {
  it('finds the lessons', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  it('keeps SVG out of MDX, because Prettier and MDX disagree about it', () => {
    // Prettier breaks every JSX element's children onto their own line. MDX then reads a
    // multi-line body as markdown and wraps it in a `<p>`, and a `<p>` inside SVG makes the HTML
    // parser close the `<svg>` and spill the rest into the page as loose text. The M0 and M1
    // figures shipped that way from P0 -- an empty rectangle and nine stray paragraphs -- and
    // nobody noticed, because the page still rendered.
    //
    // Collapsing the lines by hand does not hold: the next `pnpm format` puts them back. The
    // fix that holds is where the SVG lives. An `.astro` template is HTML, so the formatter and
    // the compiler agree, and figures belong in components anyway.
    const offenders = lessons.filter((file) =>
      /<svg[\s>]/.test(readFileSync(resolve(root, file), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps every figure caption non-empty', () => {
    for (const file of lessons) {
      const source = readFileSync(resolve(root, file), 'utf8');
      for (const [, caption] of source.matchAll(/<Figure[^>]*\scaption="([^"]*)"/g)) {
        expect(caption.trim().length, `${file}: empty caption`).toBeGreaterThan(20);
      }
    }
  });
});
