import { createFileRoute } from '@tanstack/react-router';
import {
  limitedBody,
  refreshScreenshotTask,
  studioConfig,
  studioFailure,
  studioSession,
} from '@/server/screenshots';

import { reserveRender } from '@/modules/screenshots/service';
import { respData } from '@/lib/resp';
import {
  screenshotRequestSchema,
  StudioError,
} from '@/lib/screenshots-contract';

export const Route = createFileRoute('/api/screenshots/tasks/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await studioSession(request);
          const bytes = await limitedBody(request, 16384);
          let json: unknown;
          try {
            json = JSON.parse(new TextDecoder().decode(bytes));
          } catch {
            throw new StudioError('INVALID_REQUEST');
          }
          const parsed = screenshotRequestSchema.safeParse(json);
          if (!parsed.success) throw new StudioError('INVALID_REQUEST');
          const { storage } = await studioConfig();
          const task = await reserveRender({
            userId: session.user.id,
            request: parsed.data,
            signAsset: (key) => storage.signedGet(key),
          });
          return respData(
            await refreshScreenshotTask(session.user.id, task.id),
            { headers: { 'Cache-Control': 'no-store' } }
          );
        } catch (error) {
          return studioFailure(error);
        }
      },
    },
  },
});
