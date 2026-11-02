import { useCollections } from '../../lib/queries';
import { Reveal, useTitle } from '../motion';
import PageHero from '../PageHero';
import { useSettings } from '../SiteApp';
import WorkCard from '../WorkCard';

export default function Collections() {
  const s = useSettings();
  useTitle(s.collections_title);
  const { data, isPending, isError } = useCollections();
  return (
    <>
      <PageHero title={s.collections_title} tagline={s.collections_tagline} image={s.collections_image ?? s.hero_image} />
      <main className="light section-pad">
        <div className="wrap">
          {isError && <p className="empty">The collections could not be loaded. Please refresh the page.</p>}
          {!isPending && !isError && data.length === 0 && <p className="empty">New collections are on their way.</p>}
          <div className="card-grid">
            {data?.map((collection, i) => (
              <Reveal key={collection.id} delay={(i % 2) * 0.1}>
                <WorkCard
                  to={`/collections/${collection.slug}`}
                  image={collection.cover}
                  title={collection.name}
                  description={collection.description}
                  badge={`${collection.product_count} ${collection.product_count === 1 ? 'piece' : 'pieces'}`}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
