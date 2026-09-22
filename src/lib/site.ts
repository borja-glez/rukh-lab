/** Site-wide constants shared by layouts, pages and scripts. */
export const SITE = {
  name: 'Rukh · lab',
  url: 'https://lab.rukh.borjaglez.com',
  demoUrl: 'https://rukh.borjaglez.com',
  githubUrl: 'https://github.com/borja-glez',
  hfUrl: 'https://huggingface.co/chorcat',
  portfolioUrl: 'https://borjaglez.com',
  author: 'Borja González',
  year: 2026,
} as const;

export const THEME_STORAGE_KEY = 'rukh:theme';
/** `hidden` when the reader folded the lesson guide away; theme-init.js restores it before paint. */
export const GUIDE_STORAGE_KEY = 'rukh:guide';
export const PROGRESS_PREFIX = 'rukh:progress:';

export const themes = ['light', 'dark'] as const;
export type Theme = (typeof themes)[number];

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (themes as readonly string[]).includes(value);
}

/** Browser chrome colour (meta theme-color) per scheme; mirrors `--paper`. */
export const themeColors: Record<Theme, string> = {
  light: '#f4f6f9',
  dark: '#0e1622',
};

/** The site is Spanish only for now; a translation would widen this and the dictionaries. */
export type Locale = 'es';

export const localeTags: Record<Locale, string> = {
  es: 'es-ES',
};
