import { defineConfig, devices } from '@playwright/test';

/* Default 4321 (CI); override locally with PORT=… when something else holds the port. */
const PORT = Number(process.env.PORT ?? 4321);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    /* --ignore-lock keeps Astro 7's preview in the foreground (it daemonizes without a TTY). */
    command: `pnpm preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
    url: `http://127.0.0.1:${PORT}/`,
    /* Never reuse a server we did not start: an occupied port fails loudly instead of testing a stranger. */
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
