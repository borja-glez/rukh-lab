import { expect, test, type Page } from '@playwright/test';

/**
 * /como-funciona-un-llm/: the figures move only when they should, every link into the course
 * lands on a real heading, the widgets respond, and the page holds together on a phone.
 */
const PAGE = '/como-funciona-un-llm/';

async function animatedCount(page: Page, scope: string): Promise<number> {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(`${selector} *`)].filter(
        (element) => getComputedStyle(element).animationName !== 'none',
      ).length,
    scope,
  );
}

test.describe('the figures of /como-funciona-un-llm/', () => {
  test('every figure marked animated has something that animates', async ({ page }) => {
    await page.goto(PAGE);
    const figures = page.locator('[data-llm-fig][data-animated]');
    const count = await figures.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < count; i++) {
      const moving = await figures
        .nth(i)
        .evaluate(
          (figure) =>
            [...figure.querySelectorAll('svg *')].filter(
              (element) => getComputedStyle(element).animationName !== 'none',
            ).length,
        );
      const label = await figures.nth(i).locator('figcaption').innerText();
      expect(moving, `figure without animation: ${label.slice(0, 60)}`).toBeGreaterThan(0);
    }
  });

  test('nothing in a figure moves under prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(PAGE);
    expect(await animatedCount(page, '[data-llm-fig] svg')).toBe(0);
    await expect(page.locator('[data-llm-toggle]').first()).toBeHidden();
    await context.close();
  });

  test('figures wait off screen, start on screen and can be paused', async ({ page }) => {
    await page.goto(PAGE);
    const last = page.locator('[data-llm-fig][data-animated]').last();
    await expect(last).toHaveAttribute('data-hold', '');
    await last.scrollIntoViewIfNeeded();
    await expect(last).not.toHaveAttribute('data-hold', '');
    await last.locator('[data-llm-toggle]').click();
    await expect(last).toHaveAttribute('data-paused', '');
    const states = await last.evaluate((figure) =>
      [...figure.querySelectorAll('svg *')]
        .filter((element) => getComputedStyle(element).animationName !== 'none')
        .map((element) => getComputedStyle(element).animationPlayState),
    );
    expect(new Set(states)).toEqual(new Set(['paused']));
    await expect(last.locator('[data-llm-toggle]')).toHaveText('reanudar');
  });

  test('no animated figure draws outside its viewBox in any frame', async ({ page }) => {
    await page.goto(PAGE);
    const svgs = page.locator('[data-llm-fig][data-animated] svg[viewBox]');
    const count = await svgs.count();
    for (let i = 0; i < count; i++) {
      const svg = svgs.nth(i);
      await svg.scrollIntoViewIfNeeded();
      const spilled = await svg.evaluate((element) => {
        const svg = element as SVGSVGElement;
        const box = svg.viewBox.baseVal;
        const out: string[] = [];
        const animations = svg.getAnimations({ subtree: true });
        for (let step = 0; step <= 10; step++) {
          for (const animation of animations) {
            animation.pause();
            const timing = animation.effect?.getComputedTiming();
            const duration = Number(timing?.duration ?? 0);
            const delay = Number(timing?.delay ?? 0);
            animation.currentTime = delay + (duration * step) / 10;
          }
          const frame = svg.getBoundingClientRect();
          const scale = frame.width / box.width;
          for (const shape of svg.querySelectorAll('rect, line, circle, path, text, polygon')) {
            const b = shape.getBoundingClientRect();
            if (b.width === 0 && b.height === 0) continue;
            const left = (b.left - frame.left) / scale;
            const right = (b.right - frame.left) / scale;
            const top = (b.top - frame.top) / scale;
            const bottom = (b.bottom - frame.top) / scale;
            if (left < -1 || top < -1 || right > box.width + 1 || bottom > box.height + 1) {
              out.push(`${shape.tagName} "${shape.textContent?.slice(0, 20)}" at ${step * 10} %`);
            }
          }
        }
        return out;
      });
      const label = (await svg.getAttribute('aria-label'))?.slice(0, 50);
      expect(spilled, `${label} draws outside its viewBox`).toEqual([]);
    }
  });
});

test.describe('links from /como-funciona-un-llm/', () => {
  test('every link into the course lands on a lesson and a heading that exist', async ({
    page,
    request,
  }) => {
    await page.goto(PAGE);
    const hrefs = await page
      .locator('.llm-course a[href^="/curso/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(30);
    const pages = new Map<string, string>();
    for (const href of hrefs) {
      const [path, hash] = href.split('#');
      if (!pages.has(path)) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(200);
        pages.set(path, await response.text());
      }
      if (hash) {
        const html = pages.get(path)!;
        const id = decodeURIComponent(hash);
        expect(html.includes(`id="${id}"`), `${href}: no heading with that id`).toBe(true);
      }
    }
  });

  test('every glossary link points to a term on /glosario/', async ({ page }) => {
    await page.goto(PAGE);
    const ids = await page
      .locator('.term__link')
      .evaluateAll((links) => [
        ...new Set(links.map((a) => new URL((a as HTMLAnchorElement).href).hash.slice(1))),
      ]);
    await page.goto('/glosario/');
    for (const id of ids) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  });

  test('the index jumps to every chapter', async ({ page }) => {
    await page.goto(PAGE);
    const targets = await page
      .locator('[data-llm-toc-link]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    for (const target of targets) await expect(page.locator(target!)).toHaveCount(1);
  });
});

test.describe('the widgets of /como-funciona-un-llm/', () => {
  test('the BPE stepper merges, counts and undoes', async ({ page }) => {
    await page.goto(PAGE);
    const widget = page.locator('.bpe');
    await widget.scrollIntoViewIfNeeded();
    const next = widget.getByRole('button', { name: 'Siguiente fusión' });
    await next.click();
    await expect(widget.locator('.bpe__status')).toContainText('Fusión 1: a + t → at');
    await next.click();
    await expect(widget.locator('.bpe__status')).toContainText('Fusión 2: at + o → ato');
    await widget.getByRole('button', { name: 'Deshacer' }).click();
    await expect(widget.locator('.bpe__status')).toContainText('Fusión 1');
  });
});

test('the page holds together on a phone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const toc = page.locator('[data-llm-toc]');
  await expect(toc).not.toHaveAttribute('open', '');
  await toc.locator('summary').click();
  await toc.locator('[data-llm-toc-link="muestreo"]').click();
  await expect(toc).not.toHaveAttribute('open', '');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
