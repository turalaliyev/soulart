import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { getBackend, imageUrl } from '../lib/backend';
import { keys, useCategories, useCollections } from '../lib/queries';
import type { Collection } from '../lib/types';
import { useT } from './i18n';
import { ConfirmDialog, MoveButtons, PageHeader, useToast } from './ui';

export default function CollectionsList() {
  const t = useT();
  const categories = useCategories();
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const { data, isPending, isError, error } = useCollections(categoryId ? { categoryId } : {});
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Collection | null>(null);

  // Finds a collection by its name in any language.
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return data;
    return data?.filter((p) => [p.name, p.translations?.ru?.name, p.translations?.en?.name].some((name) => name?.toLocaleLowerCase().includes(term)));
  }, [data, search]);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.collections }),
    queryClient.invalidateQueries({ queryKey: keys.categories }),
  ]);

  async function move(from: number, to: number) {
    if (!data) return;
    const next = [...data];
    next.splice(to, 0, next.splice(from, 1)[0]);
    try {
      await (await getBackend()).reorderCollections(next.map((p) => p.id));
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await (await getBackend()).deleteCollection(deleting.id);
      toast(t.deleted(deleting.name));
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setDeleting(null);
  }

  const noCategories = categories.isSuccess && categories.data.length === 0;

  return (
    <>
      <PageHeader
        title={t.collections}
        subtitle={t.collectionsSubtitle}
        action={!noCategories && <Link className="btn btn-primary" to={`/admin/collections/new${categoryId ? `?category=${categoryId}` : ''}`}><Plus size={16} aria-hidden="true" /> {t.newCollection}</Link>}
      />
      {noCategories ? (
        <div className="empty-state">
          <ImageIcon size={32} aria-hidden="true" />
          <h2>{t.createCategoryFirst}</h2>
          <p className="muted">{t.everyCollectionNeeds}</p>
          <Link className="btn btn-primary" to="/admin/categories/new">{t.createCategory}</Link>
        </div>
      ) : (
        <>
          <div className="filters">
            <label className="field">
              <span>{t.category}</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">{t.allCategories}</option>
                {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{t.search}</span>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.collectionNamePlaceholder} />
            </label>
          </div>
          {isPending && <p className="muted">{t.loading}</p>}
          {isError && <p className="field-error" role="alert">{(error as Error).message}</p>}
          {visible?.length === 0 && <p className="muted">{t.noCollectionsFound}</p>}
          <ul className="rows">
            {visible?.map((collection) => (
              <li className="row" key={collection.id}>
                {/* Reordering a searched subset would be ambiguous, so arrows only show on the full list. */}
                {!search.trim() && <MoveButtons index={data!.indexOf(collection)} count={data!.length} onMove={move} label={collection.name} />}
                <img className="row-thumb" src={imageUrl(collection.images[0])} alt="" loading="lazy" />
                <div className="row-main">
                  <Link to={`/admin/collections/${collection.id}`} className="row-title">{collection.name}</Link>
                  <p className="muted row-sub">{collection.category?.name} · {t.imageCount(collection.images.length)}</p>
                </div>
                {collection.is_featured && <span className="featured-mark" title={t.shownOnHome}><Star size={16} aria-label={t.featured} /></span>}
                <Link className="icon-btn" to={`/admin/collections/${collection.id}`} aria-label={t.edit(collection.name)}><Pencil size={16} /></Link>
                <button className="icon-btn icon-btn-danger" onClick={() => setDeleting(collection)} aria-label={t.deleteItem(collection.name)}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </>
      )}
      {deleting && (
        <ConfirmDialog
          title={t.deleteTitle(deleting.name)}
          body={t.deleteCollectionBody}
          confirmLabel={t.delete}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
