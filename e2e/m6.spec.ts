import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * M6 is nine lessons and no new model: the results lesson carries the single table (a sortable
 * island) and the two figures of the milestone's own measurements -- the floor of the ladder and
 * what the exports cost. Both read JSON the labs exported, so a "pendiente" state on a published
 * lesson would mean the sync was skipped: this spec insists on real numbers.
 */
const THEORY = '/curso/m6/01-evaluar/';
const RESULTS = '/curso/m6/08-lo-que-salio/';
const LABS = '/curso/m6/09-labs-de-cierre/';

test.describe('lesson M6, the table and its measured figures', () => {
  test('the module chains in order, and the labs lesson closes with the cheatsheet', async ({
    page,
  }) => {
    await page.goto(THEORY);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Evaluar');
    await expect(page.locator('.prose h2').first()).toHaveText('Qué vas a construir');
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(/\/curso\/m6\/02-la-escalera-calibrada\/$/);
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.goto(RESULTS);
    await expect(page.locator('.prose h2', { hasText: 'La tabla' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.goto(LABS);
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

/**
 * The animated figures of M6. Their CSS lives in `global.css` for the reason `m4.spec.ts`
 * gives: a scoped style inside an `.astro` component used from an MDX lesson never reaches the
 * page, and the only symptom is that nothing moves. These figures are bare `<svg>`s inside the
 * lesson's `<Figure>`, so the class sits on the `<svg>` itself.
 */
const ANIMATED_FIGURES: Record<string, string[]> = {
  '/curso/m6/01-evaluar/': ['fig--quant'],
};

async function runningIn(page: import('@playwright/test').Page, figure: string): Promise<number> {
  return page
    .locator(`svg.${figure}`)
    .evaluate(
      (svg) =>
        [...svg.querySelectorAll('*')].filter(
          (element) => getComputedStyle(element).animationName !== 'none',
        ).length,
    );
}

test.describe('the animated figures of M6', () => {
  test('every animated figure actually animates', async ({ page }) => {
    for (const [lesson, figures] of Object.entries(ANIMATED_FIGURES)) {
      await page.goto(lesson);
      for (const figure of figures) {
        await expect(page.locator(`svg.${figure}`)).toHaveCount(1);
        expect(await runningIn(page, figure), `${figure} has no running animation`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  test('every animation stops under prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const [lesson, figures] of Object.entries(ANIMATED_FIGURES)) {
      await page.goto(lesson);
      for (const figure of figures) {
        expect(await runningIn(page, figure), `${figure} still moves`).toBe(0);
      }
    }
    await context.close();
  });

  test('no animated figure draws outside its viewBox in any frame', async ({ page }) => {
    // The static check (texts inside the viewBox) says nothing about a window that hops or a bar
    // that grows. Every animation is paused at eleven points of its cycle and every shape is
    // measured there, in viewBox units.
    for (const [lesson, figures] of Object.entries(ANIMATED_FIGURES)) {
      await page.goto(lesson);
      for (const figure of figures) {
        const spilled = await page.locator(`svg.${figure}`).evaluate((svg) => {
          const box = (svg as SVGSVGElement).viewBox.baseVal;
          const out: string[] = [];
          const animations = svg.getAnimations({ subtree: true });
          for (let step = 0; step <= 10; step++) {
            for (const animation of animations) {
              animation.pause();
              const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
              animation.currentTime = (duration * step) / 10;
            }
            const frame = svg.getBoundingClientRect();
            const scale = frame.width / box.width;
            for (const shape of svg.querySelectorAll('rect, line, circle, path, text')) {
              const b = shape.getBoundingClientRect();
              if (b.width === 0 && b.height === 0) continue;
              const left = (b.left - frame.left) / scale;
              const right = (b.right - frame.left) / scale;
              const top = (b.top - frame.top) / scale;
              const bottom = (b.bottom - frame.top) / scale;
              if (
                left < -0.5 ||
                top < -0.5 ||
                right > box.width + 0.5 ||
                bottom > box.height + 0.5
              ) {
                out.push(`${shape.tagName} at ${step * 10} %`);
              }
            }
          }
          return out;
        });
        expect(spilled, `${figure} draws outside its viewBox`).toEqual([]);
      }
    }
  });
});
