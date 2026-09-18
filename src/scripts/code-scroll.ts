/**
 * Code blocks that overflow horizontally must be reachable with the keyboard
 * (WCAG 2.1.1): give them tabindex="0" so arrow keys can scroll them.
 */
document.querySelectorAll<HTMLElement>('.expressive-code pre').forEach((pre) => {
  if (pre.scrollWidth > pre.clientWidth && !pre.hasAttribute('tabindex')) {
    pre.tabIndex = 0;
  }
});
