import { createFileRoute } from '@tanstack/react-router';
import {
  limitedBody,
  studioConfig,
  studioFailure,
  studioSession,
  validateScreenshot,
} from '@/server/screenshots';

import { screenshotLimits } from '@/config/screenshots-product';
import {
  getRenderBalance,
  saveScreenshotAsset,
} from '@/modules/screenshots/service';
import { respData } from '@/lib/resp';
import { StudioError } from '@/lib/screenshots-contract';

export const Route = createFileRoute('/api/screenshots/assets')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uploaded: string[] = [];
        let cleanup: ((key: string) => Promise<void>) | undefined;
        try {
          const session = await studioSession(request);
          if ((await getRenderBalance(session.user.id)) < 1)
            throw new StudioError('PAID_ACCESS_REQUIRED');
          const { storage } = await studioConfig();
          cleanup = (key) => storage.remove(key);
          const contentType = request.headers.get('content-type') || '';
          if (!contentType.startsWith('multipart/form-data;'))
            throw new StudioError('INVALID_REQUEST');
          const bytes = await limitedBody(
            request,
            screenshotLimits.maxTotalBytes + 65536
          );
          const form = await new Response(bytes as BodyInit, {
            headers: { 'Content-Type': contentType },
          })
            .formData()
            .catch(() => {
              throw new StudioError('INVALID_REQUEST');
            });
          const files = form.getAll('files');
          if (
            [...form.keys()].some((key) => key !== 'files') ||
            !files.length ||
            files.some((file) => !(file instanceof File))
          )
            throw new StudioError('INVALID_REQUEST');
          if (files.length > screenshotLimits.maxFiles)
            throw new StudioError('UPLOAD_LIMIT');
          if (
            (files as File[]).reduce((total, file) => total + file.size, 0) >
            screenshotLimits.maxTotalBytes
          )
            throw new StudioError('UPLOAD_LIMIT');
          const validated = await Promise.all(
            (files as File[]).map(validateScreenshot)
          );
          const assets = [];
          for (const image of validated) {
            const id = crypto.randomUUID();
            const objectKey = `screenshots/${session.user.id}/${id}`;
            await storage.put(objectKey, image.bytes, image.mimeType);
            uploaded.push(objectKey);
            const row = {
              id,
              userId: session.user.id,
              objectKey,
              mimeType: image.mimeType,
              byteSize: image.byteSize,
              width: image.width,
              height: image.height,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
            };
            await saveScreenshotAsset(row);
            assets.push({
              id,
              width: row.width,
              height: row.height,
              mimeType: row.mimeType,
              byteSize: row.byteSize,
              expiresAt: row.expiresAt,
            });
          }
          return respData(
            { assets },
            { headers: { 'Cache-Control': 'no-store' } }
          );
        } catch (error) {
          if (cleanup) await Promise.allSettled(uploaded.map(cleanup));
          return studioFailure(error);
        }
      },
    },
  },
});
