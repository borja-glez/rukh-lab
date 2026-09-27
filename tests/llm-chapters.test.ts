import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../src/data/llm-chapters';

const root = resolve(__dirname, '..');
const glossary = JSON.parse(
  readFileSync(resolve(root, 'src/content/glossary/terms.json'), 'utf8'),
) as { id: string }[];
const termIds = new Set(glossary.map((t) => t.id));
const chapterFiles = readdirSync(resolve(root, 'src/components/llm/chapters'));
const page = readFileSync(resolve(root, 'src/pages/como-funciona-un-llm.astro'), 'utf8');

describe('llm chapters', () => {
  it('have unique ids and consecutive numbers', () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
    CHAPTERS.forEach((c, i) => expect(c.n).toBe(String(i).padStart(2, '0')));
  });

  it('link only to lessons that exist', () => {
    for (const chapter of CHAPTERS) {
      for (const link of chapter.links) {
        const file = resolve(root, `src/content/lessons/${link.lesson}.mdx`);
        expect(existsSync(file), `${chapter.id} → ${link.lesson}`).toBe(true);
      }
    }
  });

  it('list only glossary terms that exist', () => {
    for (const chapter of CHAPTERS) {
      for (const id of chapter.terms) expect(termIds.has(id), `${chapter.id} → ${id}`).toBe(true);
    }
  });

  it('each have one chapter file, rendered by the page, that uses its id', () => {
    for (const chapter of CHAPTERS) {
      const file = chapterFiles.find((f) => f.startsWith(`Ch${chapter.n}`));
      expect(file, `no chapter file for ${chapter.n}`).toBeDefined();
      const source = readFileSync(resolve(root, 'src/components/llm/chapters', file!), 'utf8');
      expect(source).toContain(`<Chapter id="${chapter.id}">`);
      expect(page).toContain(`chapters/${file}`);
    }
  });

  it('never start a prose line with an inline JSX tag, which MDX would split off', () => {
    // A line that opens with `<Term` is read by MDX as a block element: Prettier then puts a blank
    // line before it and the sentence breaks in two paragraphs.
    for (const file of chapterFiles) {
      const source = readFileSync(resolve(root, 'src/components/llm/chapters', file), 'utf8');
      expect(source, file).not.toMatch(/^<Term\b/m);
    }
  });
});
