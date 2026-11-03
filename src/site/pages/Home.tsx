import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { imageUrl } from '../../lib/backend';
import type { Collection, Product } from '../../lib/types';
import ContactSection from '../ContactSection';
import { Link, useSiteCollections, useSiteProducts, useStrings } from '../i18n';
import { EASE, Eyebrow, FitTitle, Reveal, useParallax, useTitle } from '../motion';
import { useSettings } from '../SiteApp';
import WorkCard from '../WorkCard';

function Hero() {
  const settings = useSettings();
  const t = useStrings();
  const { scrollY } = useScroll();
  const reduced = useReducedMotion();
  const y = useTransform(scrollY, [0, 1000], [0, 200]);
  return (
    <header className="hero">
      {settings.hero_image && (
        <motion.div className="hero-image" style={{ y: reduced ? 0 : y }}>
          <motion.img src={imageUrl(settings.hero_image)} alt="" fetchPriority="high" initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 2, ease: EASE }} />
        </motion.div>
      )}
      <div className="hero-shade" aria-hidden="true" />
      <div className="wrap hero-inner">
        <motion.div className="hero-top" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.5 }}>
          <p>{settings.hero_tagline}</p>
          <Link to="/collections" className="arrow-link">{t.viewCollections} <ArrowDown size={20} aria-hidden="true" /></Link>
        </motion.div>
        <FitTitle text={settings.hero_title} delay={0.25} maxSize={window.innerHeight * 0.5} className="hero-title" />
      </div>
    </header>
  );
}

/** Image strip that drifts sideways with scroll. The section then pins while the white section slides over it. */
function Intro({ images }: { images: string[] }) {
  const settings = useSettings();
  const section = useRef<HTMLElement>(null);
  const [top, setTop] = useState(0);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['-4%', '-22%']);

  useEffect(() => {
    if (!section.current) return;
    const measure = () => setTop(Math.min(0, window.innerHeight - (section.current?.offsetHeight ?? 0)));
    const observer = new ResizeObserver(measure);
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  const strip = images.length > 0 ? Array.from({ length: Math.max(9, images.length) }, (_, i) => images[i % images.length]) : [];

  return (
    <section ref={section} className="intro" style={{ top }}>
      {strip.length > 0 && (
        <div className="intro-strip-mask" aria-hidden="true">
          <motion.div className="intro-strip" style={{ x: reduced ? '-10%' : x }}>
            {strip.map((src, i) => (
              <div className="intro-strip-item" key={i}>
                <img src={imageUrl(src)} alt="" loading="lazy" decoding="async" />
              </div>
            ))}
          </motion.div>
        </div>
      )}
      <div className="wrap intro-text">
        <Reveal><h2>{settings.intro_heading}</h2></Reveal>
        <Reveal delay={0.1}><p>{settings.intro_text}</p></Reveal>
      </div>
    </section>
  );
}

function FloatingCard({ product, index }: { product: Product; index: number }) {
  const { ref, y } = useParallax(index % 2 === 0 ? 30 : 70);
  return (
    <motion.div ref={ref} className={`works-item works-item-${index % 4}`} style={{ y }}>
      <Reveal y={60}>
        <WorkCard to={`/products/${product.slug}`} image={product.images[0]} title={product.name} description={product.description.split('\n')[0]} badge={product.collection?.name} aspect={index % 2 === 0 ? '16 / 11' : '12 / 7'} />
      </Reveal>
    </motion.div>
  );
}

/** Cards float past a giant grey heading that slides sideways behind them. */
function SelectedWorks({ products }: { products: Product[] }) {
  const settings = useSettings();
  const t = useStrings();
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['45vw', '-100%']);
  return (
    <section ref={section} className="works" aria-labelledby="works-heading">
      <div className="works-bg">
        <motion.h2 id="works-heading" style={{ x: reduced ? 0 : x }}>{settings.works_heading}</motion.h2>
      </div>
      <div className="wrap works-list">
        {products.map((product, i) => <FloatingCard key={product.id} product={product} index={i} />)}
      </div>
      <Reveal className="wrap works-more">
        <Link to="/collections" className="arrow-link arrow-link-dark">{t.allCollections} <ArrowRight size={20} aria-hidden="true" /></Link>
      </Reveal>
    </section>
  );
}

/** Names on the left, picture on the right. Hover or focus a name to bring its picture forward. */
function CollectionList({ collections }: { collections: Collection[] }) {
  const [active, setActive] = useState(0);
  const t = useStrings();
  const current = collections[Math.min(active, collections.length - 1)];
  return (
    <section className="clist" aria-label={t.collections}>
      <div className="wrap">
        <Eyebrow>{t.collections}</Eyebrow>
        <div className="clist-grid">
          <ul className="clist-names">
            {collections.map((collection, i) => (
              <li key={collection.id}>
                <Link to={`/collections/${collection.slug}`} className={i === active ? 'is-active' : ''} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
                  <span className="clist-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
                  {collection.cover && <img className="clist-thumb" src={imageUrl(collection.cover)} alt="" loading="lazy" />}
                  <span className="clist-name">{collection.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="clist-preview" aria-hidden="true">
            <div className="clist-image">
              <AnimatePresence initial={false}>
                {current.cover && (
                  <motion.img key={current.id} src={imageUrl(current.cover)} alt="" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: EASE }} />
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {current.description}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useTitle('SoulArt');
  const featured = useSiteProducts({ featured: true, limit: 8 });
  const latest = useSiteProducts({ limit: 8 }, featured.isSuccess && featured.data?.length === 0);
  const collections = useSiteCollections();
  const works = featured.data?.length ? featured.data : latest.data ?? [];

  return (
    <>
      <Hero />
      <Intro images={works.map((p) => p.images[0])} />
      <main className="home-over">
        {works.length > 0 && <SelectedWorks products={works} />}
        {!!collections.data?.length && <CollectionList collections={collections.data} />}
        <ContactSection />
      </main>
    </>
  );
}
