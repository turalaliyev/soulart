import { useSiteCollections, useStrings } from '../i18n';
import { Reveal, useTitle } from '../motion';
import PageHero from '../PageHero';
import { useSettings } from '../SiteApp';
import WorkCard from '../WorkCard';

export default function Collections() {
  const s = useSettings();
  const t = useStrings();
  useTitle(s.collections_title);
  const { data, isPending, isError } = useSiteCollections();
  return (
    <>
      <PageHero title={s.collections_title} tagline={s.collections_tagline} image={s.collections_image ?? s.hero_image} />
      <main className="light section-pad">
        <div className="wrap">
          {isError && <p className="empty">{t.collectionsError}</p>}
          {!isPending && !isError && data?.length === 0 && <p className="empty">{t.collectionsEmpty}</p>}
          <div className="card-grid">
            {data?.map((collection, i) => (
              <Reveal key={collection.id} delay={(i % 2) * 0.1}>
                <WorkCard
                  to={`/collections/${collection.slug}`}
                  image={collection.cover}
                  title={collection.name}
                  description={collection.description}
                  badge={t.pieces(collection.product_count)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
