/**
 * Infer a standardized download filename based on creation item data.
 */
export function getCreationFilename(item: {
  id?: string;
  mediaType?: string;
  title?: string;
  url?: string;
}): string {
  const ext =
    item.mediaType === 'video'
      ? 'mp4'
      : item.mediaType === 'music'
        ? 'mp3'
        : 'png';
  const prefix = item.title || `creation-${item.id || Date.now()}`;
  return prefix.endsWith(`.${ext}`) ? prefix : `${prefix}.${ext}`;
}

/**
 * Universal media/file download helper.
 * Proxies cross-origin assets through /api/download with Content-Disposition: attachment
 * and converts to Blob to guarantee that files are downloaded to the user's local disk directly,
 * and allows callers to await download completion.
 */
export async function downloadFile(
  url: string,
  filename?: string
): Promise<void> {
  if (!url || typeof window === 'undefined') return;

  const resolvedFilename =
    filename || url.split('/').pop()?.split('?')[0] || `download-${Date.now()}`;

  // If already a local blob: or data: URL, trigger direct anchor download
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = resolvedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(resolvedFilename)}`;
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = resolvedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch {
    // Fallback directly to proxy link
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = resolvedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
