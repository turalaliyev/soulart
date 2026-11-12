import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { randomSuffix, slugify } from './slug';
import { DEFAULT_SETTINGS, type Backend, type Category, type ContactMessage, type Collection, type SiteSettings } from './types';

const BUCKET = 'media';
const UNIQUE_VIOLATION = '23505';
const CATEGORY_SELECT = '*, collections(images, sort_order)';
const COLLECTION_SELECT = '*, category:categories(name, slug, translations)';

type CategoryRow = Omit<Category, 'collection_count' | 'cover'> & {
  collections: { images: string[]; sort_order: number }[];
};

function check<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function toCategory(row: CategoryRow): Category {
  const { collections, ...rest } = row;
  const first = [...collections].sort((a, b) => a.sort_order - b.sort_order)[0];
  return { ...rest, collection_count: collections.length, cover: row.image ?? first?.images[0] ?? null };
}

export function createSupabaseBackend(url: string, key: string): Backend {
  const db = createClient(url, key);

  /** Inserts with a slug from the name, retrying with a suffix if that slug is taken. */
  async function insertWithSlug<T>(table: string, name: string, values: object, select: string): Promise<T> {
    const base = slugify(name);
    for (const slug of [base, `${base}-${randomSuffix()}`]) {
      const { data, error } = await db.from(table).insert({ ...values, slug }).select(select).single();
      if (!error) return data as T;
      if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
    }
    throw new Error('Could not create a unique URL for this name. Try a different name.');
  }

  async function nextSortOrder(table: string): Promise<number> {
    const rows = check(await db.from(table).select('sort_order').order('sort_order').limit(1)) as { sort_order: number }[];
    return (rows[0]?.sort_order ?? 1) - 1;
  }

  async function reorder(table: string, ids: string[]): Promise<void> {
    const results = await Promise.all(ids.map((id, index) => db.from(table).update({ sort_order: index }).eq('id', id)));
    for (const result of results) if (result.error) throw new Error(result.error.message);
  }

  async function removeImages(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await db.storage.from(BUCKET).remove(paths);
    if (error) throw new Error(error.message);
  }

  return {
    isDemo: false,

    async getSettings() {
      const row = check(await db.from('site_settings').select('*').eq('id', 1).maybeSingle());
      return { ...DEFAULT_SETTINGS, ...(row as Partial<SiteSettings> | null) };
    },
    async saveSettings(patch) {
      check(await db.from('site_settings').update(patch).eq('id', 1));
    },

    async listCategories() {
      const rows = check(await db.from('categories').select(CATEGORY_SELECT).order('sort_order').order('created_at'));
      return (rows as CategoryRow[]).map(toCategory);
    },
    async getCategory(slug) {
      const row = check(await db.from('categories').select(CATEGORY_SELECT).eq('slug', slug).maybeSingle());
      return row ? toCategory(row as CategoryRow) : null;
    },
    async getCategoryById(id) {
      const row = check(await db.from('categories').select(CATEGORY_SELECT).eq('id', id).maybeSingle());
      return row ? toCategory(row as CategoryRow) : null;
    },
    async createCategory(input) {
      const sort_order = await nextSortOrder('categories');
      const row = await insertWithSlug<CategoryRow>('categories', input.name, { ...input, sort_order }, CATEGORY_SELECT);
      return toCategory(row);
    },
    async updateCategory(id, input) {
      check(await db.from('categories').update(input).eq('id', id));
    },
    async deleteCategory(id) {
      const category = check(await db.from('categories').select('image').eq('id', id).single()) as { image: string | null };
      const collections = check(await db.from('collections').select('images').eq('category_id', id)) as { images: string[] }[];
      check(await db.from('categories').delete().eq('id', id));
      const files = collections.flatMap((p) => p.images);
      if (category.image) files.push(category.image);
      await removeImages(files);
    },
    reorderCategories: (ids) => reorder('categories', ids),

    async listCollections(filter = {}) {
      let query = db.from('collections').select(COLLECTION_SELECT).order('sort_order').order('created_at', { ascending: false });
      if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
      if (filter.featured) query = query.eq('is_featured', true);
      if (filter.limit) query = query.limit(filter.limit);
      return check(await query) as unknown as Collection[];
    },
    async getCollection(slug) {
      return check(await db.from('collections').select(COLLECTION_SELECT).eq('slug', slug).maybeSingle()) as unknown as Collection | null;
    },
    async getCollectionById(id) {
      return check(await db.from('collections').select(COLLECTION_SELECT).eq('id', id).maybeSingle()) as unknown as Collection | null;
    },
    async createCollection(input) {
      const sort_order = await nextSortOrder('collections');
      return insertWithSlug<Collection>('collections', input.name, { ...input, sort_order }, COLLECTION_SELECT);
    },
    async updateCollection(id, input) {
      check(await db.from('collections').update(input).eq('id', id));
    },
    async deleteCollection(id) {
      const collection = check(await db.from('collections').select('images').eq('id', id).single()) as { images: string[] };
      check(await db.from('collections').delete().eq('id', id));
      await removeImages(collection.images);
    },
    reorderCollections: (ids) => reorder('collections', ids),

    async uploadImage(file, folder) {
      const ext = file.type.split('/')[1] ?? 'webp';
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        // File names are unique and never overwritten, so browsers may cache them for a year.
        cacheControl: '31536000',
      });
      if (error) throw new Error(error.message);
      return path;
    },
    removeImages,

    async sendMessage(input) {
      // No .select(): visitors may insert messages but must not be able to read them back.
      const { error } = await db.from('contact_messages').insert(input);
      if (error) throw new Error(error.message);
    },
    async listMessages() {
      return check(await db.from('contact_messages').select('*').order('created_at', { ascending: false })) as ContactMessage[];
    },
    async setMessageRead(id, isRead) {
      check(await db.from('contact_messages').update({ is_read: isRead }).eq('id', id));
    },
    async deleteMessage(id) {
      check(await db.from('contact_messages').delete().eq('id', id));
    },

    async signIn(email, password) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      const { error } = await db.auth.signOut();
      if (error) throw new Error(error.message);
    },
    async currentUser() {
      const { data } = await db.auth.getSession();
      return data.session?.user.email ?? null;
    },
    async isAdmin() {
      const { data, error } = await db.rpc('is_admin');
      if (error) throw new Error(error.message);
      return data === true;
    },
    onAuthChange(callback) {
      const { data } = db.auth.onAuthStateChange(() => {
        // Supabase warns against awaiting its own calls inside this callback, so defer.
        setTimeout(callback, 0);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
