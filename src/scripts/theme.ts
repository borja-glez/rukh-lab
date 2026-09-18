import { isTheme, THEME_STORAGE_KEY, themeColors, type Theme } from '../lib/site';

/**
 * Light/dark toggle. Without a saved preference <html> carries no data-theme and
 * `prefers-color-scheme` decides; choosing one sets data-theme and persists it.
 * The initial application happens in the inline head script (theme-init.js) to
 * avoid a flash of the wrong scheme.
 */

const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-theme-option]'));

function resolvedTheme(): Theme {
  const explicit = root.dataset.theme;
  if (isTheme(explicit)) return explicit;
  return systemDark.matches ? 'dark' : 'light';
}

function syncControls() {
  const current = resolvedTheme();
  buttons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeOption === current));
  });
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', themeColors[current]);
}

function applyTheme(theme: Theme) {
  root.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* localStorage unavailable: the theme applies to this page only */
  }
  syncControls();
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const theme = button.dataset.themeOption;
    if (isTheme(theme)) applyTheme(theme);
  });
});

systemDark.addEventListener('change', syncControls);
syncControls();
