import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/** M3 is three lessons: the theory, the measurement, and the labs with the ValueBar island. */
const THEORY = '/curso/m3/01-el-encoder/';
const MEASURE = '/curso/m3/02-medir-sin-enganarse/';
const LABS = '/curso/m3/03-labs-del-encoder/';

function directive(csp: string, name: string): string | undefined {
  return csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `) || d === name);
}

/** Scrolls an island into view and waits until Astro has hydrated it (`ssr` attribute gone). */
async function hydrated(page: Page, marker: string): Promise<Locator> {
  const island = page.locator(`[${marker}]`);
  await island.scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island:not([ssr])').filter({ has: island })).toHaveCount(1);
  return island;
}

/**
 * ValueBar reads `src/data/value-bar.json`, committed as an empty placeholder until the controller
 * runs the real fine-tuning. Every assertion here works in both states: `pending` while the JSON is
 * the placeholder, `ready` once `pnpm sync:data` brings the measured curves.
 */
async function stateOf(island: Locator): Promise<'pending' | 'ready'> {
  const state = await island.getAttribute('data-state');
  expect(['pending', 'ready'], `unexpected island state: ${state}`).toContain(state);
  return state as 'pending' | 'ready';
}

test.describe('lesson M3 and the ValueBar island', () => {
  test('the three parts chain in order, and the labs part closes with the cheatsheet', async ({
    page,
  }) => {
    await page.goto(THEORY);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('El encoder');
    await expect(page.locator('.prose h2').first()).toHaveText('Qué vas a construir');
    await expect(page.locator('.prose h2', { hasText: 'Teoría justa' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${MEASURE}$`));
    await expect(page.locator('.prose h2', { hasText: 'Cómo se mide' }).first()).toBeVisible();
    await expect(page.locator('.prose h2', { hasText: 'Fuga de datos' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${LABS}$`));
    await expect(page.locator('.prose h2').first()).toHaveText('Labs');
    /* The five labs are exercises with a solution each. */
    expect(await page.locator('.prose details').count()).toBeGreaterThanOrEqual(5);
    /* The 39 M encoder the Hub serves is told here, after the labs that trained the 15 M one. */
    await expect(page.locator('.prose h2', { hasText: '39 millones' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(1);
  });

  test('the island renders without console or page errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });
    await page.goto(LABS);
    const island = await hydrated(page, 'data-value-bar');
    expect(await stateOf(island)).toBeTruthy();
    await page.waitForLoadState('networkidle');
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('ValueBar: pending notice, or two curves the scrubber walks', async ({ page }) => {
    await page.goto(LABS);
    const island = await hydrated(page, 'data-value-bar');
    if ((await stateOf(island)) === 'pending') {
      await expect(island).toContainText(/Pendiente/);
      await expect(island.locator('svg')).toHaveCount(0);
      return;
    }
    /* Ready: the advantage bar plus the two-curve chart, and both series are drawn. */
    await expect(island.locator('.vb__bar')).toHaveCount(1);
    await expect(island.locator('.vb__svg')).toHaveCount(1);
    await expect(island.locator('.vb__line--encoder')).toHaveCount(1);
    await expect(island.locator('.vb__line--stockfish')).toHaveCount(1);
    await expect(island.locator('[data-numbers]')).toBeVisible();
    await expect(island.locator('[data-flags]')).toBeVisible();
    /* The sign is readable without colour: the readout names whose advantage it is. */
    await expect(island.locator('[data-readout]')).toContainText(/ventaja|igualada|sin valorar/);
    const before = await island.getAttribute('data-ply');
    const slider = island.getByRole('slider', { name: /Media jugada/ });
    await slider.focus();
    await slider.press('End');
    await expect(island).not.toHaveAttribute('data-ply', before as string);
  });

  for (const lesson of [THEORY, MEASURE, LABS]) {
    test(`axe: no serious or critical violations on ${lesson}`, async ({ page }) => {
      await page.goto(lesson);
      if (lesson === LABS) await hydrated(page, 'data-value-bar');
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
  }

  test('CSP: hash-only script-src and no violations with the island hydrated', async ({ page }) => {
    const cspMessages: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) cspMessages.push(message.text());
    });
    await page.goto(LABS);
    const csp = await page
      .locator('meta[http-equiv="content-security-policy"]')
      .getAttribute('content');
    expect(csp, 'CSP meta must exist').toBeTruthy();
    const scriptSrc = directive(csp as string, 'script-src');
    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);
    await hydrated(page, 'data-value-bar');
    await page.waitForLoadState('networkidle');
    expect(cspMessages, cspMessages.join('\n')).toEqual([]);
  });

  test('no horizontal scroll at 390px with the island rendered', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(LABS);
    await hydrated(page, 'data-value-bar');
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(fits, 'page must not scroll horizontally').toBe(true);
  });
});
