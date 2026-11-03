import { LANG_INFO, LANGS, type Lang, type Translations } from '../lib/i18n';
import { useT } from './i18n';

/** Editable text for each language. Azerbaijani maps to the main columns, the rest to `translations`. */
export type Texts<K extends string> = Record<Lang, Record<K, string>>;

export function readTexts<K extends string>(keys: readonly K[], base: Partial<Record<K, string>> | null | undefined, translations: Translations<K> | null | undefined): Texts<K> {
  const pick = (source: Partial<Record<K, string>> | null | undefined) =>
    Object.fromEntries(keys.map((key) => [key, source?.[key] ?? ''])) as Record<K, string>;
  return { az: pick(base), ru: pick(translations?.ru), en: pick(translations?.en) };
}

/** Trims text and leaves out blanks, so a cleared field goes back to the Azerbaijani fallback. */
export function writeTranslations<K extends string>(keys: readonly K[], texts: Texts<K>): Translations<K> {
  const result: Translations<K> = {};
  for (const lang of ['ru', 'en'] as const) {
    const entries = keys.map((key) => [key, texts[lang][key].trim()] as const).filter(([, value]) => value);
    if (entries.length) result[lang] = Object.fromEntries(entries) as Partial<Record<K, string>>;
  }
  return result;
}

const isFilled = <K extends string>(values: Record<K, string>, keys: readonly K[]) => keys.every((key) => values[key].trim());

/**
 * Switches which language the form's text fields edit. A dot marks a language still missing the
 * given required-looking fields, so untranslated items are easy to spot.
 */
export function LangTabs<K extends string>({ value, onChange, texts, watch }: { value: Lang; onChange: (lang: Lang) => void; texts: Texts<K>; watch: readonly K[] }) {
  const t = useT();
  return (
    <div className="lang-tabs-wrap">
      <div className="lang-tabs" role="group" aria-label={t.languageTabs}>
        {LANGS.map((code) => {
          const missing = !isFilled(texts[code], watch);
          return (
            <button key={code} type="button" lang={code} aria-pressed={code === value} onClick={() => onChange(code)}>
              {LANG_INFO[code].name}
              {missing && <i className="lang-tab-dot" title={t.notTranslated}><span className="visually-hidden"> ({t.notTranslated})</span></i>}
            </button>
          );
        })}
      </div>
      {value !== 'az' && <p className="lang-hint muted">{t.fallbackHint}</p>}
    </div>
  );
}
