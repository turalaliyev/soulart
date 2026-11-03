import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate, type Location } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import Lenis from 'lenis';
import { imageUrl } from '../lib/backend';
import { useSettingsQuery } from '../lib/queries';
import { readStoredLang } from '../lib/i18n';
import { DEFAULT_SETTINGS, localizeSettings, type SiteSettings } from '../lib/types';
import { LANG_STORAGE_KEY, LangProvider, localizePath, parsePath } from './i18n';
import { SITE_STRINGS } from './strings';
import { EASE } from './motion';
import Nav from './Nav';
import Footer from './Footer';
import Preloader from './Preloader';
import Home from './pages/Home';
import About from './pages/About';
import Collections from './pages/Collections';
import CollectionDetail from './pages/CollectionDetail';
import ProductDetail from './pages/ProductDetail';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import './site.css';

const SettingsContext = createContext<SiteSettings>(DEFAULT_SETTINGS);
export const useSettings = () => useContext(SettingsContext);

let lenis: Lenis | null = null;

function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    lenis = new Lenis({ lerp: 0.1 });
    let frame = requestAnimationFrame(function raf(time) {
      lenis?.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
}

function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

/** Black curtain that closes over the old page and lifts off the new one. */
function Curtain() {
  return (
    <motion.div
      className="curtain"
      aria-hidden="true"
      initial={{ scaleY: 1, transformOrigin: '50% 0%' }}
      animate={{ scaleY: 0, transformOrigin: '50% 0%', transition: { duration: 0.7, ease: EASE, delay: 0.05 } }}
      exit={{ scaleY: 1, transformOrigin: '50% 100%', transition: { duration: 0.5, ease: EASE } }}
    />
  );
}

function Page({ location }: { location: Location }) {
  return (
    <div className="page">
      <Curtain />
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:slug" element={<CollectionDetail />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

/** Waits for the first page's hero image so the preloader lifts onto a finished picture, but never for long. */
function useHeroReady(path: string | null | undefined, enabled: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const src = imageUrl(path);
    if (!src) {
      setReady(true);
      return;
    }
    const done = () => setReady(true);
    const image = new Image();
    image.onload = image.onerror = done;
    image.src = src;
    const timeout = setTimeout(done, 2500);
    return () => clearTimeout(timeout);
  }, [path, enabled]);
  return ready;
}

export default function SiteApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, path } = parsePath(location.pathname);
  const t = SITE_STRINGS[lang];
  const settings = useSettingsQuery();
  const localizedSettings = useMemo(() => localizeSettings(settings.data ?? DEFAULT_SETTINGS, lang), [settings.data, lang]);
  const [revealed, setRevealed] = useState(false);
  useSmoothScroll();

  useEffect(() => {
    history.scrollRestoration = 'manual';
    // A returning visitor who chose Russian or English gets it again when they arrive at the home page.
    // Azerbaijani stays the default for everyone else, and a shared link always keeps its own language.
    const remembered = readStoredLang(LANG_STORAGE_KEY);
    if (location.pathname === '/' && remembered && remembered !== 'az') navigate(localizePath('/', remembered), { replace: true });
    // Only on arrival: later visits to "/" are deliberate choices of Azerbaijani.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const heroReady = useHeroReady(settings.data?.hero_image, !settings.isPending);
  const ready = !settings.isPending && (path !== '/' || heroReady);

  if (settings.isError && !settings.data && import.meta.env.PROD) {
    return (
      <div className="site-error">
        <p className="logo">SoulArt</p>
        <p>{t.unavailable}</p>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <Preloader ready={ready} label={t.loading} onReveal={() => setRevealed(true)} />
      {revealed && (
        <LangProvider value={{ lang, path }}>
          <SettingsContext.Provider value={localizedSettings}>
            <Nav />
            {/* Keyed by the path without its language, so switching language swaps the text in place
                and keeps the scroll position instead of playing a page transition. */}
            <AnimatePresence mode="wait" initial={false} onExitComplete={scrollToTop}>
              <Page key={path} location={{ ...location, pathname: path }} />
            </AnimatePresence>
          </SettingsContext.Provider>
        </LangProvider>
      )}
    </MotionConfig>
  );
}
