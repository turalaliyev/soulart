import { useSiteCategories, useStrings } from '../i18n';
import { Reveal, useTitle } from '../motion';
import PageHero from '../PageHero';
import { useSettings } from '../SiteApp';
import WorkCard from '../WorkCard';

export default function Categories() {
  const s = useSettings();
  const t = useStrings();
  useTitle(s.categories_title);
  const { data, isPending, isError } = useSiteCategories();
  return (
    <>
      <PageHero title={s.categories_title} tagline={s.categories_tagline} image={s.categories_image ?? s.hero_image} />
      <main className="light section-pad">
        <div className="wrap">
          {isError && <p className="empty">{t.categoriesError}</p>}
          {!isPending && !isError && data?.length === 0 && <p className="empty">{t.categoriesEmpty}</p>}
          <div className="card-grid">
            {data?.map((category, i) => (
              <Reveal key={category.id} delay={(i % 2) * 0.1}>
                <WorkCard
                  to={`/categories/${category.slug}`}
                  image={category.cover}
                  title={category.name}
                  description={category.description}
                  badge={t.collectionCount(category.collection_count)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
