import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * M4 is ten lessons, and its five animated figures are spread over four of them: the two LoRA
 * figures with the theory, the hole in the Elo axis where the corpus is rebuilt, the adapter swap
 * where the adapter is exported, the shrinking interval with the results. Each figure sits in the
 * lesson that makes its argument, so this spec walks those four plus the one the cheatsheet hangs
 * off.
 */
const PARTS = {
  '/curso/m4/01-fine-tuning/': ['fig--lora', 'fig--spectrum'],
  '/curso/m4/02-tokens-de-elo/': ['fig--axis'],
  '/curso/m4/06-adaptadores-y-publicacion/': ['fig--swap'],
  '/curso/m4/09-lo-que-salio/': ['fig--shrink'],
} as const;
const THEORY = '/curso/m4/01-fine-tuning/';
const RESULTS = '/curso/m4/09-lo-que-salio/';
const LABS = '/curso/m4/10-labs-de-afinado/';

/** Scrolls an island into view and waits until Astro has hydrated it (`ssr` attribute gone). */
async function hydrated(page: Page, marker: string): Promise<Locator> {
  const island = page.locator(`[${marker}]`);
  await island.scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island:not([ssr])').filter({ has: island })).toHaveCount(1);
  return island;
}

test.describe('lesson M4 and its animated figures', () => {
  test('the module chains in order, and the last lesson closes with the cheatsheet', async ({
    page,
  }) => {
    await page.goto(THEORY);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fine-tuning');
    await expect(page.locator('.prose h2').first()).toHaveText('Qué vas a construir');
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(/\/curso\/m4\/02-tokens-de-elo\/$/);
    await expect(page.locator('.prose h2', { hasText: 'El agujero' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.goto(RESULTS);
    await expect(page.locator('.prose h2', { hasText: 'Lo que salió' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.goto(LABS);
    /* Every lab carries the command that runs it, not only the code it describes. */
    expect(await page.locator('.prose pre').count()).toBeGreaterThanOrEqual(9);
    await expect(page.locator('.cheat')).toHaveCount(1);
  });

  test('every figure actually animates', async ({ page }) => {
    // The three figures shipped static once. Their CSS lived in the components' own `<style>`
    // blocks, and a scoped style inside an `.astro` component used from an MDX lesson never
    // reaches the page in this setup: no error, no warning, nothing moved. The CSS lives in
    // `global.css` now, and this is the assertion that says so.
    for (const [lesson, figures] of Object.entries(PARTS)) {
      await page.goto(lesson);
      for (const figure of figures) {
        const running = await page
          .locator(`figure.${figure}`)
          .evaluate(
            (node) =>
              [...node.querySelectorAll('*')].filter(
                (element) => getComputedStyle(element).animationName !== 'none',
              ).length,
          );
        expect(running, `${figure} has no running animation`).toBeGreaterThan(0);
      }
    }
  });

  test('no figure writes outside its own viewBox', async ({ page }) => {
    // An SVG that overflows its viewBox does not scroll or wrap: the text is simply cut off, and
    // it is cut off differently at every width, so a screenshot at one size proves nothing.
    for (const [lesson, figures] of Object.entries(PARTS)) {
      await page.goto(lesson);
      for (const figure of figures) {
        const spilled = await page.locator(`figure.${figure} svg`).evaluate((svg) => {
          const box = (svg as SVGSVGElement).viewBox.baseVal;
          return [...svg.querySelectorAll('text')]
            .filter((text) => {
              const b = (text as SVGGraphicsElement).getBBox();
              return (
                b.x < -0.5 || b.x + b.width > box.width + 0.5 || b.y + b.height > box.height + 0.5
              );
            })
            .map((text) => text.textContent?.trim().slice(0, 40));
        });
        expect(spilled, `${figure} writes outside its viewBox`).toEqual([]);
      }
    }
  });

  test('a figure fits the reading column at every width', async ({ page }) => {
    for (const width of [390, 860, 1440, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [lesson, figures] of Object.entries(PARTS)) {
        await page.goto(lesson);
        const prose = (await page.locator('.prose').boundingBox())!;
        for (const figure of figures) {
          const svg = (await page.locator(`figure.${figure} svg`).first().boundingBox())!;
          if (Math.round(prose.width) >= 560) {
            expect(Math.round(svg.width), `${figure} at ${width}`).toBeLessThanOrEqual(
              Math.round(prose.width) + 1,
            );
          } else {
            // Below 560 px the figure keeps its size and scrolls inside its own box, so the
            // type stays legible; what must never happen is the page scrolling sideways.
            expect(Math.round(svg.width), `${figure} at ${width}`).toBeGreaterThanOrEqual(559);
            const fits = await page.evaluate(
              () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            );
            expect(fits, `${figure} at ${width} overflows the page`).toBe(true);
          }
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(overflow, `horizontal overflow at ${width} on ${lesson}`).toBe(false);
      }
    }
  });

  for (const lesson of [THEORY, RESULTS, LABS]) {
    test(`no paragraph starts mid-sentence on ${lesson}`, async ({ page }) => {
      // MDX turns a line that starts with `<` into a block, so a `<Term>` that Prettier moved to
      // the head of a line silently splits the paragraph it was inside. It renders without an
      // error and reads as two broken sentences.
      await page.goto(lesson);
      const broken = await page.locator('.prose').evaluate((prose) =>
        [...prose.querySelectorAll('p')]
          .filter((p) => {
            const text = p.textContent?.trim() ?? '';
            if (!/^[a-záéíóúñ]/.test(text)) return false;
            // A paragraph may legitimately start with inline code (`medium-v4 afinado...`).
            return !p.querySelector(':scope > code:first-child');
          })
          .map((p) => p.textContent?.trim().slice(0, 60)),
      );
      expect(broken).toEqual([]);
    });
  }

  test('the EloDial island hydrates and says what it knows', async ({ page }) => {
    await page.goto(RESULTS);
    const island = await hydrated(page, 'data-elo-dial');
    const state = await island.getAttribute('data-state');
    expect(['pending', 'ready']).toContain(state);
    if (state === 'pending') {
      await expect(island).toContainText('Pendiente');
      return;
    }
    // Every condition the chart draws has to be one it actually measured.
    await expect(island.locator('.ed__row')).not.toHaveCount(0);
    await expect(island.locator('.ed__verdict')).toContainText(/monótonas|no monótonas/);
    await expect(island.locator('.ed__verdict')).toContainText(/separados|no separados/);
  });

  for (const lesson of [THEORY, RESULTS, LABS]) {
    test(`no serious or critical accessibility violations on ${lesson}`, async ({ page }) => {
      await page.goto(lesson);
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
});
