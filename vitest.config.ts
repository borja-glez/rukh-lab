/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/* Astro's Vite config lets tests import .astro components (the MDX registry). */
export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
});
