import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { envConfigs } from '@/config';
import { getStorage } from '@/modules/storage/service';
import { md5 } from '@/lib/hash';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

// Raster formats only. SVG can carry script and would run on whatever origin
// serves it, so it is not accepted from users.
const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return map[mimeType] || '';
};

// Cap for the no-storage local-disk fallback (dev). Configurable via INLINE_IMAGE_MAX_KB.
// Per request: bounds memory (formData() buffers the whole body) and storage use.
const MAX_REQUEST_BYTES = 20 * 1024 * 1024;

const INLINE_MAX_BYTES =
  (Number(envConfigs.inline_image_max_kb) || 10240) * 1024;
const MAX_IMAGE_COUNT = 9;

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'upload-image',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    // Per account too: one user can't sidestep the IP bucket by switching networks.
    const userLimited = enforceMinIntervalRateLimit(request, {
      intervalMs: 1000,
      keyPrefix: 'upload-image',
      extraKey: session.user.id,
    });
    if (userLimited) return userLimited;

    // Refuse oversized bodies before buffering them, when the size is declared.
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > MAX_REQUEST_BYTES + 64 * 1024) {
      return respErr('Upload is larger than 20MB in total');
    }

    const formData = await request.formData();
    const files = (
      formData.getAll('files').length > 0
        ? formData.getAll('files')
        : formData.getAll('file')
    ) as File[];
    if (!files.length) return respErr('No files provided');
    if (files.length > MAX_IMAGE_COUNT) {
      return respErr(`Too many files (maximum ${MAX_IMAGE_COUNT})`);
    }
    if (files.reduce((sum, f) => sum + f.size, 0) > MAX_REQUEST_BYTES) {
      return respErr('Upload is larger than 20MB in total');
    }

    const storage = await getStorage();
    const uploadResults: Array<{
      url: string;
      key: string;
      filename: string;
      deduped: boolean;
    }> = [];

    for (const file of files) {
      const extension = extFromMime(file.type);
      if (!extension) {
        return respErr(`File ${file.name} is not an image`);
      }
      if (file.size > INLINE_MAX_BYTES) {
        const limitKb = Math.round(INLINE_MAX_BYTES / 1024);
        return respErr(
          `Image too large (${(file.size / 1024).toFixed(0)}KB > ${limitKb}KB)`
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      const digest = md5(body);
      const ext = extension;
      // R2Provider prepends its own uploadPath (default `uploads`).
      const datePath = new Date().toISOString().slice(0, 10);
      const objectKey = `${datePath}/${digest}.${ext}`;

      // If R2 storage is not configured, return clear error message
      if (!storage) {
        return respErr(
          'Cloudflare R2 storage is not configured. Please configure R2 in environment variables or admin settings.'
        );
      }

      const exists = await storage.exists({ key: objectKey });
      if (exists) {
        const publicUrl = storage.getPublicUrl({ key: objectKey });
        if (publicUrl) {
          uploadResults.push({
            url: publicUrl,
            key: objectKey,
            filename: file.name,
            deduped: true,
          });
          continue;
        }
      }

      const result = await storage.uploadFile({
        body,
        key: objectKey,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success || !result.url) {
        return respErr(result.error || 'Upload failed');
      }

      uploadResults.push({
        url: result.url,
        key: result.key || objectKey,
        filename: file.name,
        deduped: false,
      });
    }

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e: any) {
    console.error('upload image failed:', e, e?.cause);
    return respErr('Storage upload failed');
  }
}

export const Route = createFileRoute('/api/storage/upload-image')({
  server: {
    handlers: { POST },
  },
});
