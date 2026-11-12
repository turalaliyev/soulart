import { useParams } from 'react-router-dom';
import { useSiteCategory, useSiteCollections, useStrings } from '../i18n';
import { Reveal, useTitle } from '../motion';
import PageHero from '../PageHero';
import { useSettings } from '../SiteApp';
import WorkCard from '../WorkCard';
import NotFound from './NotFound';

export default function CategoryDetail() {
  const { slug = '' } = useParams();
  const s = useSettings();
  const { data: category, isPending, isError } = useSiteCategory(slug);
  const t = useStrings();
  const collections = useSiteCollections({ categoryId: category?.id }, Boolean(category));
  useTitle(category?.name);

  if (isPending) return <main className="light page-blank" />;
  if (isError) return <main className="light page-blank"><p className="empty">{t.categoryError}</p></main>;
  if (!category) return <NotFound />;

  return (
    <>
      <PageHero title={category.name} tagline={category.description} image={category.cover ?? s.hero_image} />
      <main className="light section-pad">
        <div className="wrap">
          {collections.isSuccess && collections.data?.length === 0 && <p className="empty">{t.categoryEmpty}</p>}
          <div className="card-grid">
            {collections.data?.map((collection, i) => (
              <Reveal key={collection.id} delay={(i % 2) * 0.1}>
                <WorkCard to={`/collections/${collection.slug}`} image={collection.images[0]} title={collection.name} description={collection.description.split('\n')[0]} badge={t.pictureCount(collection.images.length)} />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
