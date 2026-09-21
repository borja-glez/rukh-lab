import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/curso/', '/curso/m0/00-taller/'];

for (const path of PAGES) {
  test(`axe: no serious or critical violations on ${path}`, async ({ page }) => {
    await page.goto(path);
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

for (const path of PAGES) {
  test(`no horizontal scroll and 44px touch targets at 390px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      header: (() => {
        const header = document.querySelector('header');
        return header ? header.scrollWidth <= header.clientWidth : true;
      })(),
    }));
    expect(overflow.page, 'page must not scroll horizontally').toBe(true);
    expect(overflow.header, 'header must not scroll horizontally').toBe(true);

    const small = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-theme-option], .expressive-code .copy button',
        ),
      )
        .map((el) => ({
          label: el.getAttribute('aria-label') ?? el.className,
          ...el.getBoundingClientRect(),
        }))
        .filter((r) => r.width < 44 || r.height < 44)
        .map((r) => `${r.label}: ${Math.round(r.width)}x${Math.round(r.height)}`),
    );
    expect(small, 'every toggle and copy button is at least 44x44').toEqual([]);
  });
}

test('landmarks, skip link and language are in place', async ({ page }) => {
  await page.goto('/curso/m0/00-taller/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
});

test('the site is Spanish only: every page declares lang="es" and /en/ is gone', async ({
  page,
}) => {
  for (const path of ['/proyecto/', '/curso/', '/glosario/']) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  }
  const response = await page.goto('/en/');
  expect(response?.status()).toBe(404);
});
