import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as registry from '../src/components/mdx/index';

/** The lesson components listed in docs/04-web-curso.md. */
const REQUIRED = [
  'Callout',
  'Exercise',
  'Solution',
  'Term',
  'Figure',
  'Tabs',
  'NotebookLink',
  'ModelBadge',
  'ResultsTable',
  'DemoEmbed',
] as const;

describe('MDX component registry', () => {
  it.each(REQUIRED)('exports %s', (name) => {
    expect(registry, `src/components/mdx/index.ts must export ${name}`).toHaveProperty(name);
    expect(registry[name]).toBeTruthy();
  });

  it('exports a `components` map with every required name for <Content components={...} />', () => {
    for (const name of REQUIRED) {
      expect(registry.components).toHaveProperty(name);
    }
  });

  it('has one .astro file per required component', () => {
    const files = readdirSync(resolve(__dirname, '../src/components/mdx'));
    for (const name of REQUIRED) {
      expect(files).toContain(`${name}.astro`);
    }
  });
});
