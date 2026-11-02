import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { imageUrl } from '../../lib/backend';
import { Eyebrow, Reveal, RevealImage, useTitle, WordReveal } from '../motion';
import PageHero from '../PageHero';
import { useSettings } from '../SiteApp';

export default function About() {
  const s = useSettings();
  useTitle('About');
  return (
    <>
      <PageHero title={s.about_title} tagline={s.about_tagline} image={s.about_image ?? s.hero_image} />
      <main className="light">
        <section className="wrap split">
          <Eyebrow>Our mission</Eyebrow>
          <WordReveal lead={s.mission_lead} text={s.mission_text} />
        </section>
        <section className="about-story">
          <div className="wrap">
            {s.about_body_image && <RevealImage src={imageUrl(s.about_body_image)} alt="" className="about-story-image" />}
            <div className="split about-story-text">
              <Reveal><h2 className="h2">{s.about_body_heading}</h2></Reveal>
              <Reveal delay={0.1}>
                <p className="prose">{s.about_body}</p>
                <Link to="/collections" className="arrow-link arrow-link-dark">See the collections <ArrowRight size={20} aria-hidden="true" /></Link>
              </Reveal>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
