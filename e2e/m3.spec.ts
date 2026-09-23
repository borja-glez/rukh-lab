import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * M3 is eleven lessons. This spec walks the three that carry something only a browser can check:
 * the opening, the measurement lesson, and the labs with the ValueBar island and the cheatsheet.
 */
const THEORY = '/curso/m3/01-el-encoder/';
const MEASURE = '/curso/m3/08-medir-sin-enganarse/';
const LABS = '/curso/m3/11-labs-del-encoder/';

function directive(csp: string, name: string): string | undefined {
  return csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `) || d === name);
}

/** Scrolls an island into view and waits until Astro has hydrated it (`ssr` attribute gone). */
async function hydrated(page: Page, marker: string): Promise<Locator> {
  const island = page.locator(`[${marker}]`);
  await island.scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island:not([ssr])').filter({ has: island })).toHaveCount(1);
  return island;
}

/**
 * ValueBar reads `src/data/value-bar.json`, committed as an empty placeholder until the controller
 * runs the real fine-tuning. Every assertion here works in both states: `pending` while the JSON is
 * the placeholder, `ready` once `pnpm sync:data` brings the measured curves.
 */
async function stateOf(island: Locator): Promise<'pending' | 'ready'> {
  const state = await island.getAttribute('data-state');
  expect(['pending', 'ready'], `unexpected island state: ${state}`).toContain(state);
  return state as 'pending' | 'ready';
}

test.describe('lesson M3 and the ValueBar island', () => {
  test('the module chains in order, and the labs lesson closes with the cheatsheet', async ({
    page,
  }) => {
    await page.goto(THEORY);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('El encoder');
    await expect(page.locator('.prose h2').first()).toHaveText('Qué vas a construir');
    await expect(page.locator('.prose h2', { hasText: 'Teoría justa' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.locator('.lesson__nav-link--next').click();
    await expect(page).toHaveURL(/\/curso\/m3\/02-capas-compartidas\/$/);
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.goto(MEASURE);
    await expect(page.locator('.prose h2', { hasText: 'Cómo se mide' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(0);

    await page.goto(LABS);
    await expect(page.locator('.prose h2').first()).toHaveText('Labs');
    /* The five labs are exercises with a solution each. */
    expect(await page.locator('.prose details').count()).toBeGreaterThanOrEqual(5);
    /* The 39 M encoder the Hub serves is told here, after the labs that trained the 15 M one. */
    await expect(page.locator('.prose h2', { hasText: '39 millones' }).first()).toBeVisible();
    await expect(page.locator('.cheat')).toHaveCount(1);
  });

  test('the island renders without console or page errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });
    await page.goto(LABS);
    const island = await hydrated(page, 'data-value-bar');
    expect(await stateOf(island)).toBeTruthy();
    await page.waitForLoadState('networkidle');
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('ValueBar: pending notice, or two curves the scrubber walks', async ({ page }) => {
    await page.goto(LABS);
    const island = await hydrated(page, 'data-value-bar');
    if ((await stateOf(island)) === 'pending') {
      await expect(island).toContainText(/Pendiente/);
      await expect(island.locator('svg')).toHaveCount(0);
      return;
    }
    /* Ready: the advantage bar plus the two-curve chart, and both series are drawn. */
    await expect(island.locator('.vb__bar')).toHaveCount(1);
    await expect(island.locator('.vb__svg')).toHaveCount(1);
    await expect(island.locator('.vb__line--encoder')).toHaveCount(1);
    await expect(island.locator('.vb__line--stockfish')).toHaveCount(1);
    await expect(island.locator('[data-numbers]')).toBeVisible();
    await expect(island.locator('[data-flags]')).toBeVisible();
    /* The sign is readable without colour: the readout names whose advantage it is. */
    await expect(island.locator('[data-readout]')).toContainText(/ventaja|igualada|sin valorar/);
    const before = await island.getAttribute('data-ply');
    const slider = island.getByRole('slider', { name: /Media jugada/ });
    await slider.focus();
    await slider.press('End');
    await expect(island).not.toHaveAttribute('data-ply', before as string);
  });

  for (const lesson of [THEORY, MEASURE, LABS]) {
    test(`axe: no serious or critical violations on ${lesson}`, async ({ page }) => {
      await page.goto(lesson);
      if (lesson === LABS) await hydrated(page, 'data-value-bar');
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

  test('CSP: hash-only script-src and no violations with the island hydrated', async ({ page }) => {
    const cspMessages: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) cspMessages.push(message.text());
    });
    await page.goto(LABS);
    const csp = await page
      .locator('meta[http-equiv="content-security-policy"]')
      .getAttribute('content');
    expect(csp, 'CSP meta must exist').toBeTruthy();
    const scriptSrc = directive(csp as string, 'script-src');
    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);
    await hydrated(page, 'data-value-bar');
    await page.waitForLoadState('networkidle');
    expect(cspMessages, cspMessages.join('\n')).toEqual([]);
  });

  test('no horizontal scroll at 390px with the island rendered', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(LABS);
    await hydrated(page, 'data-value-bar');
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(fits, 'page must not scroll horizontally').toBe(true);
  });
});

/**
 * The animated figures of M3. Their CSS lives in `global.css` for the reason `m4.spec.ts`
 * gives: a scoped style inside an `.astro` component used from an MDX lesson never reaches the
 * page, and the only symptom is that nothing moves. These figures are bare `<svg>`s inside the
 * lesson's `<Figure>`, so the class sits on the `<svg>` itself.
 */
const ANIMATED_FIGURES: Record<string, string[]> = {
  '/curso/m3/08-medir-sin-enganarse/': ['fig--operating'],
};

async function runningIn(page: import('@playwright/test').Page, figure: string): Promise<number> {
  return page
    .locator(`svg.${figure}`)
    .evaluate(
      (svg) =>
        [...svg.querySelectorAll('*')].filter(
          (element) => getComputedStyle(element).animationName !== 'none',
        ).length,
    );
}

test.describe('the animated figures of M3', () => {
  test('every animated figure actually animates', async ({ page }) => {
    for (const [lesson, figures] of Object.entries(ANIMATED_FIGURES)) {
      await page.goto(lesson);
      for (const figure of figures) {
        await expect(page.locator(`svg.${figure}`)).toHaveCount(1);
        expect(await runningIn(page, figure), `${figure} has no running animation`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  test('every animation stops under prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const [lesson, figures] of Object.entries(ANIMATED_FIGURES)) {
      await page.goto(lesson);
      for (const figure of figures) {
        expect(await runningIn(page, figure), `${figure} still moves`).toBe(0);
      }
    }
    await context.close();
  });

  test('no animated figure draws outside its viewBox in any frame', async ({ page }) => {
    // The static check (texts inside the viewBox) says nothing about a window that hops or a bar
    // that grows. Every animation is paused at eleven points of its cycle and every shape is
    // measured there, in viewBox units.
    for (const [lesson, figures] of Object.entries(ANIMATED_FIGURES)) {
      await page.goto(lesson);
      for (const figure of figures) {
        const spilled = await page.locator(`svg.${figure}`).evaluate((svg) => {
          const box = (svg as SVGSVGElement).viewBox.baseVal;
          const out: string[] = [];
          const animations = svg.getAnimations({ subtree: true });
          for (let step = 0; step <= 10; step++) {
            for (const animation of animations) {
              animation.pause();
              const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
              animation.currentTime = (duration * step) / 10;
            }
            const frame = svg.getBoundingClientRect();
            const scale = frame.width / box.width;
            for (const shape of svg.querySelectorAll('rect, line, circle, path, text')) {
              const b = shape.getBoundingClientRect();
              if (b.width === 0 && b.height === 0) continue;
              const left = (b.left - frame.left) / scale;
              const right = (b.right - frame.left) / scale;
              const top = (b.top - frame.top) / scale;
              const bottom = (b.bottom - frame.top) / scale;
              if (
                left < -0.5 ||
                top < -0.5 ||
                right > box.width + 0.5 ||
                bottom > box.height + 0.5
              ) {
                out.push(`${shape.tagName} at ${step * 10} %`);
              }
            }
          }
          return out;
        });
        expect(spilled, `${figure} draws outside its viewBox`).toEqual([]);
      }
    }
  });
});
