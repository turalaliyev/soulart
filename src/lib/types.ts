import type { Lang, Translations } from './i18n';

export type ContentKey = 'name' | 'description';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  translations: Translations<ContentKey>;
  sort_order: number;
  created_at: string;
  /** Derived when listing. */
  product_count: number;
  /** The collection image, or the first product's cover when it has none. */
  cover: string | null;
}

export interface Product {
  id: string;
  collection_id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  is_featured: boolean;
  translations: Translations<ContentKey>;
  sort_order: number;
  created_at: string;
  collection?: { name: string; slug: string; translations?: Translations<ContentKey> | null } | null;
}

export interface SiteSettings {
  hero_title: string;
  hero_tagline: string;
  hero_image: string | null;
  intro_heading: string;
  intro_text: string;
  works_heading: string;
  collections_title: string;
  collections_tagline: string;
  collections_image: string | null;
  about_title: string;
  about_tagline: string;
  about_image: string | null;
  mission_lead: string;
  mission_text: string;
  about_body_heading: string;
  about_body: string;
  about_body_image: string | null;
  contact_heading: string;
  contact_image: string | null;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  instagram_url: string;
  facebook_url: string;
  footer_heading: string;
  translations: Translations<SettingTextKey>;
}

/** Settings text that differs by language. Email, phone and social links are shared across languages. */
export const SETTING_TEXT_KEYS = [
  'hero_title', 'hero_tagline', 'intro_heading', 'intro_text', 'works_heading',
  'collections_title', 'collections_tagline', 'about_title', 'about_tagline',
  'mission_lead', 'mission_text', 'about_body_heading', 'about_body',
  'contact_heading', 'contact_address', 'footer_heading',
] as const;
export type SettingTextKey = (typeof SETTING_TEXT_KEYS)[number];

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type CollectionInput = Pick<Collection, 'name' | 'description' | 'image' | 'translations'>;
export type ProductInput = Pick<Product, 'collection_id' | 'name' | 'description' | 'images' | 'is_featured' | 'translations'>;

export type ImageFolder = 'collections' | 'products' | 'site';

/** Everything the app needs from a data source. Implemented by Supabase and, in local development only, an in-memory demo. */
export interface Backend {
  isDemo: boolean;
  getSettings(): Promise<SiteSettings>;
  saveSettings(patch: Partial<SiteSettings>): Promise<void>;

  listCollections(): Promise<Collection[]>;
  getCollection(slug: string): Promise<Collection | null>;
  getCollectionById(id: string): Promise<Collection | null>;
  createCollection(input: CollectionInput): Promise<Collection>;
  updateCollection(id: string, input: CollectionInput): Promise<void>;
  /** Removes the collection, its products and all their image files. */
  deleteCollection(id: string): Promise<void>;
  reorderCollections(ids: string[]): Promise<void>;

  listProducts(filter?: { collectionId?: string; featured?: boolean; limit?: number }): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  reorderProducts(ids: string[]): Promise<void>;

  uploadImage(file: Blob, folder: ImageFolder): Promise<string>;
  removeImages(paths: string[]): Promise<void>;

  sendMessage(input: Pick<ContactMessage, 'name' | 'email' | 'message'>): Promise<void>;
  listMessages(): Promise<ContactMessage[]>;
  setMessageRead(id: string, isRead: boolean): Promise<void>;
  deleteMessage(id: string): Promise<void>;

  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Returns the signed-in email, or null. */
  currentUser(): Promise<string | null>;
  isAdmin(): Promise<boolean>;
  onAuthChange(callback: () => void): () => void;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  hero_title: 'SoulArt',
  hero_tagline: 'Əl ilə yaradılmış sənət və sənətkarlıq nümunələri, parça-parça kəşf edə biləcəyiniz kolleksiyalarda.',
  hero_image: null,
  intro_heading: 'Tələsmədən, əllə yaradılır.',
  intro_text: 'Hər əsər bir ideya və bir cüt əllə başlayır. Nələr yaratdığımızı görmək üçün kolleksiyalara baxın.',
  works_heading: 'Seçilmiş işlər',
  collections_title: 'Kolleksiyalar',
  collections_tagline: 'Hər kolleksiya eyni materialı, texnikanı və ya hekayəni bölüşən əsərlərdən ibarətdir.',
  collections_image: null,
  about_title: 'SoulArt haqqında',
  about_tagline: 'Biz qayğı ilə sənət və sənətkarlıq əsərləri yaradan ustaların təşkilatıyıq.',
  about_image: null,
  mission_lead: 'SoulArt sənəti və sənətkarlığı birləşdirir ki,',
  mission_text: 'çoxlu əllərin zəhməti bir yerdə görünsün.',
  about_body_heading: 'Hekayəmiz',
  about_body: 'Hekayənizi burada danışın. Bu mətni admin panelində "Sayt məzmunu" bölməsindən dəyişə bilərsiniz.',
  about_body_image: null,
  contact_heading: 'Gəlin danışaq',
  contact_image: null,
  contact_email: 'hello@soulart.com',
  contact_phone: '',
  contact_address: '',
  instagram_url: '',
  facebook_url: '',
  footer_heading: 'Kolleksiyaları kəşf edin',
  translations: {
    ru: {
      hero_tagline: 'Искусство и ремёсла, созданные вручную и собранные в коллекции, которые можно изучать работа за работой.',
      intro_heading: 'Не спеша, своими руками.',
      intro_text: 'Каждая работа начинается с идеи и пары рук. Загляните в коллекции и посмотрите, что мы создаём.',
      works_heading: 'Избранные работы',
      collections_title: 'Коллекции',
      collections_tagline: 'Каждая коллекция объединяет работы общим материалом, техникой или историей.',
      about_title: 'О SoulArt',
      about_tagline: 'Мы объединение мастеров, которые с заботой создают произведения искусства и ремёсел.',
      mission_lead: 'SoulArt объединяет искусство и ремесло,',
      mission_text: 'чтобы труд многих рук можно было увидеть в одном месте.',
      about_body_heading: 'Наша история',
      about_body: 'Расскажите здесь свою историю. Этот текст можно изменить в админ-панели в разделе «Контент сайта».',
      contact_heading: 'Давайте поговорим',
      footer_heading: 'Откройте для себя коллекции',
    },
    en: {
      hero_tagline: 'Art and crafts made by hand, gathered into collections you can explore piece by piece.',
      intro_heading: 'Made slowly, by hand.',
      intro_text: 'Each piece starts as an idea and a pair of hands. Browse the collections to see what we have been making.',
      works_heading: 'Selected Works',
      collections_title: 'Collections',
      collections_tagline: 'Every collection is a family of pieces that share a material, a technique or a story.',
      about_title: 'About SoulArt',
      about_tagline: 'We are an organization of makers creating art and crafts with care.',
      mission_lead: 'SoulArt brings together art and craft',
      mission_text: 'so that the work of many hands can be seen in one place.',
      about_body_heading: 'Our story',
      about_body: 'Tell your story here. You can change this text in the admin panel under Site content.',
      contact_heading: "Let's Chat",
      footer_heading: 'Explore the collections',
    },
  },
};

export function localizeSettings(settings: SiteSettings, lang: Lang): SiteSettings {
  if (lang === 'az') return settings;
  const localized = { ...settings };
  for (const key of SETTING_TEXT_KEYS) localized[key] = settings.translations?.[lang]?.[key]?.trim() || settings[key];
  return localized;
}
