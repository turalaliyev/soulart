import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';

export const EASE = [0.22, 1, 0.36, 1] as const;

export function useTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = title === 'SoulArt' ? title : `${title} | SoulArt`;
  }, [title]);
}

/** Fades and lifts its children the first time they scroll into view. */
export function Reveal({ children, delay = 0, y = 32, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Wipes an image open from the bottom with a slow settle in scale. */
export function RevealImage({ src, alt, className, priority }: { src?: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <motion.div
      className={`reveal-image ${className ?? ''}`}
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      whileInView={{ clipPath: 'inset(0% 0 0 0)' }}
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ duration: 1.2, ease: EASE }}
    >
      {src && (
        <motion.img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          initial={{ scale: 1.15 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: EASE }}
        />
      )}
    </motion.div>
  );
}

/** Scroll-linked vertical drift for an element. `distance` px either side of its resting place. */
export function useParallax(distance: number): { ref: React.RefObject<HTMLDivElement | null>; y: MotionValue<number> | number } {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return { ref, y: reduced ? 0 : y };
}

/** A headline scaled so it exactly fills its container's width, with letters rising in one after another. */
export function FitTitle({ text, maxSize = Infinity, delay = 0, as = 'h1', className }: {
  text: string;
  /** Upper limit in px, so short words don't take over tall screens. */
  maxSize?: number;
  delay?: number;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(100);
  const Tag = as === 'h1' ? motion.h1 : motion.h2;

  useLayoutEffect(() => {
    const measure = () => {
      if (!box.current || !line.current) return;
      const current = parseFloat(getComputedStyle(line.current).fontSize);
      const ratio = line.current.getBoundingClientRect().width / current;
      if (ratio <= 0) return;
      const next = Math.min(box.current.clientWidth / ratio, maxSize);
      // Rounding makes the measured ratio wobble slightly, so ignore tiny differences or this would never settle.
      setSize((previous) => (Math.abs(previous - next) < 0.5 ? previous : next));
    };
    measure();
    // Width only: the title's own font size changes the box height, which must not trigger another measure.
    let lastWidth = box.current!.clientWidth;
    const observer = new ResizeObserver(() => {
      const width = box.current?.clientWidth ?? 0;
      if (width !== lastWidth) {
        lastWidth = width;
        measure();
      }
    });
    observer.observe(box.current!);
    // Widths change once the web font replaces the fallback.
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [text, maxSize]);

  return (
    <div ref={box} className={`fit-title ${className ?? ''}`}>
      <Tag aria-label={text} style={{ fontSize: size }} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <span ref={line} className="fit-title-line" aria-hidden="true">
          {Array.from(text).map((char, i) => (
            <motion.span
              key={i}
              className="fit-title-char"
              variants={{ hidden: { y: '115%' }, show: { y: 0 } }}
              transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.035 }}
            >
              {char === ' ' ? ' ' : char}
            </motion.span>
          ))}
        </span>
      </Tag>
    </div>
  );
}

function RevealWord({ word, progress, start, end }: { word: string; progress: MotionValue<number>; start: number; end: number }) {
  const opacity = useTransform(progress, [start, end], [0.18, 1]);
  return <motion.span style={{ opacity }}>{word} </motion.span>;
}

/** Text whose words darken one by one as the reader scrolls past. */
export function WordReveal({ lead, text }: { lead: string; text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] });
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <p ref={ref} className="word-reveal">
      {lead && <span>{lead} </span>}
      {reduced
        ? text
        : words.map((word, i) => (
            <RevealWord key={i} word={word} progress={scrollYProgress} start={i / words.length} end={(i + 1) / words.length} />
          ))}
    </p>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}
