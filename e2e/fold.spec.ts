import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The plumbing folds and the lab pointers. A code lesson keeps its ML path visible and folds the
 * rest; it ends with the labs that run what it built, and each lab links back.
 */
const LESSON = '/curso/m1/02-de-pgn-a-uci/';
const LABS = '/curso/m1/10-labs-del-pipeline/';

test.describe('folds and lab pointers', () => {
  test('a fold starts closed, opens from its summary, and opens for printing', async ({ page }) => {
    await page.goto(LESSON);
    const folds = page.locator('details[data-fold]');
    expect(await folds.count()).toBeGreaterThan(0);
    for (const fold of await folds.all()) {
      await expect(fold).not.toHaveAttribute('open', '');
    }

    const first = folds.first();
    const code = first.locator('.expressive-code').first();
    await expect(code).toBeHidden();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await expect(code).toBeVisible();
    await first.locator('summary').click();
    await expect(code).toBeHidden();

    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    for (const fold of await folds.all()) {
      await expect(fold).toHaveAttribute('open', '');
    }
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(first).not.toHaveAttribute('open', '');
  });

  test('the summary is a keyboard control with a readable name', async ({ page }) => {
    await page.goto(LESSON);
    const summary = page.locator('details[data-fold] > summary').first();
    await expect(summary).toContainText('Fontanería');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('details[data-fold]').first()).toHaveAttribute('open', '');
  });

  test('the lesson points at its lab, and the lab points back', async ({ page }) => {
    await page.goto(LESSON);
    const pointer = page.getByRole('note', { name: /Labs? de esta lección/ });
    const link = pointer.getByRole('link', { name: /^Lab 2/ });
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^\/curso\/m1\/10-labs-del-pipeline\/#lab-2/);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${LABS}#lab-2`));
    const id = decodeURIComponent(new URL(page.url()).hash.slice(1));
    const heading = page.locator(`[id="${id}"]`);
    await expect(heading).toHaveText(/^Lab 2/);

    const back = heading
      .locator('xpath=following-sibling::p[contains(@class, "lab-origin")][1]')
      .getByRole('link');
    await expect(back).toHaveAttribute('href', LESSON);
  });

  test('a lesson with folds has no axe violations', async ({ page }) => {
    await page.goto(LESSON);
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
});
