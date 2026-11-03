import { createContext, useContext, useMemo, type ComponentProps } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { DEFAULT_LANG, LANG_INFO, LANGS, storeLang, translated, type Lang } from '../lib/i18n';
import { useCollection, useCollections, useProduct, useProducts } from '../lib/queries';
import type { Collection, Product } from '../lib/types';
import { SITE_STRINGS } from './strings';

export const LANG_STORAGE_KEY = 'soulart-lang';

/** "/ru/about" becomes { lang: "ru", path: "/about" }. Azerbaijani, the default, has no prefix. */
export function parsePath(pathname: string): { lang: Lang; path: string } {
  const match = /^\/(ru|en)(\/.*)?$/.exec(pathname);
  return match ? { lang: match[1] as Lang, path: match[2] || '/' } : { lang: DEFAULT_LANG, path: pathname };
}

export function localizePath(path: string, lang: Lang): string {
  return lang === DEFAULT_LANG ? path : `/${lang}${path === '/' ? '' : path}`;
}

const LangContext = createContext<{ lang: Lang; path: string }>({ lang: DEFAULT_LANG, path: '/' });
export const LangProvider = LangContext.Provider;
export const useLang = () => useContext(LangContext).lang;
export const useCurrentPath = () => useContext(LangContext).path;
export const useStrings = () => SITE_STRINGS[useLang()];

/** A router link that stays in the current language. */
export function Link({ to, ...props }: Omit<ComponentProps<typeof RouterLink>, 'to'> & { to: string }) {
  return <RouterLink to={localizePath(to, useLang())} {...props} />;
}

/** Plain links rather than buttons, so each language version can be opened in a new tab or found by search engines. */
export function LanguageSwitch() {
  const { lang, path } = useContext(LangContext);
  const t = useStrings();
  return (
    <nav className="lang-switch" aria-label={t.langNav}>
      {LANGS.map((code) => (
        <RouterLink
          key={code}
          to={localizePath(path, code)}
          lang={code}
          hrefLang={code}
          aria-label={LANG_INFO[code].name}
          aria-current={code === lang ? 'true' : undefined}
          onClick={() => storeLang(LANG_STORAGE_KEY, code)}
        >
          {LANG_INFO[code].short}
        </RouterLink>
      ))}
    </nav>
  );
}

function localizeCollection(collection: Collection, lang: Lang): Collection {
  return { ...collection, name: translated(collection, 'name', lang), description: translated(collection, 'description', lang) };
}

function localizeProduct(product: Product, lang: Lang): Product {
  const parent = product.collection;
  return {
    ...product,
    name: translated(product, 'name', lang),
    description: translated(product, 'description', lang),
    collection: parent ? { ...parent, name: translated(parent, 'name', lang) } : parent,
  };
}

/* The queries below return content already in the visitor's language, so switching needs no new request. */
export function useSiteCollections() {
  const lang = useLang();
  const query = useCollections();
  const data = useMemo(() => query.data?.map((c) => localizeCollection(c, lang)), [query.data, lang]);
  return { data, isPending: query.isPending, isError: query.isError, isSuccess: query.isSuccess };
}

export function useSiteCollection(slug: string) {
  const lang = useLang();
  const query = useCollection(slug);
  const data = useMemo(() => (query.data ? localizeCollection(query.data, lang) : query.data), [query.data, lang]);
  return { data, isPending: query.isPending, isError: query.isError };
}

export function useSiteProducts(filter: Parameters<typeof useProducts>[0] = {}, enabled = true) {
  const lang = useLang();
  const query = useProducts(filter, enabled);
  const data = useMemo(() => query.data?.map((p) => localizeProduct(p, lang)), [query.data, lang]);
  return { data, isSuccess: query.isSuccess };
}

export function useSiteProduct(slug: string) {
  const lang = useLang();
  const query = useProduct(slug);
  const data = useMemo(() => (query.data ? localizeProduct(query.data, lang) : query.data), [query.data, lang]);
  return { data, isPending: query.isPending, isError: query.isError };
}
