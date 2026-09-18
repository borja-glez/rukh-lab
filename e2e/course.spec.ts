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
    await expect(page.locator('.prose h2')).toHaveCount(6);
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
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(2);
    for (const href of await links.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute('href')),
    )) {
      expect(href).toBeTruthy();
      const response = await page.request.get(href as string);
      expect(response.status(), `${href} should resolve`).toBe(200);
    }
    await links.first().click();
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
