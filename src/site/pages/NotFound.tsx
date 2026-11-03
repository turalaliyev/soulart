import { ArrowRight } from 'lucide-react';
import { Link, useStrings } from '../i18n';
import { useTitle } from '../motion';

export default function NotFound() {
  const t = useStrings();
  useTitle(t.notFound);
  return (
    <main className="not-found wrap">
      <h1>{t.notFound}</h1>
      <p>{t.notFoundText}</p>
      <Link to="/" className="arrow-link">{t.backHome} <ArrowRight size={20} aria-hidden="true" /></Link>
    </main>
  );
}
