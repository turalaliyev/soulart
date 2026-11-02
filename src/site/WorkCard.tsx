import { Link } from 'react-router-dom';
import { imageUrl } from '../lib/backend';

interface WorkCardProps {
  to: string;
  image: string | null;
  title: string;
  description: string;
  badge?: string;
  aspect?: string;
}

/** White framed card: photo with corner marks that open on hover, then title, one-line description and a small tag. */
export default function WorkCard({ to, image, title, description, badge, aspect = '4 / 3' }: WorkCardProps) {
  return (
    <Link to={to} className="work-card">
      <div className="work-card-media" style={{ aspectRatio: aspect }}>
        {image ? <img src={imageUrl(image)} alt={title} loading="lazy" decoding="async" /> : <div className="work-card-empty" aria-hidden="true">{title}</div>}
        <i className="corner corner-tr" aria-hidden="true" />
        <i className="corner corner-bl" aria-hidden="true" />
      </div>
      <div className="work-card-body">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {badge && <span className="badge">{badge}</span>}
      </div>
    </Link>
  );
}
