import { useQuery } from '@tanstack/react-query';
import { getBackend } from './backend';

export const keys = {
  settings: ['settings'] as const,
  collections: ['collections'] as const,
  products: ['products'] as const,
};

export const useSettingsQuery = () =>
  useQuery({ queryKey: keys.settings, queryFn: async () => (await getBackend()).getSettings() });

export const useCollections = () =>
  useQuery({ queryKey: keys.collections, queryFn: async () => (await getBackend()).listCollections() });

export const useCollection = (slug: string) =>
  useQuery({ queryKey: [...keys.collections, 'slug', slug], queryFn: async () => (await getBackend()).getCollection(slug) });

export const useProducts = (filter: { collectionId?: string; featured?: boolean; limit?: number } = {}, enabled = true) =>
  useQuery({ queryKey: [...keys.products, 'list', filter], queryFn: async () => (await getBackend()).listProducts(filter), enabled });

export const useProduct = (slug: string) =>
  useQuery({ queryKey: [...keys.products, 'slug', slug], queryFn: async () => (await getBackend()).getProduct(slug) });
