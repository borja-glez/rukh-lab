import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inlineMarkdown } from '../src/lib/inline-markdown';

/**
 * Read the definitions off disk rather than with `getCollection`: the content store is built by
 * `astro sync`, and CI runs the tests before any build, so the collection comes back empty there
 * and the walk below would pass over nothing.
 */
const terms = JSON.parse(
  readFileSync(resolve(__dirname, '../src/content/glossary/terms.json'), 'utf8'),
) as { id: string; definition: string }[];

describe('inlineMarkdown', () => {
  it('renders the three marks the definitions use', () => {
    expect(inlineMarkdown('el `ignore_index` de la **pérdida** y el grupo *es* el baseline')).toBe(
      'el <code>ignore_index</code> de la <strong>pérdida</strong> y el grupo <em>es</em> el baseline',
    );
  });

  it('escapes markup before anything else, so `<mask>` survives set:html', () => {
    expect(inlineMarkdown('el 80 % se sustituye por `<mask>`')).toBe(
      'el 80 % se sustituye por <code>&lt;mask&gt;</code>',
    );
    expect(inlineMarkdown('la aritmética `n > 3,84 / (Δp)²`')).toBe(
      'la aritmética <code>n &gt; 3,84 / (Δp)²</code>',
    );
    expect(inlineMarkdown('relleno con el token <pad> (id 0)')).toBe(
      'relleno con el token &lt;pad&gt; (id 0)',
    );
  });

  it('never lets a definition inject markup', () => {
    expect(inlineMarkdown('<script>alert(1)</script> & co.')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt; &amp; co.',
    );
  });

  it('leaves an asterisk inside a code span alone, as Markdown does', () => {
    expect(inlineMarkdown('`ventaja * log π` y **esto** sí')).toBe(
      '<code>ventaja * log π</code> y <strong>esto</strong> sí',
    );
  });

  it('leaves text with no marks untouched', () => {
    expect(inlineMarkdown('Una pasada completa por el conjunto de entrenamiento.')).toBe(
      'Una pasada completa por el conjunto de entrenamiento.',
    );
  });
});

describe('the glossary as it is written', () => {
  it('closes every backtick and every pair of asterisks', () => {
    expect(terms.length).toBeGreaterThan(100);
    for (const term of terms) {
      const definition = term.definition;
      expect(
        [...definition].filter((char) => char === '`').length % 2,
        `${term.id}: unclosed backtick`,
      ).toBe(0);
      expect((definition.match(/\*\*/g) ?? []).length % 2, `${term.id}: unclosed **`).toBe(0);
    }
  });

  it('renders every definition without leaving a mark behind', () => {
    for (const term of terms) {
      const html = inlineMarkdown(term.definition);
      expect(html, `${term.id}: backtick reached the page`).not.toContain('`');
      expect(html, `${term.id}: asterisk reached the page`).not.toContain('*');
    }
  });
});
