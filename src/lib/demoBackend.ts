// In-memory stand-in used only by `npm run dev` before Supabase is connected.
// Nothing here reaches production: backend.ts imports it behind import.meta.env.DEV.
import { randomSuffix, slugify } from './slug';
import { DEFAULT_SETTINGS, type Backend, type Collection, type ContactMessage, type Product, type SiteSettings } from './types';

const art = import.meta.glob('../demo/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const img = (n: number) => art[`../demo/art-${n}.webp`];

const now = '2026-01-01T00:00:00Z';
const raw = (id: string, name: string, description: string, image: string | null, sort_order: number) => ({
  id, name, slug: slugify(name), description, image, sort_order, created_at: now,
});

let collections = [
  raw('c1', 'Ceramics', 'Thrown, glazed and fired vessels for everyday use.', img(1), 0),
  raw('c2', 'Textiles', 'Woven and dyed pieces with a slow, tactile character.', img(2), 1),
  raw('c3', 'Paintings', 'Original works in oil and mineral pigment.', null, 2),
  raw('c4', 'Woodwork', 'Carved objects shaped from reclaimed timber.', img(4), 3),
];

const product = (id: string, collection_id: string, name: string, description: string, images: string[], is_featured: boolean, sort_order: number): Product => ({
  id, collection_id, name, slug: slugify(name), description, images, is_featured, sort_order, created_at: now,
});

let products: Product[] = [
  product('p1', 'c1', 'Ember Vessel', 'A wide-shouldered vessel with an iron glaze that breaks to rust at the rim.\n\nThis is placeholder content for local preview. Connect Supabase to replace it with your own pieces.', [img(1), img(5), img(9)], true, 0),
  product('p2', 'c2', 'Tide Weave', 'Hand-dyed wool woven in long, drifting bands of colour.', [img(2), img(6)], true, 1),
  product('p3', 'c3', 'Red Field', 'Mineral pigment on linen, built up in thin translucent layers.', [img(3), img(7)], true, 2),
  product('p4', 'c4', 'Hollow Form', 'Turned from a single piece of reclaimed oak.', [img(4), img(8)], true, 3),
  product('p5', 'c1', 'Ash Bowl', 'A shallow bowl with a soft grey ash glaze.', [img(5), img(1)], true, 4),
  product('p6', 'c1', 'Moss Jar', 'A lidded jar with a deep green glaze.', [img(6)], false, 5),
  product('p7', 'c3', 'Dusk Study', 'A small study of evening light on paper.', [img(7)], false, 6),
  product('p8', 'c2', 'Clay Runner', 'A long woven runner in earth tones.', [img(8)], false, 7),
];

let settings: SiteSettings = { ...DEFAULT_SETTINGS, hero_image: img(9), collections_image: img(10), about_image: img(7), about_body_image: img(5), contact_image: img(3) };
let messages: ContactMessage[] = [
  { id: 'm1', name: 'Sample Visitor', email: 'visitor@example.com', message: 'This is a sample message so you can see how the inbox works.', is_read: false, created_at: now },
];

const listeners = new Set<() => void>();
let signedIn = false;

function withMeta(c: (typeof collections)[number]): Collection {
  const own = products.filter((p) => p.collection_id === c.id).sort((a, b) => a.sort_order - b.sort_order);
  return { ...c, product_count: own.length, cover: c.image ?? own[0]?.images[0] ?? null };
}
function withCollection(p: Product): Product {
  const c = collections.find((x) => x.id === p.collection_id);
  return { ...p, collection: c ? { name: c.name, slug: c.slug } : null };
}
const uniqueSlug = (name: string, taken: { slug: string }[]) => {
  const slug = slugify(name);
  return taken.some((x) => x.slug === slug) ? `${slug}-${randomSuffix()}` : slug;
};
const reorder = <T extends { id: string; sort_order: number }>(items: T[], ids: string[]) =>
  items.map((item) => (ids.includes(item.id) ? { ...item, sort_order: ids.indexOf(item.id) } : item));

export const demoBackend: Backend = {
  isDemo: true,
  getSettings: async () => settings,
  saveSettings: async (patch) => { settings = { ...settings, ...patch }; },

  listCollections: async () => [...collections].sort((a, b) => a.sort_order - b.sort_order).map(withMeta),
  getCollection: async (slug) => { const c = collections.find((x) => x.slug === slug); return c ? withMeta(c) : null; },
  getCollectionById: async (id) => { const c = collections.find((x) => x.id === id); return c ? withMeta(c) : null; },
  createCollection: async (input) => {
    const row = { ...input, id: crypto.randomUUID(), slug: uniqueSlug(input.name, collections), sort_order: Math.min(0, ...collections.map((c) => c.sort_order)) - 1, created_at: new Date().toISOString() };
    collections = [...collections, row];
    return withMeta(row);
  },
  updateCollection: async (id, input) => { collections = collections.map((c) => (c.id === id ? { ...c, ...input } : c)); },
  deleteCollection: async (id) => {
    collections = collections.filter((c) => c.id !== id);
    products = products.filter((p) => p.collection_id !== id);
  },
  reorderCollections: async (ids) => { collections = reorder(collections, ids); },

  listProducts: async (filter = {}) => {
    let list = [...products].sort((a, b) => a.sort_order - b.sort_order);
    if (filter.collectionId) list = list.filter((p) => p.collection_id === filter.collectionId);
    if (filter.featured) list = list.filter((p) => p.is_featured);
    if (filter.limit) list = list.slice(0, filter.limit);
    return list.map(withCollection);
  },
  getProduct: async (slug) => { const p = products.find((x) => x.slug === slug); return p ? withCollection(p) : null; },
  getProductById: async (id) => { const p = products.find((x) => x.id === id); return p ? withCollection(p) : null; },
  createProduct: async (input) => {
    if (input.images.length === 0) throw new Error('A product needs at least one image.');
    const row: Product = { ...input, id: crypto.randomUUID(), slug: uniqueSlug(input.name, products), sort_order: Math.min(0, ...products.map((p) => p.sort_order)) - 1, created_at: new Date().toISOString() };
    products = [...products, row];
    return withCollection(row);
  },
  updateProduct: async (id, input) => {
    if (input.images.length === 0) throw new Error('A product needs at least one image.');
    products = products.map((p) => (p.id === id ? { ...p, ...input } : p));
  },
  deleteProduct: async (id) => { products = products.filter((p) => p.id !== id); },
  reorderProducts: async (ids) => { products = reorder(products, ids); },

  uploadImage: async (file) => URL.createObjectURL(file),
  removeImages: async () => {},

  sendMessage: async (input) => {
    messages = [{ ...input, id: crypto.randomUUID(), is_read: false, created_at: new Date().toISOString() }, ...messages];
  },
  listMessages: async () => messages,
  setMessageRead: async (id, isRead) => { messages = messages.map((m) => (m.id === id ? { ...m, is_read: isRead } : m)); },
  deleteMessage: async (id) => { messages = messages.filter((m) => m.id !== id); },

  signIn: async () => { signedIn = true; listeners.forEach((l) => l()); },
  signOut: async () => { signedIn = false; listeners.forEach((l) => l()); },
  currentUser: async () => (signedIn ? 'demo@soulart.local' : null),
  isAdmin: async () => signedIn,
  onAuthChange: (callback) => { listeners.add(callback); return () => listeners.delete(callback); },
};
