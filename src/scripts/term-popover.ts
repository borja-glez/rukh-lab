/**
 * Keeps a glossary popover inside the window.
 *
 * `Term.astro` anchors the popover to the term with `left: 0`, which is right for a term at the
 * start of a line and wrong for one near the end: at 763 px the popover of `token` ran off the
 * right edge and the definition was cut in half. Nothing in CSS can know how much room is left,
 * because the popover is positioned against the term, not the viewport.
 *
 * So measure. On the first hover or focus of each term, work out how far the popover would stick
 * out and write that back as a pixel shift. The popover only exists under `(hover: hover)`, so
 * this never runs on a touch screen, and a term that is never pointed at costs nothing.
 *
 * CSS anchor positioning with `position-try-fallbacks: flip-inline` would do this natively, but
 * only Chromium ships it; this is twenty lines and works everywhere.
 */

/** Matches the page gutter: the popover should not touch the edge either. */
const MARGIN = 16;

function place(term: HTMLElement): void {
  const pop = term.querySelector<HTMLElement>('[data-term-pop]');
  if (!pop) return;

  /*
    The popover is `display: none` until CSS `:hover` matches, and a `display: none` element
    measures as a zero-sized box at the origin -- which reads as "fits fine" and skips the
    correction. `pointerenter` runs before the browser paints the hover state, so laying it out
    hidden and undoing that in the same turn measures the real box without a flash.
    Unshifted, too, or each pass would compound the last one's correction.
  */
  pop.style.setProperty('--term-shift', '0px');
  pop.style.display = 'block';
  pop.style.visibility = 'hidden';
  const box = pop.getBoundingClientRect();
  pop.style.display = '';
  pop.style.visibility = '';

  const overflowRight = box.right - (window.innerWidth - MARGIN);
  if (overflowRight <= 0) return;

  /* Never push it so far left that the other edge goes off instead. */
  const shift = Math.min(overflowRight, Math.max(0, box.left - MARGIN));
  pop.style.setProperty('--term-shift', `${-Math.round(shift)}px`);
}

for (const term of document.querySelectorAll<HTMLElement>('[data-term]')) {
  /* `pointerenter` rather than `mouseover`: it does not fire again for each child node. */
  term.addEventListener('pointerenter', () => place(term));
  term.addEventListener('focusin', () => place(term));
}

/*
 * A resize invalidates every measurement at once. Clearing is enough: whichever term the reader
 * points at next measures itself again.
 */
let pending = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(pending);
  pending = window.setTimeout(() => {
    for (const pop of document.querySelectorAll<HTMLElement>('[data-term-pop]')) {
      pop.style.setProperty('--term-shift', '0px');
    }
  }, 150);
});
