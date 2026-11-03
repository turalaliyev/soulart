import { adminStrings } from './i18n';

export interface ImageItem {
  key: string;
  url: string;
  /** Already in storage. */
  path?: string;
  /** Chosen in this session, not uploaded yet. */
  file?: File;
}

const MAX_EDGE = 2400;
const QUALITY = 0.86;

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Shrinks camera-sized photos before upload, to keep pages fast and stay inside the storage quota. */
export async function compressImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(adminStrings().unreadable(file.name));
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Browsers without a WebP encoder return PNG instead, which would be far larger, so use JPEG there.
  const webp = await encode(canvas, 'image/webp');
  const blob = webp?.type === 'image/webp' ? webp : await encode(canvas, 'image/jpeg');
  if (!blob) throw new Error(adminStrings().unprocessable(file.name));
  return blob;
}
