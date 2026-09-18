import es from './es.json';
import en from './en.json';
import type { Locale } from '../lib/site';

export type Dictionary = typeof es;

const dictionaries: Record<Locale, Dictionary> = {
  es,
  en: en satisfies Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
