import { expect, test } from '@playwright/test';

const LESSON = '/curso/m0/00-taller/';

test.describe('course navigation', () => {
  test('landing → curso → lesson 0', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Rukh · lab/);
    await page.getByRole('link', { name: 'Curso', exact: true }).first().click();
    await expect(page).toHaveURL(/\/curso\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dos fases, un artefacto.');
    await expect(page.locator('.module')).toHaveCount(13);

    await page
      .getByRole('link', { name: /Taller: repo, entorno, datos y tablero/ })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`${LESSON}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Taller');
    await expect(page.locator('.prose h2')).toHaveCount(7);
  });

  test('"Marcar completada" persists after reload and shows on the map', async ({ page }) => {
    await page.goto(LESSON);
    const button = page.locator('[data-progress-toggle]');
    await expect(button).toHaveAccessibleName(/Marcar completada/);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toContainText('Completada');
    expect(await page.evaluate(() => localStorage.getItem('rukh:progress:m0/00-taller'))).toBe('1');

    await page.reload();
    await expect(button).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/');
    await expect(page.locator('[data-progress-count][data-module="m0"]')).toHaveText('1/1');

    await page.goto(LESSON);
    await button.click();
    expect(
      await page.evaluate(() => localStorage.getItem('rukh:progress:m0/00-taller')),
    ).toBeNull();
  });

  test('prev/next navigation links exist and resolve', async ({ page }) => {
    await page.goto(LESSON);
    const nav = page.getByRole('navigation', { name: 'Lección anterior y siguiente' });
    const prev = nav.locator('a[rel="prev"]');
    const next = nav.locator('a[rel="next"]');
    await expect(prev).toHaveCount(1);
    await expect(next).toHaveCount(1);
    /* The first lesson of M0 has no previous lesson: "prev" goes back to the course map. */
    await expect(prev).toHaveAttribute('href', '/curso/');
    for (const link of [prev, next]) {
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
      const response = await page.request.get(href as string);
      expect(response.status(), `${href} should resolve`).toBe(200);
    }
    await prev.click();
    await expect(page).toHaveURL(/\/curso\/$/);
  });

  test('theme toggle sets data-theme and persists', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tema oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('rukh:theme'))).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('lesson layout', () => {
  test('the guide stays on screen while the article scrolls', async ({ page }) => {
    // It used to scroll away. `.lesson__sticky` had `position: sticky` and looked correct, but
    // the grid's `align-items: start` shrank its column to 462 px against a 15 528 px article,
    // and a sticky box can only travel inside its containing block. Scrolling is the only way
    // to see the difference, so the test scrolls.
    await page.goto(LESSON);
    const guide = page.locator('.lesson__sticky');
    await expect(guide).toBeVisible();

    await page.evaluate(() => window.scrollBy(0, 2000));
    await page.waitForTimeout(200);

    const box = await guide.boundingBox();
    expect(box).not.toBeNull();
    // Still on screen, pinned near the top rather than pushed off it.
    expect(box!.y).toBeGreaterThan(0);
    expect(box!.y).toBeLessThan(200);
  });

  test('the section rail travels with the article instead of sitting at the top', async ({
    page,
  }) => {
    // The same containing-block trap as the guide, one column over: `.rail` is sticky, but its
    // grid item was only as tall as the ticks, so it scrolled off after one screen.
    await page.goto(LESSON);
    const rail = page.locator('.rail');
    await expect(rail).toBeVisible();
    const before = (await rail.boundingBox())!;

    await page.evaluate(() => window.scrollBy(0, 2000));
    await page.waitForTimeout(200);

    const after = (await rail.boundingBox())!;
    // Still near the top of the viewport, not carried 2000 px above the fold.
    expect(after.y).toBeGreaterThan(0);
    expect(after.y).toBeLessThan(200);
    expect(after.y).toBeGreaterThan(before.y - 400);
  });

  test('the footer and the cheatsheet end where the text ends', async ({ page }) => {
    // Only `.prose` honoured the reading measure, so the rule above the footer, the prev/next
    // pair and the cheatsheet box ran past the paragraphs above them: 94 px at 1920, 294 px at
    // 2560. Blocks of a lesson share one column width.
    await page.setViewportSize({ width: 2560, height: 1200 });
    await page.goto(LESSON);
    const widthOf = async (selector: string) => {
      const box = (await page.locator(selector).first().boundingBox())!;
      return { x: Math.round(box.x), width: Math.round(box.width) };
    };
    const prose = await widthOf('.prose');
    for (const selector of ['.lesson__head', '.lesson__foot', '.lesson__nav', '.cheat']) {
      expect(await widthOf(selector), selector).toEqual(prose);
    }
  });

  test('a wide screen buys width without stretching the line length', async ({ page }) => {
    // A 4K monitor left two thirds of the page empty. The fix widens the canvas, but the
    // reading measure only grows a little: long lines are harder to read, not easier.
    await page.setViewportSize({ width: 2560, height: 1200 });
    await page.goto(LESSON);
    const grid = (await page.locator('.lesson__grid').boundingBox())!;
    const prose = (await page.locator('.prose').first().boundingBox())!;

    expect(grid.width).toBeGreaterThan(1400);
    // Roughly 70-90 characters: wide enough to use the screen, short enough to read.
    expect(prose.width).toBeGreaterThan(820);
    expect(prose.width).toBeLessThan(1100);
  });
});
