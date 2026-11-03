import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImagePlus, Star, X } from 'lucide-react';
import { getBackend, imageUrl } from '../lib/backend';
import { useT } from './i18n';
import { compressImage, type ImageItem } from './images';

/* Toasts ------------------------------------------------------------------ */
type Toast = (message: string, kind?: 'ok' | 'error') => void;
const ToastContext = createContext<Toast>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: 'ok' | 'error'; id: number } | null>(null);
  const show = useCallback<Toast>((message, kind = 'ok') => setToast({ message, kind, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.kind === 'error' ? 8000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toast && <div className={`toast toast-${toast.kind}`} key={toast.id}>{toast.message}</div>}
      </div>
    </ToastContext.Provider>
  );
}

/* Confirmation dialog ------------------------------------------------------ */
export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="dialog" onCancel={onCancel}>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="dialog-actions">
        <button className="btn" onClick={onCancel} disabled={busy} autoFocus>{t.cancel}</button>
        <button
          className="btn btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm();
          }}
        >
          {busy ? t.working : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

/* Layout helpers ------------------------------------------------------------ */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function MoveButtons({ index, count, onMove, label }: { index: number; count: number; onMove: (from: number, to: number) => void; label: string }) {
  const t = useT();
  return (
    <div className="move-buttons">
      <button className="icon-btn" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={t.moveUp(label)}><ArrowUp size={16} /></button>
      <button className="icon-btn" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={t.moveDown(label)}><ArrowDown size={16} /></button>
    </div>
  );
}

/* Image picking -------------------------------------------------------------- */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

/**
 * Pick, preview, reorder and remove images. Files stay in the browser until the form is saved,
 * so abandoning a form leaves nothing behind in storage.
 */
export function ImagesField({ items, onChange, max = 30, label, hint, error }: {
  items: ImageItem[];
  onChange: (items: ImageItem[]) => void;
  max?: number;
  label: string;
  hint?: string;
  error?: string;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState('');
  const multiple = max > 1;

  function addFiles(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter((f) => ACCEPT.split(',').includes(f.type));
    setProblem(accepted.length < files.length ? t.badFiles : '');
    const added = accepted.map<ImageItem>((file) => ({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    onChange(multiple ? [...items, ...added].slice(0, max) : added.slice(0, 1).concat(added.length ? [] : items));
  }

  function move(from: number, to: number) {
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  }

  return (
    <div className="field">
      <span>{label}</span>
      {hint && <small className="muted">{hint}</small>}
      <div className={multiple ? 'image-grid' : 'image-grid image-grid-single'}>
        {items.map((item, i) => (
          <figure className="image-tile" key={item.key}>
            <img src={item.url} alt={t.selected(i + 1)} />
            {multiple && i === 0 && <figcaption><Star size={12} aria-hidden="true" /> {t.cover}</figcaption>}
            <div className="image-tile-tools">
              {multiple && <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={t.moveEarlier}><ArrowLeft size={15} /></button>}
              {multiple && <button type="button" className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} aria-label={t.moveLater}><ArrowRight size={15} /></button>}
              <button type="button" className="icon-btn icon-btn-danger" onClick={() => onChange(items.filter((x) => x.key !== item.key))} aria-label={t.removeImage}><X size={15} /></button>
            </div>
          </figure>
        ))}
        {items.length < max && (
          <button
            type="button"
            className={`image-add ${dragging ? 'is-dragging' : ''} ${error ? 'has-error' : ''}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          >
            <ImagePlus size={22} aria-hidden="true" />
            <span>{multiple ? t.addImages : t.chooseImage}</span>
            <small>{t.dragDrop}</small>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      {(error || problem) && <p className="field-error" role="alert">{error || problem}</p>}
    </div>
  );
}

/** Compresses and uploads new images, returning all stored paths in display order. Rolls back uploads if any fail. */
export async function commitImages(items: ImageItem[], folder: 'collections' | 'products' | 'site'): Promise<{ paths: string[]; uploaded: string[] }> {
  const backend = await getBackend();
  const uploaded: string[] = [];
  const paths: string[] = [];
  try {
    for (const item of items) {
      if (item.path) {
        paths.push(item.path);
      } else if (item.file) {
        const path = await backend.uploadImage(await compressImage(item.file), folder);
        uploaded.push(path);
        paths.push(path);
      }
    }
  } catch (e) {
    await backend.removeImages(uploaded).catch(() => {});
    throw e;
  }
  return { paths, uploaded };
}

export const toItems = (paths: (string | null | undefined)[]): ImageItem[] =>
  paths.filter((p): p is string => Boolean(p)).map((path) => ({ key: path, path, url: imageUrl(path)! }));
