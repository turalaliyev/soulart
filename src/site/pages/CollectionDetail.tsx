import { useParams } from 'react-router-dom';
import { useSiteCollection, useSiteProducts, useStrings } from '../i18n';
import { Reveal, useTitle } from '../motion';
import PageHero from '../PageHero';
import { useSettings } from '../SiteApp';
import WorkCard from '../WorkCard';
import NotFound from './NotFound';

export default function CollectionDetail() {
  const { slug = '' } = useParams();
  const s = useSettings();
  const { data: collection, isPending, isError } = useSiteCollection(slug);
  const t = useStrings();
  const products = useSiteProducts({ collectionId: collection?.id }, Boolean(collection));
  useTitle(collection?.name);

  if (isPending) return <main className="light page-blank" />;
  if (isError) return <main className="light page-blank"><p className="empty">{t.collectionError}</p></main>;
  if (!collection) return <NotFound />;

  return (
    <>
      <PageHero title={collection.name} tagline={collection.description} image={collection.cover ?? s.hero_image} />
      <main className="light section-pad">
        <div className="wrap">
          {products.isSuccess && products.data?.length === 0 && <p className="empty">{t.collectionEmpty}</p>}
          <div className="card-grid">
            {products.data?.map((product, i) => (
              <Reveal key={product.id} delay={(i % 2) * 0.1}>
                <WorkCard to={`/products/${product.slug}`} image={product.images[0]} title={product.name} description={product.description.split('\n')[0]} />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
