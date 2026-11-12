// In-memory stand-in used only by `npm run dev` before Supabase is connected.
// Nothing here reaches collectionion: backend.ts imports it behind import.meta.env.DEV.
import { randomSuffix, slugify } from './slug';
import type { Translations } from './i18n';
import { DEFAULT_SETTINGS, type Backend, type Category, type ContactMessage, type ContentKey, type Collection, type SiteSettings } from './types';

const art = import.meta.glob('../demo/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const img = (n: number) => art[`../demo/art-${n}.webp`];

const now = '2026-01-01T00:00:00Z';
type Tr = Translations<ContentKey>;
const tr = (ru: [string, string], en: [string, string]): Tr => ({
  ru: { name: ru[0], description: ru[1] },
  en: { name: en[0], description: en[1] },
});

const raw = (id: string, name: string, description: string, image: string | null, sort_order: number, translations: Tr) => ({
  id, name, slug: slugify(name), description, image, sort_order, translations, created_at: now,
});

let categories = [
  raw('c1', 'Keramika', 'Gündəlik istifadə üçün dulusçu çarxında hazırlanmış, şirlənmiş və bişirilmiş qablar.', img(1), 0, tr(['Керамика', 'Сосуды для каждого дня: сформованы на круге, покрыты глазурью и обожжены.'], ['Ceramics', 'Thrown, glazed and fired vessels for everyday use.'])),
  raw('c2', 'Toxuculuq', 'Əllə toxunmuş və boyanmış, toxunuşu xoş olan işlər.', img(2), 1, tr(['Текстиль', 'Тканые и окрашенные вручную работы, приятные на ощупь.'], ['Textiles', 'Woven and dyed pieces with a slow, tactile character.'])),
  raw('c3', 'Rəsmlər', 'Yağlı boya və mineral piqmentlə çəkilmiş orijinal əsərlər.', null, 2, tr(['Живопись', 'Оригинальные работы маслом и минеральными пигментами.'], ['Paintings', 'Original works in oil and mineral pigment.'])),
  raw('c4', 'Ağac işləri', 'Təkrar istifadə olunan ağacdan oyulmuş əşyalar.', img(4), 3, tr(['Изделия из дерева', 'Резные предметы из вторичной древесины.'], ['Woodwork', 'Carved objects shaped from reclaimed timber.'])),
];

const collection = (id: string, category_id: string, name: string, description: string, images: string[], is_featured: boolean, sort_order: number, translations: Tr): Collection => ({
  id, category_id, name, slug: slugify(name), description, images, is_featured, sort_order, translations, created_at: now,
});

let collections: Collection[] = [
  collection('p1', 'c1', 'Köz küpü', 'Geniş çiyinli küp; dəmir şiri kənarlarda pas rənginə çalır.\n\nBu, önizləmə üçün nümunə məzmundur. Supabase qoşulanda öz əsərləriniz görünəcək.', [img(1), img(5), img(9), img(3), img(6), img(2), img(8), img(4), img(10)], true, 0, tr(['Сосуд «Уголь»', 'Сосуд с широкими плечами: железистая глазурь у края переходит в цвет ржавчины.\n\nЭто образец для предпросмотра. После подключения Supabase здесь появятся ваши работы.'], ['Ember Vessel', 'A wide-shouldered vessel with an iron glaze that breaks to rust at the rim.\n\nThis is placeholder content for local preview. Connect Supabase to replace it with your own pieces.'])),
  collection('p2', 'c2', 'Dalğa toxuması', 'Əllə boyanmış yundan uzun, axıcı rəng zolaqları ilə toxunub.', [img(2), img(6)], true, 1, tr(['Плетение «Прилив»', 'Вручную окрашенная шерсть, сотканная длинными плавными полосами цвета.'], ['Tide Weave', 'Hand-dyed wool woven in long, drifting bands of colour.'])),
  collection('p3', 'c3', 'Qırmızı tarla', 'Kətan üzərində nazik, şəffaf qatlarla işlənmiş mineral piqment.', [img(3), img(7)], true, 2, tr(['Красное поле', 'Минеральный пигмент на льне, нанесённый тонкими прозрачными слоями.'], ['Red Field', 'Mineral pigment on linen, built up in thin translucent layers.'])),
  collection('p4', 'c4', 'Boş forma', 'Təkrar istifadə olunan tək parça palıddan yonulub.', [img(4), img(8)], true, 3, tr(['Полая форма', 'Выточена из цельного куска вторичного дуба.'], ['Hollow Form', 'Turned from a single piece of reclaimed oak.'])),
  collection('p5', 'c1', 'Kül kasası', 'Yumşaq boz kül şirli dayaz kasa.', [img(5), img(1)], true, 4, tr(['Чаша «Пепел»', 'Неглубокая чаша с мягкой серой зольной глазурью.'], ['Ash Bowl', 'A shallow bowl with a soft grey ash glaze.'])),
  collection('p6', 'c1', 'Mamır bankası', 'Tünd yaşıl şirli, qapaqlı banka.', [img(6)], false, 5, tr(['Банка «Мох»', 'Банка с крышкой под глубокой зелёной глазурью.'], ['Moss Jar', 'A lidded jar with a deep green glaze.'])),
  // Left without English on purpose, so the preview shows the fallback to Azerbaijani.
  collection('p7', 'c3', 'Toran etüdü', 'Kağız üzərində axşam işığının kiçik etüdü.', [img(7)], false, 6, { ru: { name: 'Этюд сумерек', description: 'Небольшой этюд вечернего света на бумаге.' } }),
  collection('p8', 'c2', 'Gil cığırı', 'Torpaq çalarlarında uzun toxunma xalça.', [img(8)], false, 7, tr(['Дорожка «Глина»', 'Длинная тканая дорожка в земляных тонах.'], ['Clay Runner', 'A long woven runner in earth tones.'])),
];

let settings: SiteSettings = { ...DEFAULT_SETTINGS, hero_image: img(9), categories_image: img(10), about_image: img(7), about_body_image: img(5), contact_image: img(3) };
let messages: ContactMessage[] = [
  { id: 'm1', name: 'Sample Visitor', email: 'visitor@example.com', message: 'Bu, gələnlər qutusunun necə işlədiyini göstərən nümunə mesajdır.', is_read: false, created_at: now },
];

const listeners = new Set<() => void>();
let signedIn = false;

function withMeta(c: (typeof categories)[number]): Category {
  const own = collections.filter((p) => p.category_id === c.id).sort((a, b) => a.sort_order - b.sort_order);
  return { ...c, collection_count: own.length, cover: c.image ?? own[0]?.images[0] ?? null };
}
function withCategory(p: Collection): Collection {
  const c = categories.find((x) => x.id === p.category_id);
  return { ...p, category: c ? { name: c.name, slug: c.slug, translations: c.translations } : null };
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

  listCategories: async () => [...categories].sort((a, b) => a.sort_order - b.sort_order).map(withMeta),
  getCategory: async (slug) => { const c = categories.find((x) => x.slug === slug); return c ? withMeta(c) : null; },
  getCategoryById: async (id) => { const c = categories.find((x) => x.id === id); return c ? withMeta(c) : null; },
  createCategory: async (input) => {
    const row = { ...input, id: crypto.randomUUID(), slug: uniqueSlug(input.name, categories), sort_order: Math.min(0, ...categories.map((c) => c.sort_order)) - 1, created_at: new Date().toISOString() };
    categories = [...categories, row];
    return withMeta(row);
  },
  updateCategory: async (id, input) => { categories = categories.map((c) => (c.id === id ? { ...c, ...input } : c)); },
  deleteCategory: async (id) => {
    categories = categories.filter((c) => c.id !== id);
    collections = collections.filter((p) => p.category_id !== id);
  },
  reorderCategories: async (ids) => { categories = reorder(categories, ids); },

  listCollections: async (filter = {}) => {
    let list = [...collections].sort((a, b) => a.sort_order - b.sort_order);
    if (filter.categoryId) list = list.filter((p) => p.category_id === filter.categoryId);
    if (filter.featured) list = list.filter((p) => p.is_featured);
    if (filter.limit) list = list.slice(0, filter.limit);
    return list.map(withCategory);
  },
  getCollection: async (slug) => { const p = collections.find((x) => x.slug === slug); return p ? withCategory(p) : null; },
  getCollectionById: async (id) => { const p = collections.find((x) => x.id === id); return p ? withCategory(p) : null; },
  createCollection: async (input) => {
    if (input.images.length === 0) throw new Error('A collection needs at least one image.');
    const row: Collection = { ...input, id: crypto.randomUUID(), slug: uniqueSlug(input.name, collections), sort_order: Math.min(0, ...collections.map((p) => p.sort_order)) - 1, created_at: new Date().toISOString() };
    collections = [...collections, row];
    return withCategory(row);
  },
  updateCollection: async (id, input) => {
    if (input.images.length === 0) throw new Error('A collection needs at least one image.');
    collections = collections.map((p) => (p.id === id ? { ...p, ...input } : p));
  },
  deleteCollection: async (id) => { collections = collections.filter((p) => p.id !== id); },
  reorderCollections: async (ids) => { collections = reorder(collections, ids); },

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
