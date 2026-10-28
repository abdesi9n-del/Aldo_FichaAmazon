import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Helper to convert an image URL (via proxy to bypass CORS) to Blob
export async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    // If proxy failed, try direct fetch
    const directRes = await fetch(imageUrl);
    if (!directRes.ok) throw new Error(`Error al descargar la imagen: ${imageUrl}`);
    return await directRes.blob();
  }
  return await response.blob();
}

// Download a single image
export async function downloadSingleImage(imageUrl: string, filename: string): Promise<void> {
  const blob = await fetchImageBlob(imageUrl);
  saveAs(blob, filename);
}

// Batch download selected images as a organized ZIP file
export async function downloadImagesZip(
  imageUrls: string[],
  baseName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (imageUrls.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('imagenes_producto') || zip;
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 35) || 'producto';

  let count = 0;
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const blob = await fetchImageBlob(url);
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const filename = `${sanitizedBase}_foto_${String(i + 1).padStart(2, '0')}.${ext}`;
      folder.file(filename, blob);
      count++;
      if (onProgress) onProgress(i + 1, imageUrls.length);
    } catch (err) {
      console.warn(`Could not add image ${url} to zip:`, err);
    }
  }

  if (count === 0) {
    throw new Error('No se pudieron descargar las imágenes seleccionadas.');
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  saveAs(zipContent, `${sanitizedBase}_imagenes.zip`);
}
