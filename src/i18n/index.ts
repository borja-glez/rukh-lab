import es from './es.json';
import type { Locale } from '../lib/site';

export type Dictionary = typeof es;

const dictionaries: Record<Locale, Dictionary> = { es };

export function getDictionary(locale: Locale = 'es'): Dictionary {
  return dictionaries[locale];
}
