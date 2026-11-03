import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FolderOpen, Image as ImageIcon, LogOut, Mail, Settings2 } from 'lucide-react';
import { getBackend, isConfigured } from '../lib/backend';
import CollectionEditor from './CollectionEditor';
import CollectionsList from './CollectionsList';
import { AdminLangProvider, AdminLanguageSwitch, useT } from './i18n';
import Messages from './Messages';
import ProductEditor from './ProductEditor';
import ProductsList from './ProductsList';
import SiteEditor from './SiteEditor';
import { ToastProvider, useToast } from './ui';
import './admin.css';

type AuthState = { status: 'loading' } | { status: 'out' } | { status: 'denied'; email: string } | { status: 'in'; email: string } | { status: 'error'; message: string };

function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const refresh = useCallback(async () => {
    try {
      const backend = await getBackend();
      const email = await backend.currentUser();
      if (!email) return setAuth({ status: 'out' });
      setAuth((await backend.isAdmin()) ? { status: 'in', email } : { status: 'denied', email });
    } catch (e) {
      setAuth({ status: 'error', message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    refresh();
    getBackend()
      .then((backend) => {
        if (cancelled) return;
        unsubscribe = backend.onAuthChange(refresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [refresh]);

  return auth;
}

function Login() {
  const t = useT();
  const [error, setError] = useState<'invalid' | string>('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const backend = await getBackend();
      await backend.signIn(String(data.get('email')), String(data.get('password')));
    } catch (e) {
      const message = (e as Error).message;
      // Kept as a marker rather than text so the error follows a language switch.
      setError(/invalid login/i.test(message) ? 'invalid' : message);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-top">
          <p className="admin-logo">SoulArt</p>
          <AdminLanguageSwitch />
        </div>
        <h1>{t.signInTitle}</h1>
        {!isConfigured && <p className="notice">{t.previewLogin}</p>}
        <label className="field">
          <span>{t.email}</span>
          <input name="email" type="email" required autoComplete="username" autoFocus />
        </label>
        <label className="field">
          <span>{t.password}</span>
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && <p className="field-error" role="alert">{error === 'invalid' ? t.invalidLogin : error}</p>}
        <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? t.signingIn : t.signIn}</button>
      </form>
    </div>
  );
}

function UnreadBadge() {
  const t = useT();
  const { data } = useQuery({ queryKey: ['messages'], queryFn: async () => (await getBackend()).listMessages() });
  const unread = data?.filter((m) => !m.is_read).length ?? 0;
  return unread > 0 ? <span className="nav-badge" aria-label={t.unread(unread)}>{unread}</span> : null;
}

function Shell({ email }: { email: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const toast = useToast();

  async function signOut() {
    try {
      const backend = await getBackend();
      await backend.signOut();
      queryClient.removeQueries({ queryKey: ['messages'] });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div className="admin">
      <aside className="sidebar">
        <Link to="/admin" className="admin-logo">SoulArt</Link>
        <nav className="sidebar-nav" aria-label={t.adminNav}>
          <NavLink to="/admin/collections"><FolderOpen size={18} aria-hidden="true" /> <span>{t.collections}</span></NavLink>
          <NavLink to="/admin/products"><ImageIcon size={18} aria-hidden="true" /> <span>{t.products}</span></NavLink>
          <NavLink to="/admin/site"><Settings2 size={18} aria-hidden="true" /> <span>{t.siteContent}</span></NavLink>
          <NavLink to="/admin/messages"><Mail size={18} aria-hidden="true" /> <span>{t.messages}</span> <UnreadBadge /></NavLink>
        </nav>
        <div className="sidebar-foot">
          <a href="/" target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> <span>{t.viewWebsite}</span></a>
          <p title={email}>{email}</p>
          <button onClick={signOut}><LogOut size={16} aria-hidden="true" /> <span>{t.signOut}</span></button>
          <AdminLanguageSwitch />
        </div>
      </aside>
      <main className="admin-main">
        {!isConfigured && <p className="notice">{t.previewBanner}</p>}
        <Outlet />
      </main>
    </div>
  );
}

function Gate() {
  const t = useT();
  const auth = useAuth();
  useEffect(() => {
    document.title = 'Admin | SoulArt';
  }, []);

  if (auth.status === 'loading') return <div className="login"><p className="muted">{t.loading}</p></div>;
  if (auth.status === 'error') return <div className="login"><div className="login-card"><h1>{t.dbError}</h1><p className="field-error">{auth.message}</p></div></div>;
  if (auth.status === 'out') return <Login />;
  if (auth.status === 'denied') {
    return (
      <div className="login">
        <div className="login-card">
          <h1>{t.noAccess}</h1>
          <p className="muted">{t.noAccessText(auth.email)}</p>
          <button className="btn btn-wide" onClick={() => getBackend().then((b) => b.signOut())}>{t.signOut}</button>
        </div>
      </div>
    );
  }
  return <Shell email={auth.email} />;
}

export default function AdminApp() {
  return (
    <AdminLangProvider>
      <ToastProvider>
        <Routes>
          <Route element={<Gate />}>
            <Route index element={<Navigate to="collections" replace />} />
            <Route path="collections" element={<CollectionsList />} />
            <Route path="collections/new" element={<CollectionEditor />} />
            <Route path="collections/:id" element={<CollectionEditor />} />
            <Route path="products" element={<ProductsList />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="site" element={<SiteEditor />} />
            <Route path="messages" element={<Messages />} />
            <Route path="*" element={<Navigate to="collections" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AdminLangProvider>
  );
}
