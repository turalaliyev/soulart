import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { getBackend, imageUrl } from '../lib/backend';
import { keys, useCategories } from '../lib/queries';
import type { Category } from '../lib/types';
import { useT } from './i18n';
import { ConfirmDialog, MoveButtons, PageHeader, useToast } from './ui';

export default function CategoriesList() {
  const t = useT();
  const { data, isPending, isError, error } = useCategories();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Category | null>(null);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.categories }),
    queryClient.invalidateQueries({ queryKey: keys.collections }),
  ]);

  async function move(from: number, to: number) {
    if (!data) return;
    const next = [...data];
    next.splice(to, 0, next.splice(from, 1)[0]);
    queryClient.setQueryData(keys.categories, next);
    try {
      await (await getBackend()).reorderCategories(next.map((c) => c.id));
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await (await getBackend()).deleteCategory(deleting.id);
      toast(t.deleted(deleting.name));
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setDeleting(null);
  }

  return (
    <>
      <PageHeader
        title={t.categories}
        subtitle={t.categoriesSubtitle}
        action={<Link className="btn btn-primary" to="/admin/categories/new"><Plus size={16} aria-hidden="true" /> {t.newCategory}</Link>}
      />
      {isPending && <p className="muted">{t.loading}</p>}
      {isError && <p className="field-error" role="alert">{(error as Error).message}</p>}
      {data?.length === 0 && (
        <div className="empty-state">
          <FolderOpen size={32} aria-hidden="true" />
          <h2>{t.noCategories}</h2>
          <p className="muted">{t.noCategoriesText}</p>
          <Link className="btn btn-primary" to="/admin/categories/new">{t.createCategory}</Link>
        </div>
      )}
      <ul className="rows">
        {data?.map((category, i) => (
          <li className="row" key={category.id}>
            <MoveButtons index={i} count={data.length} onMove={move} label={category.name} />
            {category.cover ? <img className="row-thumb" src={imageUrl(category.cover)} alt="" loading="lazy" /> : <div className="row-thumb row-thumb-empty" aria-hidden="true" />}
            <div className="row-main">
              <Link to={`/admin/categories/${category.id}`} className="row-title">{category.name}</Link>
              <p className="muted row-sub">{t.collectionCount(category.collection_count)}</p>
            </div>
            <Link className="icon-btn" to={`/admin/categories/${category.id}`} aria-label={t.edit(category.name)}><Pencil size={16} /></Link>
            <button className="icon-btn icon-btn-danger" onClick={() => setDeleting(category)} aria-label={t.deleteItem(category.name)}><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      {deleting && (
        <ConfirmDialog
          title={t.deleteTitle(deleting.name)}
          body={deleting.collection_count > 0 ? t.deleteCategoryBody(deleting.collection_count) : t.cantUndo}
          confirmLabel={t.delete}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
