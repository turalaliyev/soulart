import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { getBackend, imageUrl } from '../lib/backend';
import { useStrings } from './i18n';
import { Eyebrow, FitTitle, Reveal, RevealImage } from './motion';
import { useSettings } from './SiteApp';

type Status = { state: 'idle' | 'sending' | 'sent' } | { state: 'error'; message: string };

export default function ContactSection({ asPageHeading = false }: { asPageHeading?: boolean }) {
  const settings = useSettings();
  const t = useStrings();
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    // Hidden field that only bots fill in: pretend it worked and store nothing.
    if (data.get('company')) {
      setStatus({ state: 'sent' });
      return;
    }
    setStatus({ state: 'sending' });
    try {
      const backend = await getBackend();
      await backend.sendMessage({
        name: String(data.get('name')).trim(),
        email: String(data.get('email')).trim(),
        message: String(data.get('message')).trim(),
      });
      form.reset();
      setStatus({ state: 'sent' });
    } catch {
      setStatus({ state: 'error', message: t.sendError(settings.contact_email) });
    }
  }

  return (
    <section className={`contact ${asPageHeading ? 'contact-page' : ''}`} id="contact">
      <div className="wrap">
        <div className="contact-top">
          <div className="contact-info">
            <Eyebrow>{t.contactUs}</Eyebrow>
            <div className="contact-details">
              <a className="contact-email" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
              {settings.contact_phone && <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`}>{settings.contact_phone}</a>}
              {settings.contact_address && <p>{settings.contact_address}</p>}
            </div>
          </div>
          <Reveal>
            <form className="contact-form" onSubmit={submit}>
              <label>
                <span>{t.name}</span>
                <input name="name" required maxLength={200} autoComplete="name" placeholder={t.namePlaceholder} />
              </label>
              <label>
                <span>{t.email}</span>
                <input name="email" type="email" required maxLength={320} autoComplete="email" placeholder={t.emailPlaceholder} />
              </label>
              <label>
                <span>{t.message}</span>
                <textarea name="message" required maxLength={5000} rows={4} placeholder={t.messagePlaceholder} />
              </label>
              <input className="contact-trap" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <div className="contact-submit">
                <button type="submit" className="arrow-link" disabled={status.state === 'sending'}>
                  {status.state === 'sending' ? t.sending : t.submit} <ArrowRight size={20} aria-hidden="true" />
                </button>
                <p role="status" className={status.state === 'error' ? 'form-note form-note-error' : 'form-note'}>
                  {status.state === 'sent' && t.sent}
                  {status.state === 'error' && status.message}
                </p>
              </div>
            </form>
          </Reveal>
        </div>
        <div className="contact-big">
          {settings.contact_image && <RevealImage src={imageUrl(settings.contact_image)} alt="" className="contact-big-image" />}
          <FitTitle as={asPageHeading ? 'h1' : 'h2'} text={settings.contact_heading} className="contact-big-title" />
        </div>
      </div>
    </section>
  );
}
