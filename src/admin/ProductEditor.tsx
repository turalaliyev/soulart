import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getBackend } from '../lib/backend';
import { keys, useCollections } from '../lib/queries';
import type { ImageItem } from './images';
import { commitImages, ImagesField, PageHeader, toItems, useToast } from './ui';

export default function ProductEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const collections = useCollections();

  const existing = useQuery({
    queryKey: [...keys.products, 'id', id],
    queryFn: async () => (await getBackend()).getProductById(id!),
    enabled: Boolean(id),
    staleTime: 0,
  });

  const [name, setName] = useState('');
  const [collectionId, setCollectionId] = useState(params.get('collection') ?? '');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing.data) return;
    setName(existing.data.name);
    setCollectionId(existing.data.collection_id);
    setDescription(existing.data.description);
    setIsFeatured(existing.data.is_featured);
    setImages(toItems(existing.data.images));
  }, [existing.data]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (images.length === 0) {
      setImageError('Add at least one image.');
      return;
    }
    setImageError('');
    setSaving(true);
    try {
      const backend = await getBackend();
      const { paths, uploaded } = await commitImages(images, 'products');
      const input = { name: name.trim(), collection_id: collectionId, description: description.trim(), images: paths, is_featured: isFeatured };
      try {
        if (id) {
          await backend.updateProduct(id, input);
          const removed = (existing.data?.images ?? []).filter((p) => !paths.includes(p));
          await backend.removeImages(removed).catch(() => {});
        } else {
          await backend.createProduct(input);
        }
      } catch (e) {
        await backend.removeImages(uploaded).catch(() => {});
        throw e;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.products }),
        queryClient.invalidateQueries({ queryKey: keys.collections }),
      ]);
      toast(id ? 'Product saved' : 'Product created');
      navigate('/admin/products');
    } catch (e) {
      toast((e as Error).message, 'error');
      setSaving(false);
    }
  }

  if (id && existing.isPending) return <p className="muted">Loading...</p>;
  if (id && !existing.data) return <p className="field-error">This product no longer exists.</p>;

  return (
    <>
      <Link to="/admin/products" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Products</Link>
      <PageHeader title={id ? `Edit ${existing.data?.name}` : 'New product'} />
      <form className="form-card" onSubmit={save}>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus={!id} />
        </label>
        <label className="field">
          <span>Collection</span>
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} required>
            <option value="" disabled>Choose a collection</option>
            {collections.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={5000} />
        </label>
        <ImagesField
          label="Images (at least one)"
          hint="The first image is the cover. Use the arrows to change the order."
          items={images}
          onChange={(next) => { setImages(next); if (next.length) setImageError(''); }}
          error={imageError}
        />
        <label className="check">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          <span>Show on the home page under Selected Works</span>
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save product'}</button>
          <Link className="btn" to="/admin/products">Cancel</Link>
        </div>
      </form>
    </>
  );
}
