import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { getBackend, imageUrl } from '../lib/backend';
import { keys, useCollections, useProducts } from '../lib/queries';
import type { Product } from '../lib/types';
import { useT } from './i18n';
import { ConfirmDialog, MoveButtons, PageHeader, useToast } from './ui';

export default function ProductsList() {
  const t = useT();
  const collections = useCollections();
  const [collectionId, setCollectionId] = useState('');
  const [search, setSearch] = useState('');
  const { data, isPending, isError, error } = useProducts(collectionId ? { collectionId } : {});
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Product | null>(null);

  // Finds a product by its name in any language.
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return data;
    return data?.filter((p) => [p.name, p.translations?.ru?.name, p.translations?.en?.name].some((name) => name?.toLocaleLowerCase().includes(term)));
  }, [data, search]);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.products }),
    queryClient.invalidateQueries({ queryKey: keys.collections }),
  ]);

  async function move(from: number, to: number) {
    if (!data) return;
    const next = [...data];
    next.splice(to, 0, next.splice(from, 1)[0]);
    try {
      await (await getBackend()).reorderProducts(next.map((p) => p.id));
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await (await getBackend()).deleteProduct(deleting.id);
      toast(t.deleted(deleting.name));
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setDeleting(null);
  }

  const noCollections = collections.isSuccess && collections.data.length === 0;

  return (
    <>
      <PageHeader
        title={t.products}
        subtitle={t.productsSubtitle}
        action={!noCollections && <Link className="btn btn-primary" to={`/admin/products/new${collectionId ? `?collection=${collectionId}` : ''}`}><Plus size={16} aria-hidden="true" /> {t.newProduct}</Link>}
      />
      {noCollections ? (
        <div className="empty-state">
          <ImageIcon size={32} aria-hidden="true" />
          <h2>{t.createCollectionFirst}</h2>
          <p className="muted">{t.everyProductNeeds}</p>
          <Link className="btn btn-primary" to="/admin/collections/new">{t.createCollection}</Link>
        </div>
      ) : (
        <>
          <div className="filters">
            <label className="field">
              <span>{t.collection}</span>
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                <option value="">{t.allCollections}</option>
                {collections.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{t.search}</span>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.productNamePlaceholder} />
            </label>
          </div>
          {isPending && <p className="muted">{t.loading}</p>}
          {isError && <p className="field-error" role="alert">{(error as Error).message}</p>}
          {visible?.length === 0 && <p className="muted">{t.noProductsFound}</p>}
          <ul className="rows">
            {visible?.map((product) => (
              <li className="row" key={product.id}>
                {/* Reordering a searched subset would be ambiguous, so arrows only show on the full list. */}
                {!search.trim() && <MoveButtons index={data!.indexOf(product)} count={data!.length} onMove={move} label={product.name} />}
                <img className="row-thumb" src={imageUrl(product.images[0])} alt="" loading="lazy" />
                <div className="row-main">
                  <Link to={`/admin/products/${product.id}`} className="row-title">{product.name}</Link>
                  <p className="muted row-sub">{product.collection?.name} · {t.imageCount(product.images.length)}</p>
                </div>
                {product.is_featured && <span className="featured-mark" title={t.shownOnHome}><Star size={16} aria-label={t.featured} /></span>}
                <Link className="icon-btn" to={`/admin/products/${product.id}`} aria-label={t.edit(product.name)}><Pencil size={16} /></Link>
                <button className="icon-btn icon-btn-danger" onClick={() => setDeleting(product)} aria-label={t.deleteItem(product.name)}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </>
      )}
      {deleting && (
        <ConfirmDialog
          title={t.deleteTitle(deleting.name)}
          body={t.deleteProductBody}
          confirmLabel={t.delete}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
