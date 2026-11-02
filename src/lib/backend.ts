import type { Backend } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

let pending: Promise<Backend> | null = null;

/** Supabase when configured. The demo data only exists in `npm run dev`; it is stripped from production builds. */
export function getBackend(): Promise<Backend> {
  if (!pending) {
    if (isConfigured) {
      pending = import('./supabaseBackend').then((m) => m.createSupabaseBackend(url!, key!));
    } else if (import.meta.env.DEV) {
      pending = import('./demoBackend').then((m) => m.demoBackend);
    } else {
      pending = Promise.reject(new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_KEY.'));
    }
  }
  return pending;
}

const MEDIA_BASE = url ? `${url.replace(/\/$/, '')}/storage/v1/object/public/media/` : '';

/** Turns a stored image path into a URL the browser can load. */
export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|blob:|data:|\/)/.test(path)) return path;
  return MEDIA_BASE + path;
}
