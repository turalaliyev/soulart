import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { imageUrl } from '../lib/backend';
import { EASE, FitTitle } from './motion';

/** Inner-page header: full-bleed image, tagline at top right, oversized title at bottom right. */
export default function PageHero({ title, tagline, image }: { title: string; tagline: string; image: string | null }) {
  const { scrollY } = useScroll();
  const reduced = useReducedMotion();
  const y = useTransform(scrollY, [0, 800], [0, 140]);
  return (
    <header className="page-hero">
      {image && (
        <motion.div className="page-hero-image" style={{ y: reduced ? 0 : y }}>
          <motion.img src={imageUrl(image)} alt="" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.8, ease: EASE }} />
        </motion.div>
      )}
      <div className="page-hero-shade" aria-hidden="true" />
      <div className="wrap page-hero-inner">
        <motion.p className="page-hero-tagline" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}>
          {tagline}
        </motion.p>
        <FitTitle text={title} maxSize={150} delay={0.3} className="page-hero-title" />
      </div>
    </header>
  );
}
