import { ArrowRight } from 'lucide-react';
import { Link, useStrings } from './i18n';
import { useSettings } from './SiteApp';

export default function Footer() {
  const settings = useSettings();
  const t = useStrings();
  return (
    <footer className="footer-outer">
      <div className="footer">
        <div className="footer-top">
          <div>
            <p className="footer-heading">{settings.footer_heading}</p>
            <Link to="/collections" className="footer-cta">
              <span>{t.viewAllCollections}</span>
              <span className="footer-cta-dot"><ArrowRight size={16} aria-hidden="true" /></span>
            </Link>
          </div>
          <nav className="footer-links" aria-label={t.footerNav}>
            <Link to="/">{t.home}</Link>
            <Link to="/about">{t.about}</Link>
            <Link to="/collections">{t.collections}</Link>
            <Link to="/contact">{t.contact}</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} SoulArt</p>
          <div className="footer-social">
            {settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
            {settings.facebook_url && <a href={settings.facebook_url} target="_blank" rel="noreferrer">Facebook</a>}
          </div>
        </div>
      </div>
    </footer>
  );
}
