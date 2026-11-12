import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { imageUrl } from '../lib/backend';
import { useStrings } from './i18n';
import { EASE } from './motion';

/** One picture in the grid: shown whole at its own proportions, slides up into place, opens the viewer. */
function Tile({ src, alt, label, index, onOpen }: { src: string; alt: string; label: string; index: number; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      className="gallery-tile"
      onClick={onOpen}
      aria-label={label}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay: (index % 3) * 0.08 }}
    >
      <img src={imageUrl(src)} alt={alt} loading="lazy" decoding="async" />
      <i className="corner corner-tr" aria-hidden="true" />
      <i className="corner corner-bl" aria-hidden="true" />
    </motion.button>
  );
}

/** Every picture after the cover, in a column layout that keeps each one uncropped. */
export function GalleryGrid({ name, images, onOpen }: { name: string; images: string[]; onOpen: (index: number) => void }) {
  const t = useStrings();
  if (images.length < 2) return null;
  return (
    <div className="wrap gallery">
      {images.slice(1).map((src, i) => (
        <Tile key={src} src={src} index={i} alt={t.picture(name, i + 2)} label={t.openPicture(i + 2)} onOpen={() => onOpen(i + 1)} />
      ))}
    </div>
  );
}

/** Full-screen viewer. Arrow keys and swipes move between pictures; Escape closes. */
export function Lightbox({ name, images, index, onIndex, onClose }: {
  name: string;
  images: string[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const t = useStrings();
  const dialog = useRef<HTMLDialogElement>(null);
  const swipeStart = useRef<number | null>(null);
  const [direction, setDirection] = useState(0);
  const count = images.length;
  const go = (step: number) => {
    setDirection(step);
    onIndex((index + step + count) % count);
  };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    // The page behind must not scroll, including through the smooth-scroll library.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
      if (element.open) element.close();
    };
  }, []);

  useEffect(() => {
    // Fetch the neighbours early so moving through the pictures doesn't wait on the network.
    for (const step of [1, -1]) {
      const src = imageUrl(images[(index + step + count) % count]);
      if (src) new Image().src = src;
    }
  }, [index, images, count]);

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-label={name}
      data-lenis-prevent
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={(e) => { swipeStart.current = e.clientX; }}
      onPointerUp={(e) => {
        if (swipeStart.current === null || count < 2) return;
        const distance = e.clientX - swipeStart.current;
        swipeStart.current = null;
        if (Math.abs(distance) > 50) go(distance < 0 ? 1 : -1);
      }}
    >
      <div className="lightbox-bar">
        <p aria-live="polite">{t.viewer(index + 1, count)}</p>
        <button type="button" className="lightbox-btn" onClick={onClose} aria-label={t.closeViewer} autoFocus><X size={22} /></button>
      </div>
      <div className="lightbox-stage" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.img
          key={images[index]}
          src={imageUrl(images[index])}
          alt={t.picture(name, index + 1)}
          draggable={false}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        />
      </div>
      {count > 1 && (
        <>
          <button type="button" className="lightbox-btn lightbox-prev" onClick={() => go(-1)} aria-label={t.previous}><ArrowLeft size={22} /></button>
          <button type="button" className="lightbox-btn lightbox-next" onClick={() => go(1)} aria-label={t.next}><ArrowRight size={22} /></button>
        </>
      )}
    </dialog>
  );
}
