import { ArrowRight } from 'lucide-react';
import { imageUrl } from '../../lib/backend';
import { Link, useStrings } from '../i18n';
import { Eyebrow, Reveal, RevealImage, useTitle, WordReveal } from '../motion';
import PageHero from '../PageHero';
import { useSettings } from '../SiteApp';

export default function About() {
  const s = useSettings();
  const t = useStrings();
  useTitle(t.about);
  return (
    <>
      <PageHero title={s.about_title} tagline={s.about_tagline} image={s.about_image ?? s.hero_image} />
      <main className="light">
        <section className="wrap split">
          <Eyebrow>{t.ourMission}</Eyebrow>
          <WordReveal lead={s.mission_lead} text={s.mission_text} />
        </section>
        <section className="about-story">
          <div className="wrap">
            {s.about_body_image && <RevealImage src={imageUrl(s.about_body_image)} alt="" className="about-story-image" />}
            <div className="split about-story-text">
              <Reveal><h2 className="h2">{s.about_body_heading}</h2></Reveal>
              <Reveal delay={0.1}>
                <p className="prose">{s.about_body}</p>
                <Link to="/collections" className="arrow-link arrow-link-dark">{t.seeCollections} <ArrowRight size={20} aria-hidden="true" /></Link>
              </Reveal>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
