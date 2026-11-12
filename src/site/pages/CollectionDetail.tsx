import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { imageUrl } from '../../lib/backend';
import type { Collection } from '../../lib/types';
import { Link, Redirect, useSiteCategory, useSiteCollection, useSiteCollections, useStrings } from '../i18n';
import { EASE, Eyebrow, Reveal, RevealImage, useTitle } from '../motion';
import { GalleryGrid, Lightbox } from '../Gallery';
import WorkCard from '../WorkCard';
import NotFound from './NotFound';

const RELATED_COUNT = 3;

/** Other collections from the same category, topped up from the rest of the site when it is small. */
function Related({ collection }: { collection: Collection }) {
  const t = useStrings();
  const sameCategory = useSiteCollections({ categoryId: collection.category_id });
  const others = sameCategory.data?.filter((c) => c.id !== collection.id) ?? [];
  const needMore = sameCategory.isSuccess && others.length < RELATED_COUNT;
  const everything = useSiteCollections({ limit: 12 }, needMore);
  const fillers = needMore ? (everything.data ?? []).filter((c) => c.id !== collection.id && c.category_id !== collection.category_id) : [];
  const related = [...others, ...fillers].slice(0, RELATED_COUNT);

  if (related.length === 0) return null;
  return (
    <section className="related" aria-labelledby="related-heading">
      <div className="wrap">
        <Reveal><h2 className="h2" id="related-heading">{t.related}</h2></Reveal>
        <div className="related-grid">
          {related.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.08}>
              <WorkCard to={`/collections/${item.slug}`} image={item.images[0]} title={item.name} description={item.description.split('\n')[0]} badge={t.pictureCount(item.images.length)} aspect="1 / 1" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Before categories existed, /collections/:slug was a category page. Old links to one land on its new address. */
function MissingCollection({ slug }: { slug: string }) {
  const category = useSiteCategory(slug);
  if (category.isPending) return <main className="light page-blank" />;
  if (category.data) return <Redirect to={`/categories/${slug}`} />;
  return <NotFound />;
}

export default function CollectionDetail() {
  const { slug = '' } = useParams();
  const { data: collection, isPending, isError } = useSiteCollection(slug);
  const t = useStrings();
  const [viewing, setViewing] = useState<number | null>(null);
  useTitle(collection?.name);

  if (isPending) return <main className="light page-blank" />;
  if (isError) return <main className="light page-blank"><p className="empty">{t.collectionError}</p></main>;
  if (!collection) return <MissingCollection slug={slug} />;

  const [fromBefore, fromName, fromAfter] = t.fromCategory(collection.category?.name ?? '');
  return (
    <main className="light collection">
      <div className="wrap">
        <motion.header className="collection-head" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}>
          <h1>{collection.name}</h1>
          <p>
            {collection.category && <>{fromBefore}<Link to={`/categories/${collection.category.slug}`}>{fromName}</Link>{fromAfter}<span className="dot-sep" aria-hidden="true"> · </span></>}
            {t.pictureCount(collection.images.length)}
          </p>
        </motion.header>
        <button type="button" className="collection-cover" onClick={() => setViewing(0)} aria-label={t.openPicture(1)}>
          <RevealImage src={imageUrl(collection.images[0])} alt={t.picture(collection.name, 1)} className="collection-image" priority />
        </button>
      </div>

      {collection.description && (
        <section className="collection-text">
          <div className="wrap split">
            <Eyebrow>{t.aboutCollection}</Eyebrow>
            <Reveal><p className="prose prose-large">{collection.description}</p></Reveal>
          </div>
        </section>
      )}

      <GalleryGrid name={collection.name} images={collection.images} onOpen={setViewing} />
      {viewing !== null && (
        <Lightbox name={collection.name} images={collection.images} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
      )}
      <Related collection={collection} />
    </main>
  );
}
