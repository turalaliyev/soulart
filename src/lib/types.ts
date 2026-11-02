export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
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
  sort_order: number;
  created_at: string;
  collection?: { name: string; slug: string } | null;
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
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type CollectionInput = Pick<Collection, 'name' | 'description' | 'image'>;
export type ProductInput = Pick<Product, 'collection_id' | 'name' | 'description' | 'images' | 'is_featured'>;

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
  hero_tagline: 'Art and crafts made by hand, gathered into collections you can explore piece by piece.',
  hero_image: null,
  intro_heading: 'Made slowly, by hand.',
  intro_text: 'Each piece starts as an idea and a pair of hands. Browse the collections to see what we have been making.',
  works_heading: 'Selected Works',
  collections_title: 'Collections',
  collections_tagline: 'Every collection is a family of pieces that share a material, a technique or a story.',
  collections_image: null,
  about_title: 'About SoulArt',
  about_tagline: 'We are an organization of makers creating art and crafts with care.',
  about_image: null,
  mission_lead: 'SoulArt brings together art and craft',
  mission_text: 'so that the work of many hands can be seen in one place.',
  about_body_heading: 'Our story',
  about_body: 'Tell your story here. You can change this text in the admin panel under Site content.',
  about_body_image: null,
  contact_heading: "Let's Chat",
  contact_image: null,
  contact_email: 'hello@soulart.com',
  contact_phone: '',
  contact_address: '',
  instagram_url: '',
  facebook_url: '',
  footer_heading: 'Explore the collections',
};
