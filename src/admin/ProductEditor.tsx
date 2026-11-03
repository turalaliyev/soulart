import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getBackend } from '../lib/backend';
import { DEFAULT_LANG, type Lang } from '../lib/i18n';
import { keys, useCollections } from '../lib/queries';
import type { ContentKey } from '../lib/types';
import { useT } from './i18n';
import type { ImageItem } from './images';
import { LangTabs, readTexts, writeTranslations, type Texts } from './translations';
import { commitImages, ImagesField, PageHeader, toItems, useToast } from './ui';

const KEYS = ['name', 'description'] as const satisfies readonly ContentKey[];

export default function ProductEditor() {
  const t = useT();
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

  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [texts, setTexts] = useState<Texts<ContentKey>>(() => readTexts(KEYS, null, null));
  const [nameError, setNameError] = useState('');
  const [collectionId, setCollectionId] = useState(params.get('collection') ?? '');
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing.data) return;
    setTexts(readTexts(KEYS, existing.data, existing.data.translations));
    setCollectionId(existing.data.collection_id);
    setIsFeatured(existing.data.is_featured);
    setImages(toItems(existing.data.images));
  }, [existing.data]);

  const setText = (key: ContentKey, value: string) => {
    setTexts((current) => ({ ...current, [lang]: { ...current[lang], [key]: value } }));
    if (key === 'name') setNameError('');
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    // The Azerbaijani field may be on a hidden tab, so the browser's own "required" check can't reach it.
    const nameMissing = !texts.az.name.trim();
    setNameError(nameMissing ? t.nameRequired : '');
    setImageError(images.length === 0 ? t.atLeastOneImage : '');
    if (nameMissing) setLang(DEFAULT_LANG);
    if (nameMissing || images.length === 0) return;
    setSaving(true);
    try {
      const backend = await getBackend();
      const { paths, uploaded } = await commitImages(images, 'products');
      const input = {
        name: texts.az.name.trim(),
        collection_id: collectionId,
        description: texts.az.description.trim(),
        images: paths,
        is_featured: isFeatured,
        translations: writeTranslations(KEYS, texts),
      };
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
      toast(id ? t.productSaved : t.productCreated);
      navigate('/admin/products');
    } catch (e) {
      toast((e as Error).message, 'error');
      setSaving(false);
    }
  }

  if (id && existing.isPending) return <p className="muted">{t.loading}</p>;
  if (id && !existing.data) return <p className="field-error">{t.productGone}</p>;

  return (
    <>
      <Link to="/admin/products" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> {t.products}</Link>
      <PageHeader title={id ? t.editTitle(existing.data?.name ?? '') : t.newProduct} />
      <form className="form-card" onSubmit={save}>
        <LangTabs value={lang} onChange={setLang} texts={texts} watch={['name']} />
        <label className="field">
          <span>{t.name}</span>
          <input lang={lang} value={texts[lang].name} placeholder={lang === DEFAULT_LANG ? undefined : texts.az.name} onChange={(e) => setText('name', e.target.value)} maxLength={120} autoFocus={!id} aria-invalid={Boolean(nameError)} />
          {nameError && lang === DEFAULT_LANG && <p className="field-error" role="alert">{nameError}</p>}
        </label>
        <label className="field">
          <span>{t.description}</span>
          <textarea lang={lang} value={texts[lang].description} placeholder={lang === DEFAULT_LANG ? undefined : texts.az.description} onChange={(e) => setText('description', e.target.value)} rows={6} maxLength={5000} />
        </label>
        <label className="field">
          <span>{t.collection}</span>
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} required>
            <option value="" disabled>{t.chooseCollection}</option>
            {collections.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <ImagesField
          label={t.productImages}
          hint={t.productImagesHint}
          items={images}
          onChange={(next) => { setImages(next); if (next.length) setImageError(''); }}
          error={imageError}
        />
        <label className="check">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          <span>{t.showOnHome}</span>
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? t.saving : t.saveProduct}</button>
          <Link className="btn" to="/admin/products">{t.cancel}</Link>
        </div>
      </form>
    </>
  );
}
