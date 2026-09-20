import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const lessons = globSync('src/content/lessons/**/*.mdx', { cwd: root });

describe('lesson figures', () => {
  it('finds the lessons', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  it('never leaves an SVG text body on its own line', () => {
    // MDX treats the content of a JSX element as markdown when it spans lines, so
    //   <text x="70" y="94">
    //     historial
    //   </text>
    // compiles to `<text><p>historial</p></text>`. A `<p>` inside SVG makes the HTML parser
    // close the <svg> and spill everything after it into the page as plain text: the M0 flow
    // diagram shipped from P0 as one empty rectangle and nine stray paragraphs, and nobody
    // noticed because the page still rendered. The body has to sit on the same line as its tag.
    const multiline = /<text\b[^>]*>[^\S\n]*\n/;
    const offenders = lessons.filter((file) =>
      multiline.test(readFileSync(resolve(root, file), 'utf8')),
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
