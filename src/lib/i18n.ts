export const LANGS = ['az', 'ru', 'en'] as const;
export type Lang = (typeof LANGS)[number];
/** Azerbaijani lives in the main columns; the others are stored in each row's `translations`. */
export type SecondaryLang = Exclude<Lang, 'az'>;
export const DEFAULT_LANG: Lang = 'az';

export const LANG_INFO: Record<Lang, { short: string; name: string }> = {
  az: { short: 'AZ', name: 'Azərbaycan dili' },
  ru: { short: 'RU', name: 'Русский' },
  en: { short: 'EN', name: 'English' },
};

export type Translations<K extends string> = Partial<Record<SecondaryLang, Partial<Record<K, string>>>>;

export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/** The text for a language, falling back to Azerbaijani when that translation is blank. */
export function translated<K extends string>(row: Record<K, string> & { translations?: Translations<K> | null }, key: K, lang: Lang): string {
  if (lang === 'az') return row[key];
  return row.translations?.[lang]?.[key]?.trim() || row[key];
}

/** Russian nouns change form with the number: 1 работа, 2 работы, 5 работ. */
export function russianPlural(n: number, one: string, few: string, many: string): string {
  const form = new Intl.PluralRules('ru').select(n);
  return `${n} ${form === 'one' ? one : form === 'few' ? few : many}`;
}

export function readStoredLang(key: string): Lang | null {
  try {
    const value = localStorage.getItem(key);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLang(key: string, lang: Lang) {
  try {
    localStorage.setItem(key, lang);
  } catch {
    // Private browsing can block storage; the choice just won't be remembered.
  }
}
