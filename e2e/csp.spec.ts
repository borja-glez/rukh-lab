import { expect, test } from '@playwright/test';

const LESSON = '/curso/m0/00-taller/';

function directive(csp: string, name: string): string | undefined {
  return csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `) || d === name);
}

test.describe('content security policy', () => {
  test('the lesson page has a CSP meta whose script-src has no unsafe-inline', async ({ page }) => {
    await page.goto(LESSON);
    const csp = await page
      .locator('meta[http-equiv="content-security-policy"]')
      .getAttribute('content');
    expect(csp, 'CSP meta must exist').toBeTruthy();
    const scriptSrc = directive(csp as string, 'script-src');
    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);
    const styleSrc = directive(csp as string, 'style-src');
    expect(styleSrc).toBeTruthy();
    expect(styleSrc).not.toContain("'unsafe-inline'");
    expect(directive(csp as string, 'default-src')).toBe("default-src 'self'");
  });

  test('the theme applies from localStorage without any CSP violation', async ({ page }) => {
    const cspMessages: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) cspMessages.push(message.text());
    });
    await page.goto(LESSON);
    await page.evaluate(() => localStorage.setItem('rukh:theme', 'dark'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    /* data-theme is set by the inline head script: if the CSP blocked it, it would be missing. */
    expect(
      await page.evaluate(() => document.documentElement.dataset.theme),
      'inline theme script must run under the CSP',
    ).toBe('dark');
    await page.evaluate(() => localStorage.setItem('rukh:theme', 'light'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(cspMessages, cspMessages.join('\n')).toEqual([]);
  });

  test('no CSP console errors on the main pages', async ({ page }) => {
    const cspMessages: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) cspMessages.push(message.text());
    });
    for (const path of ['/', '/curso/', LESSON, '/glosario/', '/cheatsheets/', '/proyecto/']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
    expect(cspMessages, cspMessages.join('\n')).toEqual([]);
  });
});
