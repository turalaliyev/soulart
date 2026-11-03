import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { getBackend, imageUrl } from '../lib/backend';
import { keys, useCollections } from '../lib/queries';
import type { Collection } from '../lib/types';
import { useT } from './i18n';
import { ConfirmDialog, MoveButtons, PageHeader, useToast } from './ui';

export default function CollectionsList() {
  const t = useT();
  const { data, isPending, isError, error } = useCollections();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Collection | null>(null);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.collections }),
    queryClient.invalidateQueries({ queryKey: keys.products }),
  ]);

  async function move(from: number, to: number) {
    if (!data) return;
    const next = [...data];
    next.splice(to, 0, next.splice(from, 1)[0]);
    queryClient.setQueryData(keys.collections, next);
    try {
      await (await getBackend()).reorderCollections(next.map((c) => c.id));
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

  return (
    <>
      <PageHeader
        title={t.collections}
        subtitle={t.collectionsSubtitle}
        action={<Link className="btn btn-primary" to="/admin/collections/new"><Plus size={16} aria-hidden="true" /> {t.newCollection}</Link>}
      />
      {isPending && <p className="muted">{t.loading}</p>}
      {isError && <p className="field-error" role="alert">{(error as Error).message}</p>}
      {data?.length === 0 && (
        <div className="empty-state">
          <FolderOpen size={32} aria-hidden="true" />
          <h2>{t.noCollections}</h2>
          <p className="muted">{t.noCollectionsText}</p>
          <Link className="btn btn-primary" to="/admin/collections/new">{t.createCollection}</Link>
        </div>
      )}
      <ul className="rows">
        {data?.map((collection, i) => (
          <li className="row" key={collection.id}>
            <MoveButtons index={i} count={data.length} onMove={move} label={collection.name} />
            {collection.cover ? <img className="row-thumb" src={imageUrl(collection.cover)} alt="" loading="lazy" /> : <div className="row-thumb row-thumb-empty" aria-hidden="true" />}
            <div className="row-main">
              <Link to={`/admin/collections/${collection.id}`} className="row-title">{collection.name}</Link>
              <p className="muted row-sub">{t.productCount(collection.product_count)}</p>
            </div>
            <Link className="icon-btn" to={`/admin/collections/${collection.id}`} aria-label={t.edit(collection.name)}><Pencil size={16} /></Link>
            <button className="icon-btn icon-btn-danger" onClick={() => setDeleting(collection)} aria-label={t.deleteItem(collection.name)}><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      {deleting && (
        <ConfirmDialog
          title={t.deleteTitle(deleting.name)}
          body={deleting.product_count > 0 ? t.deleteCollectionBody(deleting.product_count) : t.cantUndo}
          confirmLabel={t.delete}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
