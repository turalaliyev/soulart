import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBackend } from '../lib/backend';
import { keys, useSettingsQuery } from '../lib/queries';
import type { SiteSettings } from '../lib/types';
import type { ImageItem } from './images';
import { commitImages, ImagesField, PageHeader, toItems, useToast } from './ui';

type TextKey = { [K in keyof SiteSettings]: SiteSettings[K] extends string ? K : never }[keyof SiteSettings];
type ImageKey = { [K in keyof SiteSettings]: SiteSettings[K] extends string ? never : K }[keyof SiteSettings];

type Field = { key: TextKey; label: string; long?: boolean; type?: string } | { key: ImageKey; label: string; image: true };

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: 'Home: hero',
    fields: [
      { key: 'hero_title', label: 'Large title' },
      { key: 'hero_tagline', label: 'Tagline', long: true },
      { key: 'hero_image', label: 'Background image', image: true },
    ],
  },
  {
    title: 'Home: sections',
    fields: [
      { key: 'intro_heading', label: 'Intro heading' },
      { key: 'intro_text', label: 'Intro text', long: true },
      { key: 'works_heading', label: 'Giant text behind the works' },
    ],
  },
  {
    title: 'Collections page',
    fields: [
      { key: 'collections_title', label: 'Title' },
      { key: 'collections_tagline', label: 'Tagline', long: true },
      { key: 'collections_image', label: 'Background image', image: true },
    ],
  },
  {
    title: 'About page',
    fields: [
      { key: 'about_title', label: 'Title' },
      { key: 'about_tagline', label: 'Tagline', long: true },
      { key: 'about_image', label: 'Background image', image: true },
      { key: 'mission_lead', label: 'Mission: opening words (always dark)' },
      { key: 'mission_text', label: 'Mission: rest of the sentence (darkens on scroll)', long: true },
      { key: 'about_body_heading', label: 'Story heading' },
      { key: 'about_body', label: 'Story text', long: true },
      { key: 'about_body_image', label: 'Story image', image: true },
    ],
  },
  {
    title: 'Contact and footer',
    fields: [
      { key: 'contact_heading', label: 'Large heading' },
      { key: 'contact_image', label: 'Image', image: true },
      { key: 'contact_email', label: 'Email', type: 'email' },
      { key: 'contact_phone', label: 'Phone (optional)' },
      { key: 'contact_address', label: 'Address (optional)' },
      { key: 'instagram_url', label: 'Instagram link (optional)', type: 'url' },
      { key: 'facebook_url', label: 'Facebook link (optional)', type: 'url' },
      { key: 'footer_heading', label: 'Footer heading' },
    ],
  },
];

const IMAGE_KEYS = SECTIONS.flatMap((s) => s.fields).filter((f): f is Extract<Field, { image: true }> => 'image' in f).map((f) => f.key);

export default function SiteEditor() {
  const { data, isPending, isError, error } = useSettingsQuery();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [images, setImages] = useState<Partial<Record<ImageKey, ImageItem[]>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm(data);
    setImages(Object.fromEntries(IMAGE_KEYS.map((key) => [key, toItems([data[key]])])));
  }, [data]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || !data) return;
    setSaving(true);
    try {
      const backend = await getBackend();
      const patch: Partial<SiteSettings> = { ...form };
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
      toast('Site content saved');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
  }

  if (isPending || (!form && !isError)) return <p className="muted">Loading...</p>;
  if (isError || !form) return <p className="field-error" role="alert">{(error as Error).message}</p>;

  return (
    <>
      <PageHeader title="Site content" subtitle="The text and images on Home, About, Collections and Contact." />
      <form onSubmit={save}>
        {SECTIONS.map((section) => (
          <fieldset className="form-card" key={section.title}>
            <legend>{section.title}</legend>
            {section.fields.map((field) => {
              if ('image' in field) {
                return <ImagesField key={field.key} label={field.label} max={1} items={images[field.key] ?? []} onChange={(items) => setImages((current) => ({ ...current, [field.key]: items }))} />;
              }
              const value = form[field.key];
              const set = (v: string) => setForm({ ...form, [field.key]: v });
              return (
                <label className="field" key={field.key}>
                  <span>{field.label}</span>
                  {field.long
                    ? <textarea rows={3} value={value} onChange={(e) => set(e.target.value)} />
                    : <input type={field.type ?? 'text'} value={value} onChange={(e) => set(e.target.value)} />}
                </label>
              );
            })}
          </fieldset>
        ))}
        <div className="save-bar">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </>
  );
}
