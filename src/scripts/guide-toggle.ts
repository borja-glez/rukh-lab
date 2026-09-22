import { GUIDE_STORAGE_KEY } from '../lib/site';

/**
 * Folds the lesson guide (module lessons + table of contents) away so the article gets the
 * width back on tighter screens. The state lives on <html data-guide="hidden">, which the
 * inline head script (theme-init.js) restores before paint, so a reload never flashes the
 * guide open and then shut.
 */

const root = document.documentElement;
const button = document.querySelector<HTMLButtonElement>('[data-guide-toggle]');

function sync() {
  if (!button) return;
  const hidden = root.dataset.guide === 'hidden';
  const label = hidden ? button.dataset.labelShow : button.dataset.labelHide;
  button.setAttribute('aria-expanded', String(!hidden));
  if (label) {
    button.setAttribute('aria-label', label);
    button.title = label;
  }
}

button?.addEventListener('click', () => {
  const hide = root.dataset.guide !== 'hidden';
  if (hide) root.dataset.guide = 'hidden';
  else delete root.dataset.guide;
  try {
    if (hide) localStorage.setItem(GUIDE_STORAGE_KEY, 'hidden');
    else localStorage.removeItem(GUIDE_STORAGE_KEY);
  } catch {
    /* localStorage unavailable: the choice holds for this page only */
  }
  sync();
});

sync();
