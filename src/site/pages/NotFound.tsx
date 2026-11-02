import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTitle } from '../motion';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <main className="not-found wrap">
      <h1>Page not found</h1>
      <p>The page you were looking for has moved or no longer exists.</p>
      <Link to="/" className="arrow-link">Back to home <ArrowRight size={20} aria-hidden="true" /></Link>
    </main>
  );
}
