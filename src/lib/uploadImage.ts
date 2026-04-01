import { API_URL } from '@/lib/api';

/**
 * uploadImage
 *
 * Replaces the FileReader.readAsDataURL() + JSON.stringify(base64) pattern
 * used in banners, categories, products, and instagram pages.
 *
 * Instead of embedding a ~2.7MB base64 string inside a JSON payload
 * (which breaks Spring Boot's default 1-2MB body limit), this function
 * POSTs the file as multipart/form-data to a dedicated upload endpoint
 * and returns the permanent URL the server assigns to it.
 *
 * Usage:
 *   const url = await uploadImage(file);           // general upload
 *   const url = await uploadImage(file, 'banner'); // with context hint
 *   if (!url) { toast.error('Upload failed'); return; }
 *
 * Expected server response: { url: string }
 *
 * If you need to support URL inputs (the "Add by URL" option in the UI),
 * those bypass this function entirely — the URL string goes straight
 * into form state without any upload.
 */
export async function uploadImage(
  file: File,
  context: 'product' | 'banner' | 'banners' | 'category' | 'instagram' | 'general' | 'videos' = 'general'
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', context);

    const res = await fetch(`${API_URL}/api/admin/upload`, {
      method: 'POST',
      credentials: 'include',
      // Do NOT set Content-Type — browser sets it automatically with the
      // correct multipart boundary when body is FormData
      body: formData,
    });

    if (!res.ok) {
      console.error(`Image upload failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data.url ?? null;

  } catch (err) {
    console.error('Image upload error:', err);
    return null;
  }
}

/**
 * processImageFile
 *
 * Drop-in replacement for the FileReader.readAsDataURL() blocks in
 * SingleImageDrop and ImageDropzone components.
 *
 * Old pattern (base64 — breaks on large files):
 *   const reader = new FileReader();
 *   reader.onload = e => onChange(e.target?.result as string);
 *   reader.readAsDataURL(file);
 *
 * New pattern (server upload):
 *   const url = await processImageFile(file, 'banner');
 *   if (url) onChange(url);
 *
 * Returns null and logs an error if the upload fails, so the caller
 * can show a toast without crashing.
 */
export async function processImageFile(
  file: File,
  context: 'product' | 'banner' | 'banners' | 'category' | 'instagram' | 'general' | 'videos' = 'general',
  onError?: (msg: string) => void
): Promise<string | null> {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  if (!isImage && !isVideo) {
    onError?.('Only image or video files are supported.');
    return null;
  }

  const MAX_MB = isVideo ? 15 : 5;
  if (file.size > MAX_MB * 1024 * 1024) {
    onError?.(`File must be under ${MAX_MB}MB.`);
    return null;
  }

  const url = await uploadImage(file, context);
  if (!url) {
    onError?.('Upload failed. Please try again.');
  }
  return url;
}
