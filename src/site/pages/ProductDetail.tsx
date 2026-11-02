import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { imageUrl } from '../../lib/backend';
import { useProduct, useProducts } from '../../lib/queries';
import type { Product } from '../../lib/types';
import { EASE, Eyebrow, Reveal, RevealImage, useTitle } from '../motion';
import WorkCard from '../WorkCard';
import NotFound from './NotFound';

const RELATED_COUNT = 3;

/** Other pieces from the same collection, topped up from the rest of the catalogue when it is small. */
function Related({ product }: { product: Product }) {
  const sameCollection = useProducts({ collectionId: product.collection_id });
  const others = sameCollection.data?.filter((p) => p.id !== product.id) ?? [];
  const needMore = sameCollection.isSuccess && others.length < RELATED_COUNT;
  const everything = useProducts({ limit: 12 }, needMore);
  const fillers = needMore ? (everything.data ?? []).filter((p) => p.id !== product.id && p.collection_id !== product.collection_id) : [];
  const related = [...others, ...fillers].slice(0, RELATED_COUNT);

  if (related.length === 0) return null;
  return (
    <section className="related" aria-labelledby="related-heading">
      <div className="wrap">
        <Reveal><h2 className="h2" id="related-heading">Related pieces</h2></Reveal>
        <div className="related-grid">
          {related.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.08}>
              <WorkCard to={`/products/${item.slug}`} image={item.images[0]} title={item.name} description={item.description.split('\n')[0]} aspect="1 / 1" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const { data: product, isPending, isError } = useProduct(slug);
  useTitle(product?.name);

  if (isPending) return <main className="light page-blank" />;
  if (isError) return <main className="light page-blank"><p className="empty">This piece could not be loaded. Please refresh the page.</p></main>;
  if (!product) return <NotFound />;

  const [cover, ...rest] = product.images;
  return (
    <main className="light product">
      <div className="wrap">
        <motion.header className="product-head" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}>
          <h1>{product.name}</h1>
          {product.collection && (
            <p>From the <Link to={`/collections/${product.collection.slug}`}>{product.collection.name}</Link> collection</p>
          )}
        </motion.header>
        <RevealImage src={imageUrl(cover)} alt={product.name} className="product-image" priority />
      </div>

      {product.description && (
        <section className="product-text">
          <div className="wrap split">
            <Eyebrow>About this piece</Eyebrow>
            <Reveal><p className="prose prose-large">{product.description}</p></Reveal>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <div className="wrap product-gallery">
          {rest.map((path, i) => (
            <RevealImage key={path} src={imageUrl(path)} alt={`${product.name}, view ${i + 2}`} className="product-image" />
          ))}
        </div>
      )}

      <Related product={product} />
    </main>
  );
}
