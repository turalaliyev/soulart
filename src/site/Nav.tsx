import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { imageUrl } from '../lib/backend';
import { EASE } from './motion';
import { LanguageSwitch, Link, useCurrentPath, useStrings } from './i18n';
import { useSettings } from './SiteApp';

export default function Nav() {
  const settings = useSettings();
  const pathname = useCurrentPath();
  const t = useStrings();
  const links = [
    { to: '/', label: t.home },
    { to: '/about', label: t.about },
    { to: '/collections', label: t.collections },
    { to: '/contact', label: t.contact },
  ];
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [overLight, setOverLight] = useState(false);
  const { scrollY } = useScroll();
  const toggle = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(y > 120 && y > previous);
  });

  useEffect(() => setOpen(false), [pathname]);

  // Keep the logo and menu icon readable: dark while a light section is behind them.
  useEffect(() => {
    const update = () => {
      const overLight = Array.from(document.querySelectorAll('.light, .works')).some((el) => {
        const box = el.getBoundingClientRect();
        return box.top <= 36 && box.bottom >= 36;
      });
      setOverLight(overLight);
    };
    update();
    // Polling also covers page changes and content that loads after them.
    const timer = setInterval(update, 250);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <motion.header className={overLight && !open ? 'nav nav-dark' : 'nav'} animate={{ y: hidden && !open ? '-110%' : 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <div className="wrap nav-inner">
          <Link to="/" className="logo" aria-label={t.homeLabel}>SoulArt</Link>
          <div className="nav-right">
            <LanguageSwitch />
            <button ref={toggle} className="nav-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="site-menu" aria-label={open ? t.closeMenu : t.openMenu}>
              <motion.i animate={open ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }} transition={{ duration: 0.4, ease: EASE }} />
              <motion.i animate={{ opacity: open ? 0 : 1 }} transition={{ duration: 0.2 }} />
              <motion.i animate={open ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }} transition={{ duration: 0.4, ease: EASE }} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="menu-backdrop" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
            <motion.nav
              id="site-menu"
              className="menu"
              aria-label={t.mainNav}
              initial={{ clipPath: 'inset(0 0 100% 0)' }}
              animate={{ clipPath: 'inset(0 0 0% 0)' }}
              exit={{ clipPath: 'inset(0 0 100% 0)' }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <div className="wrap menu-inner">
                <ol className="menu-links">
                  {links.map((link, i) => (
                    <motion.li key={link.to} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.12 + i * 0.06 }}>
                      <Link ref={i === 0 ? firstLink : undefined} to={link.to} onClick={() => setOpen(false)} aria-current={pathname === link.to ? 'page' : undefined}>
                        <span className="menu-num" aria-hidden="true">0{i + 1}</span>
                        <span className="menu-label">{link.label}</span>
                      </Link>
                    </motion.li>
                  ))}
                </ol>
                <motion.div className="menu-side" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
                  {settings.contact_image && <img src={imageUrl(settings.contact_image)} alt="" />}
                  <a className="menu-email" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
                  {settings.contact_address && <p>{settings.contact_address}</p>}
                </motion.div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
