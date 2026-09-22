import { expect, test } from '@playwright/test';

/**
 * A glossary popover never gets cut off by the edge of the window.
 *
 * `Term.astro` anchors the popover to the term with `left: 0`, which is right until the term sits
 * near the right margin: at 763 px the definition of `token` ran off the edge and lost half its
 * text. `scripts/term-popover.ts` measures on hover and shifts it back; this is the seam, at the
 * widths where the failure actually appeared.
 *
 * Measuring means laying the popover out: it is `display: none` until `:hover` matches, and a
 * `display: none` box reports zeros, which is exactly the bug the script had on its first pass.
 */

const LESSON = '/curso/m0/00-taller/';

/** The gutter the page keeps; a popover flush against the edge is not "inside" in any useful sense. */
const MARGIN = 8;

const WIDTHS = [763, 900, 1024, 1440];

for (const width of WIDTHS) {
  test(`every glossary popover stays inside the window at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(LESSON);

    const terms = page.locator('[data-term]');
    const count = await terms.count();
    expect(count, 'the lesson should carry glossary terms').toBeGreaterThan(5);

    const offscreen = await page.evaluate((margin) => {
      const bad: { term: string; left: number; right: number }[] = [];
      for (const term of document.querySelectorAll<HTMLElement>('[data-term]')) {
        const pop = term.querySelector<HTMLElement>('[data-term-pop]');
        if (!pop) continue;
        term.dispatchEvent(new PointerEvent('pointerenter'));
        pop.style.display = 'block';
        const box = pop.getBoundingClientRect();
        pop.style.display = '';
        if (box.right > window.innerWidth - margin || box.left < 0) {
          bad.push({
            term: term.querySelector('.term__link')?.textContent?.trim() ?? '?',
            left: Math.round(box.left),
            right: Math.round(box.right),
          });
        }
      }
      return bad;
    }, MARGIN);

    expect(offscreen, `popovers cut off at ${width}px`).toEqual([]);
  });
}

test('the shift only applies where it is needed, and hovering does not widen the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 763, height: 900 });
  await page.goto(LESSON);

  const state = await page.evaluate(() => {
    let shifted = 0;
    let untouched = 0;
    for (const term of document.querySelectorAll<HTMLElement>('[data-term]')) {
      const pop = term.querySelector<HTMLElement>('[data-term-pop]');
      if (!pop) continue;
      term.dispatchEvent(new PointerEvent('pointerenter'));
      const shift = pop.style.getPropertyValue('--term-shift');
      if (shift === '' || shift === '0px') untouched += 1;
      else shifted += 1;
    }
    return {
      shifted,
      untouched,
      horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  /* A term with room keeps its natural position: the script corrects, it does not reposition. */
  expect(state.untouched).toBeGreaterThan(0);
  expect(state.shifted).toBeGreaterThan(0);
  expect(state.horizontalScroll, 'measuring a popover must not widen the page').toBe(false);
});
