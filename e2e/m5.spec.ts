import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * M5 is three lessons. The six figures are spread over the first two: the instrument and the
 * group baseline with the theory, the four comparisons of measured numbers with the results.
 * Five of the six are static on purpose, which is a change from M4 and worth stating: M4's
 * figures animate because the motion *is* the explanation -- an interval shrinking, a marker
 * walking a spectrum. M5's compare measured numbers against each other, and a number does not
 * become clearer by moving. The one exception is `fig--group`, where the dashed baseline
 * settling onto the group's mean is the step readers reconstruct wrongly.
 */
const THEORY = '/curso/m5/01-alineamiento/';
const RESULTS = '/curso/m5/02-lo-que-salio/';
const LABS = '/curso/m5/03-labs-de-alineamiento/';

const PARTS = {
  [THEORY]: ['fig--noise', 'fig--group'],
  [RESULTS]: ['fig--bands', 'fig--hacked', 'fig--intransitive', 'fig--overopt'],
} as const;

const ANIMATED = 'fig--group';

async function animationsIn(page: import('@playwright/test').Page, figure: string) {
  return page
    .locator(`figure.${figure}`)
    .evaluate(
      (node) =>
        [...node.querySelectorAll('*')].filter(
          (element) => getComputedStyle(element).animationName !== 'none',
        ).length,
    );
}

test.describe('lesson M5 and its measured figures', () => {
  test('the three parts chain in order, and the labs part closes with the cheatsheet', async ({
    page,
  }) => {
    await page.goto(THEORY);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Alineamiento');
    await expect(page.locator('.prose h2').first()).toHaveText('Qué vas a construir');
    await expect(page.locator('.prose h2', { hasText: 'El instrumento' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${RESULTS}$`));
    await expect(page.locator('.prose h2', { hasText: 'Lo que salió' }).first()).toBeVisible();
    await expect(page.locator('.prose h2', { hasText: 'Los criterios' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(new RegExp(`${LABS}$`));
    await expect(page.locator('.prose h2').first()).toHaveText('Labs');
    /* Eleven labs, and the three that train something end the module with their commands. */
    expect(await page.locator('.prose h3').count()).toBeGreaterThanOrEqual(11);
    await expect(page.locator('.prose h3', { hasText: 'Lab 11' })).toHaveCount(1);
    await expect(page.locator('.cheat')).toHaveCount(1);
  });

  test('every figure is on its page and describes itself to a screen reader', async ({ page }) => {
    // The figures carry the milestone's numbers, so a missing one is a missing result. And an SVG
    // of bars with no label is a decoration: the `aria-label` is what makes it a figure.
    for (const [lesson, figures] of Object.entries(PARTS)) {
      await page.goto(lesson);
      for (const figure of figures) {
        const node = page.locator(`figure.${figure}`);
        await expect(node).toHaveCount(1);
        const label = await node.locator('svg[role="img"]').getAttribute('aria-label');
        expect(label, `${figure} needs an aria-label that says what it measured`).toBeTruthy();
        expect(label!.length).toBeGreaterThan(80);
        await expect(node.locator('figcaption')).toBeVisible();
      }
    }
  });

  test('only the figure whose motion explains something animates', async ({ page }) => {
    for (const [lesson, figures] of Object.entries(PARTS)) {
      await page.goto(lesson);
      for (const figure of figures) {
        const running = await animationsIn(page, figure);
        if (figure === ANIMATED) {
          expect(running, 'the baseline has to settle onto the mean').toBeGreaterThan(0);
        } else {
          expect(running, `${figure} compares numbers; motion would be decoration`).toBe(0);
        }
      }
    }
  });

  test('the one animation stops under prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(THEORY);
    expect(await animationsIn(page, ANIMATED)).toBe(0);
    await context.close();
  });

  test('the glossary terms of the module resolve', async ({ page }) => {
    // A `<Term>` whose id is not in the glossary throws at build time, so this checks the other
    // half: that the anchor it links to exists on the glossary page.
    const ids = new Set<string>();
    for (const lesson of [THEORY, RESULTS, LABS]) {
      await page.goto(lesson);
      for (const id of await page
        .locator('.term__link')
        .evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).hash.slice(1)))) {
        ids.add(id);
      }
    }
    expect(ids.size).toBeGreaterThanOrEqual(10);
    await page.goto('/glosario/');
    for (const id of [...ids].sort()) {
      await expect(page.locator(`#${id}`), `${id} is linked but not defined`).toHaveCount(1);
    }
  });

  for (const lesson of [THEORY, RESULTS, LABS]) {
    test(`the lesson has no accessibility violations on ${lesson}`, async ({ page }) => {
      await page.goto(lesson);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
