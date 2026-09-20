import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = '/curso/m5/01-alineamiento/';

/**
 * The six figures this lesson adds. Five of them are static on purpose, which is a change from M4
 * and worth stating: M4's figures animate because the motion *is* the explanation -- an interval
 * shrinking, a marker walking a spectrum. M5's compare measured numbers against each other, and a
 * number does not become clearer by moving. The one exception is `fig--group`, where the dashed
 * baseline settling onto the group's mean is the step readers reconstruct wrongly.
 */
const FIGURES = [
  'fig--noise',
  'fig--bands',
  'fig--group',
  'fig--hacked',
  'fig--intransitive',
  'fig--overopt',
] as const;

const ANIMATED = 'fig--group';

test.describe('lesson M5 and its measured figures', () => {
  test('the lesson loads with its sections', async ({ page }) => {
    await page.goto(LESSON);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Alineamiento');
    const h2 = page.locator('.prose h2');
    await expect(h2.first()).toHaveText('Qué vas a construir');
    await expect(page.locator('.prose h2', { hasText: 'El instrumento' }).first()).toBeVisible();
    await expect(page.locator('.prose h2', { hasText: 'Lo que salió' }).first()).toBeVisible();
    await expect(page.locator('.prose h2', { hasText: 'Los criterios' }).first()).toBeVisible();
    await expect(page.locator('.prose h2', { hasText: 'Labs' }).first()).toBeVisible();
  });

  test('every figure is on the page and describes itself to a screen reader', async ({ page }) => {
    // The figures carry the milestone's numbers, so a missing one is a missing result. And an SVG
    // of bars with no label is a decoration: the `aria-label` is what makes it a figure.
    await page.goto(LESSON);
    for (const figure of FIGURES) {
      const node = page.locator(`figure.${figure}`);
      await expect(node).toHaveCount(1);
      const label = await node.locator('svg[role="img"]').getAttribute('aria-label');
      expect(label, `${figure} needs an aria-label that says what it measured`).toBeTruthy();
      expect(label!.length).toBeGreaterThan(80);
      await expect(node.locator('figcaption')).toBeVisible();
    }
  });

  test('only the figure whose motion explains something animates', async ({ page }) => {
    await page.goto(LESSON);
    for (const figure of FIGURES) {
      const running = await page
        .locator(`figure.${figure}`)
        .evaluate(
          (node) =>
            [...node.querySelectorAll('*')].filter(
              (element) => getComputedStyle(element).animationName !== 'none',
            ).length,
        );
      if (figure === ANIMATED) {
        expect(running, 'the baseline has to settle onto the mean').toBeGreaterThan(0);
      } else {
        expect(running, `${figure} compares numbers; motion would be decoration`).toBe(0);
      }
    }
  });

  test('the one animation stops under prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(LESSON);
    const running = await page
      .locator(`figure.${ANIMATED}`)
      .evaluate(
        (node) =>
          [...node.querySelectorAll('*')].filter(
            (element) => getComputedStyle(element).animationName !== 'none',
          ).length,
      );
    expect(running).toBe(0);
    await context.close();
  });

  test('the glossary terms of the module resolve', async ({ page }) => {
    // A `<Term>` whose id is not in the glossary throws at build time, so this checks the other
    // half: that the anchor it links to exists on the glossary page.
    await page.goto(LESSON);
    const ids = await page
      .locator('.term__link')
      .evaluateAll((nodes) =>
        [...new Set(nodes.map((node) => (node as HTMLAnchorElement).hash.slice(1)))].sort(),
      );
    expect(ids.length).toBeGreaterThanOrEqual(10);
    await page.goto('/glosario/');
    for (const id of ids) {
      await expect(page.locator(`#${id}`), `${id} is linked but not defined`).toHaveCount(1);
    }
  });

  test('the lesson has no accessibility violations', async ({ page }) => {
    await page.goto(LESSON);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
