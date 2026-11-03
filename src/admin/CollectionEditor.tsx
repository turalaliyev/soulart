import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { getBackend, imageUrl } from '../lib/backend';
import { DEFAULT_LANG, type Lang } from '../lib/i18n';
import { keys, useProducts } from '../lib/queries';
import type { ContentKey } from '../lib/types';
import { useT } from './i18n';
import type { ImageItem } from './images';
import { LangTabs, readTexts, writeTranslations, type Texts } from './translations';
import { commitImages, ImagesField, PageHeader, toItems, useToast } from './ui';

const KEYS = ['name', 'description'] as const satisfies readonly ContentKey[];

export default function CollectionEditor() {
  const t = useT();
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

  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [texts, setTexts] = useState<Texts<ContentKey>>(() => readTexts(KEYS, null, null));
  const [nameError, setNameError] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing.data) return;
    setTexts(readTexts(KEYS, existing.data, existing.data.translations));
    setImages(toItems([existing.data.image]));
  }, [existing.data]);

  const setText = (key: ContentKey, value: string) => {
    setTexts((current) => ({ ...current, [lang]: { ...current[lang], [key]: value } }));
    if (key === 'name') setNameError('');
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    // The Azerbaijani field may be on a hidden tab, so the browser's own "required" check can't reach it.
    if (!texts.az.name.trim()) {
      setLang(DEFAULT_LANG);
      setNameError(t.nameRequired);
      return;
    }
    setSaving(true);
    try {
      const backend = await getBackend();
      const { paths, uploaded } = await commitImages(images, 'collections');
      const input = {
        name: texts.az.name.trim(),
        description: texts.az.description.trim(),
        image: paths[0] ?? null,
        translations: writeTranslations(KEYS, texts),
      };
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
      toast(id ? t.collectionSaved : t.collectionCreated);
      navigate('/admin/collections');
    } catch (e) {
      toast((e as Error).message, 'error');
      setSaving(false);
    }
  }

  if (id && existing.isPending) return <p className="muted">{t.loading}</p>;
  if (id && !existing.data) return <p className="field-error">{t.collectionGone}</p>;

  return (
    <>
      <Link to="/admin/collections" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> {t.collections}</Link>
      <PageHeader title={id ? t.editTitle(existing.data?.name ?? '') : t.newCollection} />
      <form className="form-card" onSubmit={save}>
        <LangTabs value={lang} onChange={setLang} texts={texts} watch={['name']} />
        <label className="field">
          <span>{t.name}</span>
          <input lang={lang} value={texts[lang].name} placeholder={lang === DEFAULT_LANG ? undefined : texts.az.name} onChange={(e) => setText('name', e.target.value)} maxLength={120} autoFocus={!id} aria-invalid={Boolean(nameError)} />
          {nameError && lang === DEFAULT_LANG && <p className="field-error" role="alert">{nameError}</p>}
        </label>
        <label className="field">
          <span>{t.description}</span>
          <textarea lang={lang} value={texts[lang].description} placeholder={lang === DEFAULT_LANG ? undefined : texts.az.description} onChange={(e) => setText('description', e.target.value)} rows={4} maxLength={2000} />
        </label>
        <ImagesField label={t.collectionImage} hint={t.collectionImageHint} items={images} onChange={setImages} max={1} />
        <div className="form-actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? t.saving : t.saveCollection}</button>
          <Link className="btn" to="/admin/collections">{t.cancel}</Link>
        </div>
      </form>

      {id && (
        <section className="sub-section">
          <PageHeader
            title={t.productsInCollection}
            action={<Link className="btn" to={`/admin/products/new?collection=${id}`}><Plus size={16} aria-hidden="true" /> {t.addProduct}</Link>}
          />
          {products.data?.length === 0 && <p className="muted">{t.noProductsYet}</p>}
          <ul className="rows">
            {products.data?.map((product) => (
              <li className="row" key={product.id}>
                <img className="row-thumb" src={imageUrl(product.images[0])} alt="" loading="lazy" />
                <div className="row-main">
                  <Link to={`/admin/products/${product.id}`} className="row-title">{product.name}</Link>
                  <p className="muted row-sub">{t.imageCount(product.images.length)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
