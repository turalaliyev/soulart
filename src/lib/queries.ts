import { useQuery } from '@tanstack/react-query';
import { getBackend } from './backend';

export const keys = {
  settings: ['settings'] as const,
  categories: ['categories'] as const,
  collections: ['collections'] as const,
};

export const useSettingsQuery = () =>
  useQuery({ queryKey: keys.settings, queryFn: async () => (await getBackend()).getSettings() });

export const useCategories = () =>
  useQuery({ queryKey: keys.categories, queryFn: async () => (await getBackend()).listCategories() });

export const useCategory = (slug: string) =>
  useQuery({ queryKey: [...keys.categories, 'slug', slug], queryFn: async () => (await getBackend()).getCategory(slug) });

export const useCollections = (filter: { categoryId?: string; featured?: boolean; limit?: number } = {}, enabled = true) =>
  useQuery({ queryKey: [...keys.collections, 'list', filter], queryFn: async () => (await getBackend()).listCollections(filter), enabled });

export const useCollection = (slug: string) =>
  useQuery({ queryKey: [...keys.collections, 'slug', slug], queryFn: async () => (await getBackend()).getCollection(slug) });
