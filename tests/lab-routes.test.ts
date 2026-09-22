import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { labRoutes, routeLabels, type LabRoute } from '../src/data/lab-routes';

/**
 * The route table is written by hand next to the lessons, not generated from them, so the two
 * can drift: a lab renamed or added in the MDX, a row left behind in the data. These tests are
 * the seam. If one fails, the table is lying to a reader about what they have to run.
 */

const LESSONS = resolve(__dirname, '../src/content/lessons');
const read = (lesson: string) => readFileSync(resolve(LESSONS, `${lesson}.mdx`), 'utf8');

/** `### Lab 3b · La otra entrada` -> `Lab 3b`. Also matches the `## Lab 5` of m2/03. */
const labHeadings = (mdx: string): string[] =>
  [...mdx.matchAll(/^#{2,3} (Lab [^\s·]+)/gm)].map((m) => m[1]);

const lessonIds = Object.keys(labRoutes);

describe('lab routes', () => {
  it('covers every lesson that shows the table, and no others', () => {
    const shown = readdirSync(LESSONS, { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace(/\\/g, '/').replace(/\.mdx$/, ''))
      .filter((id) => read(id).includes('<LabRoutes'));
    expect(shown.sort()).toEqual(lessonIds.sort());
  });

  it.each(lessonIds)('%s passes its own id to the component', (lesson) => {
    expect(read(lesson)).toContain(`<LabRoutes lesson="${lesson}" />`);
  });

  it.each(lessonIds)('%s shows the table before its first lab', (lesson) => {
    const mdx = read(lesson);
    const table = mdx.indexOf('<LabRoutes');
    expect(table).toBeGreaterThan(-1);
    /* Where the labs are headings, the table goes above the first one. Where they are not --
       m2/04 numbers training runs, not labs -- it goes above the first command. */
    const first =
      labHeadings(mdx).length > 0 ? mdx.search(/^#{2,3} Lab /m) : mdx.indexOf('uv run rukh train');
    expect(table).toBeLessThan(first);
  });

  it.each(lessonIds.filter((id) => labHeadings(read(id)).length > 0))(
    '%s has one row per lab heading, in order',
    (lesson) => {
      const rows = labRoutes[lesson].map((r) => r.lab);
      expect(rows).toEqual(labHeadings(read(lesson)));
    },
  );

  const everyRow: [string, LabRoute][] = lessonIds.flatMap((lesson) =>
    labRoutes[lesson].map((r): [string, LabRoute] => [`${lesson} ${r.lab}`, r]),
  );

  it.each(everyRow)('%s is a complete contract', (_id, row) => {
    expect(row.what).not.toBe('');
    expect(row.gives).not.toBe('');
    expect(routeLabels[row.route]).toBeTruthy();
    /* A lab that costs machine time must say how much; one that costs nothing must not pretend. */
    if (row.route === 'con-gpu') expect(row.clock).not.toBe('—');
    if (row.route === 'observar') expect(row.clock).toBe('—');
  });
});
