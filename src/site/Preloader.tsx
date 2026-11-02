import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE } from './motion';

const LETTERS = Array.from('SOULART');
const MIN_DISPLAY_MS = 1500;
const SESSION_KEY = 'soulart-intro-seen';

function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Plays once per browser session: the name letter by letter, then the panel slides away. */
export default function Preloader({ ready, onReveal }: { ready: boolean; onReveal: () => void }) {
  const [skip] = useState(() => hasSeenIntro() || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [minElapsed, setMinElapsed] = useState(skip);
  const finished = ready && minElapsed;

  useEffect(() => {
    if (skip) return;
    const timer = setTimeout(() => setMinElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [skip]);

  useEffect(() => {
    if (!finished) return;
    onReveal();
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Private browsing can block storage; the intro simply plays again next time.
    }
    // onReveal is a stable intent; only the transition to finished matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (skip) return null;

  return (
    <AnimatePresence>
      {!finished && (
        <motion.div className="preloader" exit={{ y: '-100%' }} transition={{ duration: 0.9, ease: EASE }} aria-label="Loading" role="status">
          <div className="preloader-word" aria-hidden="true">
            {LETTERS.map((letter, i) => (
              <span key={i} className="preloader-mask">
                <motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.07 }}>
                  {letter}
                </motion.span>
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
