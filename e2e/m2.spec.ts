import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * M2 is four lessons. The theory opens it, the training and the measurement follow, the two
 * islands live in the third part, and the fourth is the corpus work that produced `medium-v4`.
 */
const THEORY = '/curso/m2/01-el-decoder/';
const TRAINING = '/curso/m2/02-entrenar-y-medir/';
const INSIDE = '/curso/m2/03-exportar-y-mirar-dentro/';
const DATA = '/curso/m2/04-mas-datos-no-mas-red/';

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
 * Both islands read JSON from `src/data/`, committed as an empty placeholder until the controller
 * runs the real training. Every assertion here works in both states: `pending` while the JSON is
 * the placeholder, `ready` once `pnpm sync:data` brings the measured numbers.
 */
async function stateOf(island: Locator): Promise<'pending' | 'ready'> {
  const state = await island.getAttribute('data-state');
  expect(['pending', 'ready'], `unexpected island state: ${state}`).toContain(state);
  return state as 'pending' | 'ready';
}

test.describe('lesson M2, AttentionMap and TrainingReplay', () => {
  test('the four parts chain in order and only the last one carries the cheatsheet', async ({
    page,
  }) => {
    await page.goto(THEORY);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('El decoder');
    await expect(page.locator('.prose h2').first()).toHaveText('Qué vas a construir');
    await expect(page.locator('.prose h2', { hasText: 'Teoría justa' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${TRAINING}$`));
    await expect(page.locator('.prose h2', { hasText: 'Cómo se mide' }).first()).toBeVisible();
    /* The four labs of this part are exercises with a solution each. */
    expect(await page.locator('.prose details').count()).toBeGreaterThanOrEqual(4);
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${INSIDE}$`));
    await expect(page.locator('.prose h2').first()).toContainText('Lab 5');
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${DATA}$`));
    await expect(page.locator('.prose h2', { hasText: 'escalera' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(1);
  });

  test('both islands render without console or page errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });
    await page.goto(INSIDE);
    const replay = await hydrated(page, 'data-training-replay');
    const attention = await hydrated(page, 'data-attention-map');
    expect(await stateOf(replay)).toBeTruthy();
    expect(await stateOf(attention)).toBeTruthy();
    await page.waitForLoadState('networkidle');
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('AttentionMap: pending notice, or a heat map whose controls work', async ({ page }) => {
    await page.goto(INSIDE);
    const island = await hydrated(page, 'data-attention-map');
    if ((await stateOf(island)) === 'pending') {
      await expect(island).toContainText(/Pendiente/);
      await expect(island.locator('.am-table')).toHaveCount(0);
      return;
    }
    await expect(island.locator('.am-table')).toHaveCount(1);
    await expect(island.locator('[data-legend]')).toBeVisible();
    const cells = island.locator('.am-cell');
    expect(await cells.count()).toBeGreaterThan(0);
    /* Changing the head redraws the map: the island records the selection on the root node. */
    const head = island.getByLabel('Cabeza');
    await head.selectOption({ index: 1 });
    await expect(island).toHaveAttribute('data-head', '1');
    await island.getByLabel(/Jugada que mira/).selectOption({ index: 1 });
    await expect(island.locator('[data-readout]')).toContainText(/atención/);
  });

  test('TrainingReplay: pending notice, or a chart the slider moves', async ({ page }) => {
    await page.goto(INSIDE);
    const island = await hydrated(page, 'data-training-replay');
    if ((await stateOf(island)) === 'pending') {
      await expect(island).toContainText(/Pendiente/);
      await expect(island.locator('svg')).toHaveCount(0);
      return;
    }
    await expect(island.locator('svg')).toHaveCount(1);
    await expect(island.locator('[data-numbers]')).toBeVisible();
    const before = await island.getAttribute('data-step');
    const slider = island.getByRole('slider', { name: 'Checkpoint' });
    await slider.focus();
    await slider.press('Home');
    await expect(island).not.toHaveAttribute('data-step', before as string);
  });

  for (const lesson of [THEORY, TRAINING, INSIDE, DATA]) {
    test(`axe: no serious or critical violations on ${lesson}`, async ({ page }) => {
      await page.goto(lesson);
      if (lesson === INSIDE) {
        await hydrated(page, 'data-training-replay');
        await hydrated(page, 'data-attention-map');
      }
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

  test('CSP: hash-only script-src and no violations with both islands hydrated', async ({
    page,
  }) => {
    const cspMessages: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) cspMessages.push(message.text());
    });
    await page.goto(INSIDE);
    const csp = await page
      .locator('meta[http-equiv="content-security-policy"]')
      .getAttribute('content');
    expect(csp, 'CSP meta must exist').toBeTruthy();
    const scriptSrc = directive(csp as string, 'script-src');
    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);
    await hydrated(page, 'data-training-replay');
    await hydrated(page, 'data-attention-map');
    await page.waitForLoadState('networkidle');
    expect(cspMessages, cspMessages.join('\n')).toEqual([]);
  });

  test('no horizontal scroll at 390px with both islands rendered', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(INSIDE);
    await hydrated(page, 'data-training-replay');
    await hydrated(page, 'data-attention-map');
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(fits, 'page must not scroll horizontally').toBe(true);
  });
});
