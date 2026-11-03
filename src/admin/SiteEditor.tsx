import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBackend } from '../lib/backend';
import { DEFAULT_LANG, type Lang } from '../lib/i18n';
import { keys, useSettingsQuery } from '../lib/queries';
import { SETTING_TEXT_KEYS, type SettingTextKey, type SiteSettings } from '../lib/types';
import { useT, type AdminStrings } from './i18n';
import type { ImageItem } from './images';
import { LangTabs, readTexts, writeTranslations, type Texts } from './translations';
import { commitImages, ImagesField, PageHeader, toItems, useToast } from './ui';

const IMAGE_KEYS = ['hero_image', 'collections_image', 'about_image', 'about_body_image', 'contact_image'] as const;
type ImageKey = (typeof IMAGE_KEYS)[number];
type SharedKey = 'contact_email' | 'contact_phone' | 'instagram_url' | 'facebook_url';

type Field =
  | { kind: 'text'; key: SettingTextKey; long?: boolean }
  | { kind: 'shared'; key: SharedKey; type?: string }
  | { kind: 'image'; key: ImageKey };

const text = (key: SettingTextKey, long = false): Field => ({ kind: 'text', key, long });
const shared = (key: SharedKey, type?: string): Field => ({ kind: 'shared', key, type });
const image = (key: ImageKey): Field => ({ kind: 'image', key });

const SECTIONS: { title: keyof AdminStrings; fields: Field[] }[] = [
  { title: 'sectionHero', fields: [text('hero_title'), text('hero_tagline', true), image('hero_image')] },
  { title: 'sectionHome', fields: [text('intro_heading'), text('intro_text', true), text('works_heading')] },
  { title: 'sectionCollections', fields: [text('collections_title'), text('collections_tagline', true), image('collections_image')] },
  {
    title: 'sectionAbout',
    fields: [
      text('about_title'), text('about_tagline', true), image('about_image'), text('mission_lead'), text('mission_text', true),
      text('about_body_heading'), text('about_body', true), image('about_body_image'),
    ],
  },
  {
    title: 'sectionContact',
    fields: [
      text('contact_heading'), image('contact_image'), shared('contact_email', 'email'), shared('contact_phone'), text('contact_address'),
      shared('instagram_url', 'url'), shared('facebook_url', 'url'), text('footer_heading'),
    ],
  },
];

export default function SiteEditor() {
  const t = useT();
  const { data, isPending, isError, error } = useSettingsQuery();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [texts, setTexts] = useState<Texts<SettingTextKey> | null>(null);
  const [images, setImages] = useState<Partial<Record<ImageKey, ImageItem[]>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm(data);
    setTexts(readTexts(SETTING_TEXT_KEYS, data, data.translations));
    setImages(Object.fromEntries(IMAGE_KEYS.map((key) => [key, toItems([data[key]])])));
  }, [data]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || !texts || !data) return;
    setSaving(true);
    try {
      const backend = await getBackend();
      const patch: Partial<SiteSettings> = { ...form, ...texts.az, translations: writeTranslations(SETTING_TEXT_KEYS, texts) };
      const uploaded: string[] = [];
      for (const key of IMAGE_KEYS) {
        const result = await commitImages(images[key] ?? [], 'site');
        uploaded.push(...result.uploaded);
        patch[key] = result.paths[0] ?? null;
      }
      try {
        await backend.saveSettings(patch);
      } catch (e) {
        await backend.removeImages(uploaded).catch(() => {});
        throw e;
      }
      const replaced = IMAGE_KEYS.map((key) => data[key]).filter((p): p is string => Boolean(p) && !IMAGE_KEYS.some((key) => patch[key] === p));
      await backend.removeImages(replaced).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: keys.settings });
      toast(t.siteSaved);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
  }

  if (isPending || (!form && !isError)) return <p className="muted">{t.loading}</p>;
  if (isError || !form || !texts) return <p className="field-error" role="alert">{(error as Error)?.message}</p>;

  return (
    <>
      <PageHeader title={t.siteContent} subtitle={t.siteSubtitle} />
      <form onSubmit={save}>
        <div className="lang-tabs-sticky">
          <LangTabs value={lang} onChange={setLang} texts={texts} watch={['hero_tagline', 'intro_heading', 'about_title']} />
        </div>
        {SECTIONS.map((section) => (
          <fieldset className="form-card" key={section.title}>
            <legend>{t[section.title] as string}</legend>
            {section.fields.map((field) => {
              const label = t.fields[field.key];
              if (field.kind === 'image') {
                return <ImagesField key={field.key} label={label} max={1} items={images[field.key] ?? []} onChange={(items) => setImages((current) => ({ ...current, [field.key]: items }))} />;
              }
              if (field.kind === 'shared') {
                return (
                  <label className="field" key={field.key}>
                    <span>{label}</span>
                    <input type={field.type ?? 'text'} value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />
                  </label>
                );
              }
              const set = (value: string) => setTexts({ ...texts, [lang]: { ...texts[lang], [field.key]: value } });
              const placeholder = lang === DEFAULT_LANG ? undefined : texts.az[field.key];
              return (
                <label className="field" key={field.key}>
                  <span>{label}</span>
                  {field.long
                    ? <textarea lang={lang} rows={3} value={texts[lang][field.key]} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
                    : <input lang={lang} value={texts[lang][field.key]} placeholder={placeholder} onChange={(e) => set(e.target.value)} />}
                </label>
              );
            })}
          </fieldset>
        ))}
        <div className="save-bar">
          <button className="btn btn-primary" disabled={saving}>{saving ? t.saving : t.saveChanges}</button>
        </div>
      </form>
    </>
  );
}
