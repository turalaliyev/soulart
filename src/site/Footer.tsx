import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSettings } from './SiteApp';

export default function Footer() {
  const settings = useSettings();
  return (
    <footer className="footer-outer">
      <div className="footer">
        <div className="footer-top">
          <div>
            <p className="footer-heading">{settings.footer_heading}</p>
            <Link to="/collections" className="footer-cta" aria-label="View all collections">
              <span>View all collections</span>
              <span className="footer-cta-dot"><ArrowRight size={16} aria-hidden="true" /></span>
            </Link>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/collections">Collections</Link>
            <Link to="/contact">Contact</Link>
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
