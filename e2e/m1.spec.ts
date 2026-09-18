import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const LESSON = '/curso/m1/01-datos-y-tokenizacion/';

function directive(csp: string, name: string): string | undefined {
  return csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `) || d === name);
}

/** Scrolls the island into view and waits until Astro has hydrated it (`ssr` attribute gone). */
async function hydrated(page: Page): Promise<Locator> {
  const island = page.locator('[data-tokenizer-playground]');
  await island.scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island:not([ssr])').filter({ has: island })).toHaveCount(1);
  await expect(island).toHaveAttribute('data-state', 'ok');
  return island;
}

test.describe('lesson M1 and TokenizerPlayground', () => {
  test('the lesson loads with its sections and the cheatsheet', async ({ page }) => {
    await page.goto(LESSON);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Del PGN al tensor');
    const h2 = page.locator('.prose h2');
    await expect(h2.first()).toHaveText('Qué vas a construir');
    expect(await h2.count()).toBeGreaterThanOrEqual(7);
    await expect(page.locator('[data-tokenizer-stats]')).toHaveCount(1);
  });

  test('the playground tokenizes the default PGN with three counters > 0', async ({ page }) => {
    await page.goto(LESSON);
    const island = await hydrated(page);
    const counters = island.locator('[data-count]');
    await expect(counters).toHaveCount(3);
    for (const counter of await counters.all()) {
      const value = Number(await counter.getAttribute('data-count'));
      expect(value).toBeGreaterThan(0);
    }
    /* The default miniature has 13 plies: 13 moves + 5 control tokens in the UCI scheme. */
    await expect(island.locator('[data-scheme="uci"] [data-count]')).toHaveAttribute(
      'data-count',
      '18',
    );
    await expect(island.locator('[data-scheme="uci"] .tp-chip--move').first()).toContainText(
      'e2e4',
    );
  });

  test('an invalid PGN shows a friendly error instead of tokens', async ({ page }) => {
    await page.goto(LESSON);
    const island = await hydrated(page);
    const textarea = island.getByRole('textbox', { name: /PGN/ });
    await textarea.fill('1. e4 e5 2. Nf9 Nc6');
    await expect(island).toHaveAttribute('data-state', 'error');
    await expect(island.locator('[role="alert"]')).toContainText(/No he podido leer/);
    await expect(island.locator('[data-count]')).toHaveCount(0);
  });

  test('a long game raises the 200-token warning', async ({ page }) => {
    await page.goto(LESSON);
    const island = await hydrated(page);
    await island.getByRole('button', { name: /Partida larga/ }).click();
    await expect(island).toHaveAttribute('data-state', 'ok');
    await expect(island.locator('[data-warning]').first()).toBeVisible();
  });

  test('axe: no serious or critical violations', async ({ page }) => {
    await page.goto(LESSON);
    await hydrated(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n'),
    ).toEqual([]);
  });

  test('CSP: hash-only script-src and no violations with the island hydrated', async ({ page }) => {
    const cspMessages: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) cspMessages.push(message.text());
    });
    await page.goto(LESSON);
    const csp = await page
      .locator('meta[http-equiv="content-security-policy"]')
      .getAttribute('content');
    expect(csp).toBeTruthy();
    expect(directive(csp as string, 'script-src')).not.toContain("'unsafe-inline'");
    expect(directive(csp as string, 'style-src')).not.toContain("'unsafe-inline'");
    await hydrated(page);
    await page.waitForLoadState('networkidle');
    expect(cspMessages, cspMessages.join('\n')).toEqual([]);
  });

  test('no horizontal scroll at 390px with the island rendered', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(LESSON);
    await hydrated(page);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(fits, 'page must not scroll horizontally').toBe(true);
  });
});
