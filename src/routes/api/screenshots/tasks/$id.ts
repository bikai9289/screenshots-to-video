import { createFileRoute } from '@tanstack/react-router';
import {
  refreshScreenshotTask,
  studioFailure,
  studioSession,
} from '@/server/screenshots';

import { respData } from '@/lib/resp';
import { StudioError } from '@/lib/screenshots-contract';

export const Route = createFileRoute('/api/screenshots/tasks/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await studioSession(request);
          if (!/^[a-f0-9]{64}$/.test(params.id))
            throw new StudioError('NOT_FOUND');
          return respData(
            await refreshScreenshotTask(session.user.id, params.id),
            { headers: { 'Cache-Control': 'no-store' } }
          );
        } catch (error) {
          return studioFailure(error);
        }
      },
    },
  },
});
