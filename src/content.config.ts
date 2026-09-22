import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const artifact = z.object({
  kind: z.enum([
    'repo',
    'dataset',
    'tokenizer',
    'model',
    'adapter',
    'demo',
    'post',
    'report',
    'bot',
  ]),
  label: z.string(),
  href: z.url().optional(),
});

const modules = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/modules' }),
  schema: z.object({
    title: z.string(),
    phase: z.union([z.literal(1), z.literal(2)]),
    /**
     * Planned estimate, in hours, and only for modules with no published lesson. A module
     * that has lessons derives its time from them (`src/lib/hours.ts`); writing it twice is
     * how the two numbers drifted apart.
     */
    hours: z.number().positive().optional(),
    status: z.enum(['draft', 'live', 'planned']),
    summary: z.string(),
    outcomes: z.array(z.string()).min(1),
    artifacts: z.array(artifact),
    order: z.number().int().nonnegative(),
  }),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    module: z.string().regex(/^(m[0-6]|a[1-6])$/),
    order: z.number().int().nonnegative(),
    /** Time at the keyboard: reading, writing code, doing the exercises, in minutes. */
    duration: z.number().int().positive(),
    /**
     * Wall clock with nobody in front of it: GPU training, downloads, engine matches, in
     * minutes, on the reference machine. Taken from `rukh/docs/reproducir.md` and the
     * runbooks. Omitted by lessons whose labs run in seconds.
     */
    runtime: z.number().int().nonnegative().optional(),
    level: z.enum(['base', 'medio', 'avanzado']),
    status: z.enum(['borrador', 'vigente']),
    updated: z.coerce.date(),
    keywords: z.array(z.string()),
    artifacts: z.array(artifact).optional(),
    /** Query string for the demo, e.g. `?mock=1`. */
    demo: z.string().optional(),
  }),
});

const glossary = defineCollection({
  loader: file('./src/content/glossary/terms.json'),
  schema: z.object({
    term: z.string(),
    definition: z.string(),
    module: z.string().regex(/^(m[0-6]|a[1-6])$/),
    aliases: z.array(z.string()),
  }),
});

const cheatsheets = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/cheatsheets' }),
  schema: z.object({
    module: z.string().regex(/^(m[0-6]|a[1-6])$/),
    items: z.array(z.object({ q: z.string(), a: z.string() })).min(1),
  }),
});

export const collections = { modules, lessons, glossary, cheatsheets };
