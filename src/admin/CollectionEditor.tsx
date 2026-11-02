import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { getBackend, imageUrl } from '../lib/backend';
import { keys, useProducts } from '../lib/queries';
import type { ImageItem } from './images';
import { commitImages, ImagesField, PageHeader, toItems, useToast } from './ui';

export default function CollectionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const existing = useQuery({
    queryKey: [...keys.collections, 'id', id],
    queryFn: async () => (await getBackend()).getCollectionById(id!),
    enabled: Boolean(id),
    staleTime: 0,
  });
  const products = useProducts({ collectionId: id }, Boolean(id));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing.data) return;
    setName(existing.data.name);
    setDescription(existing.data.description);
    setImages(toItems([existing.data.image]));
  }, [existing.data]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const backend = await getBackend();
      const { paths, uploaded } = await commitImages(images, 'collections');
      const input = { name: name.trim(), description: description.trim(), image: paths[0] ?? null };
      try {
        if (id) {
          await backend.updateCollection(id, input);
          const old = existing.data?.image;
          if (old && old !== input.image) await backend.removeImages([old]).catch(() => {});
        } else {
          await backend.createCollection(input);
        }
      } catch (e) {
        await backend.removeImages(uploaded).catch(() => {});
        throw e;
      }
      await queryClient.invalidateQueries({ queryKey: keys.collections });
      toast(id ? 'Collection saved' : 'Collection created');
      navigate('/admin/collections');
    } catch (e) {
      toast((e as Error).message, 'error');
      setSaving(false);
    }
  }

  if (id && existing.isPending) return <p className="muted">Loading...</p>;
  if (id && !existing.data) return <p className="field-error">This collection no longer exists.</p>;

  return (
    <>
      <Link to="/admin/collections" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Collections</Link>
      <PageHeader title={id ? `Edit ${existing.data?.name}` : 'New collection'} />
      <form className="form-card" onSubmit={save}>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus={!id} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
        </label>
        <ImagesField label="Image (optional)" hint="If left empty, the website uses the first product's image." items={images} onChange={setImages} max={1} />
        <div className="form-actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save collection'}</button>
          <Link className="btn" to="/admin/collections">Cancel</Link>
        </div>
      </form>

      {id && (
        <section className="sub-section">
          <PageHeader
            title="Products in this collection"
            action={<Link className="btn" to={`/admin/products/new?collection=${id}`}><Plus size={16} aria-hidden="true" /> Add product</Link>}
          />
          {products.data?.length === 0 && <p className="muted">No products yet.</p>}
          <ul className="rows">
            {products.data?.map((product) => (
              <li className="row" key={product.id}>
                <img className="row-thumb" src={imageUrl(product.images[0])} alt="" loading="lazy" />
                <div className="row-main">
                  <Link to={`/admin/products/${product.id}`} className="row-title">{product.name}</Link>
                  <p className="muted row-sub">{product.images.length} {product.images.length === 1 ? 'image' : 'images'}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
