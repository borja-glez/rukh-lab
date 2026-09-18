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

// https://astro.build/config
export default defineConfig({
  site: 'https://lab.rukh.borjaglez.com',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
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
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES', en: 'en' },
      },
    }),
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
