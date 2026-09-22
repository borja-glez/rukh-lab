// @ts-check
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';

/**
 * The theme bootstrap script is inlined verbatim in <head> (see Base.astro) so the
 * page paints with the saved theme. Its CSP hash is derived from the same file, so
 * the two can never drift apart (tests/theme-script-hash.test.ts checks it too).
 */
const themeInit = readFileSync(new URL('./src/scripts/theme-init.js', import.meta.url), 'utf8');
/** @type {`sha256-${string}`} */
const themeInitHash = `sha256-${createHash('sha256').update(themeInit).digest('base64')}`;

/**
 * Lessons that were renumbered when phase 1 grew from nineteen lessons to fifty-seven.
 *
 * These URLs are not ours to retire. `rukh` writes them into every model and dataset card it
 * publishes (`hub.py` and `publish/links.py` hold them by hand), so they are live on Hugging Face,
 * in posts and in whatever anyone bookmarked. A static build turns each one into a redirect page,
 * which costs nothing and keeps them working. The cards should be updated in `rukh` too; until
 * then, these are what stands between a reader and a 404.
 */
const renumberedLessons = {
  '/curso/m1/02-labs-del-pipeline/': '/curso/m1/10-labs-del-pipeline/',
  /* M2 split this lesson in two; the training it was cited for is in the recipe. */
  '/curso/m2/02-entrenar-y-medir/': '/curso/m2/03-la-receta-de-entrenamiento/',
  '/curso/m2/03-exportar-y-mirar-dentro/': '/curso/m2/07-exportar-a-onnx/',
  '/curso/m2/04-mas-datos-no-mas-red/': '/curso/m2/11-mas-datos-no-mas-red/',
  '/curso/m3/02-medir-sin-enganarse/': '/curso/m3/08-medir-sin-enganarse/',
  '/curso/m3/03-labs-del-encoder/': '/curso/m3/11-labs-del-encoder/',
  '/curso/m4/02-lo-que-salio/': '/curso/m4/09-lo-que-salio/',
  '/curso/m4/03-labs-de-afinado/': '/curso/m4/10-labs-de-afinado/',
  '/curso/m5/02-lo-que-salio/': '/curso/m5/08-lo-que-salio/',
  '/curso/m5/03-labs-de-alineamiento/': '/curso/m5/09-labs-de-alineamiento/',
  '/curso/m6/02-lo-que-salio/': '/curso/m6/08-lo-que-salio/',
  '/curso/m6/03-labs-de-cierre/': '/curso/m6/09-labs-de-cierre/',
};

// https://astro.build/config
export default defineConfig({
  site: 'https://lab.rukh.borjaglez.com',
  trailingSlash: 'always',
  redirects: renumberedLessons,
  integrations: [
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      // Follows <html data-theme>; without it, prefers-color-scheme decides (like tokens.css).
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      useDarkModeMediaQuery: true,
      styleOverrides: {
        codeFontFamily: 'var(--font-mono)',
        uiFontFamily: 'var(--font-mono)',
        borderRadius: '0',
        borderColor: 'var(--line)',
        codeFontSize: '0.875rem',
        codeLineHeight: '1.6',
        frames: {
          shadowColor: 'transparent',
          editorActiveTabIndicatorTopColor: 'var(--accent)',
        },
      },
    }),
    mdx(),
    preact(),
    sitemap(),
  ],
  fonts: [
    {
      name: 'Bricolage Grotesque',
      cssVariable: '--font-display',
      provider: fontProviders.fontsource(),
      weights: ['300 800'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.fontsource(),
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        'frame-src https://rukh.borjaglez.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: {
        resources: ["'self'"],
        hashes: [themeInitHash],
      },
      /*
       * Syntax highlighting (expressive-code) colours tokens with inline `style`
       * attributes, which hashes cannot cover. Inline styles are allowed only for
       * attributes (`style-src-attr`); `style-src` itself stays hash-only and
       * scripts stay hash-only everywhere.
       */
      styleDirective: {
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
    },
  },
});
