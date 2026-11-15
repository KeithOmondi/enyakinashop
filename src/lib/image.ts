export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // keep in step with the server's limit

/**
 * Shrinks a photo in the browser before upload: longest side 1024px, WebP (JPEG where WebP is
 * unavailable), transparent areas flattened to white. A 12-megapixel phone photo (4-8 MB)
 * becomes roughly 60-150 KB, which keeps uploads quick on mobile data and R2 storage small.
 * The camera's rotation is applied, so portrait photos are not stored sideways.
 */
export async function compressImage(file: File, maxEdge = 1024): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPEG, PNG or WebP).');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('That image could not be read. Try a JPEG, PNG or WebP photo.');
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not available in this browser.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  for (const quality of [0.82, 0.65, 0.5]) {
    const webp = await toBlob('image/webp', quality);
    const blob = webp && webp.type === 'image/webp' ? webp : await toBlob('image/jpeg', quality);
    if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  throw new Error('That photo is too large even after shrinking. Try a smaller one.');
}
