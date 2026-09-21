import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * M6 is three lessons and no new model: the results part carries the single table (a sortable
 * island) and the two figures of the milestone's own measurements -- the floor of the ladder and
 * what the exports cost. Both read JSON the labs exported, so a "pendiente" state on a published
 * lesson would mean the sync was skipped: this spec insists on real numbers.
 */
const THEORY = '/curso/m6/01-evaluar/';
const RESULTS = '/curso/m6/02-lo-que-salio/';
const LABS = '/curso/m6/03-labs-de-cierre/';

test.describe('lesson M6, the table and its measured figures', () => {
  test('the three parts chain in order, and the labs part closes with the cheatsheet', async ({
    page,
  }) => {
    await page.goto(THEORY);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Evaluar');
    await expect(page.locator('.prose h2').first()).toHaveText('Qué vas a construir');
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${RESULTS}$`));
    await expect(page.locator('.prose h2', { hasText: 'La tabla' }).first()).toBeVisible();
    await expect(page.locator('.prose h2', { hasText: 'Los criterios' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${LABS}$`));
    await expect(page.locator('.prose h2').first()).toHaveText('Labs');
    await expect(page.locator('.prose h3', { hasText: 'Lab 7' })).toHaveCount(1);
    await expect(page.locator('.cheat')).toHaveCount(1);
  });

  test('the two figures carry the measured numbers, not a placeholder', async ({ page }) => {
    await page.goto(RESULTS);
    const ladder = page.locator('figure[data-ladder-floor]');
    await expect(ladder).toHaveAttribute('data-state', 'ready');
    await expect(ladder.locator('figcaption')).toBeVisible();
    const label = await ladder.locator('svg[role="img"]').getAttribute('aria-label');
    expect(label).toContain('1538');
    // Four runs, two per regime, and the spread of each pair printed in words.
    await expect(ladder.locator('.fig-ladder__spread')).toHaveCount(2);

    const parity = page.locator('figure[data-parity-cost]');
    await expect(parity).toHaveAttribute('data-state', 'ready');
    const parityLabel = await parity.locator('svg[role="img"]').first().getAttribute('aria-label');
    expect(parityLabel).toContain('int8');
  });

  test('the leaderboard sorts by a column and marks the baselines', async ({ page }) => {
    await page.goto(RESULTS);
    const board = page.locator('[data-leaderboard]');
    await expect(board).toHaveAttribute('data-state', 'ready');
    // `client:visible`: the island hydrates once it scrolls into view, and Astro drops the `ssr`
    // attribute when it has. Clicking a header before that sorts nothing.
    await board.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island', { has: board })).not.toHaveAttribute('ssr', '');
    const rows = board.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(12);
    // The external rows are flagged, and Karvonen is one of them.
    await expect(board.locator('.lb__row--baseline')).toHaveCount(2);
    await expect(board.locator('.lb__row--baseline', { hasText: 'karvonen' })).toHaveCount(1);

    const eloHeader = board.locator('th', { hasText: 'Elo' }).first();
    await eloHeader.getByRole('button').click();
    await expect(eloHeader).toHaveAttribute('aria-sort', /descending|ascending/);
    const first = await rows.first().locator('th').textContent();
    await eloHeader.getByRole('button').click();
    const flipped = await rows.first().locator('th').textContent();
    expect(first).not.toBe(flipped);
  });

  for (const lesson of [THEORY, RESULTS, LABS]) {
    test(`no horizontal scroll at 390px on ${lesson}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(lesson);
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );
      expect(fits, `${lesson} overflows a 390px viewport`).toBe(true);
    });

    test(`the lesson has no accessibility violations on ${lesson}`, async ({ page }) => {
      await page.goto(lesson);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
