import { createFileRoute } from '@tanstack/react-router';
import { studioFailure, studioSession } from '@/server/screenshots';

import { findRender } from '@/modules/screenshots/service';
import { StudioError } from '@/lib/screenshots-contract';

export const Route = createFileRoute('/api/screenshots/tasks/$id/download')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await studioSession(request);
          const task = await findRender(session.user.id, params.id);
          if (task.status !== 'success' || !task.outputUrl)
            throw new StudioError('IDEMPOTENCY_CONFLICT');
          const output = new URL(task.outputUrl);
          if (output.protocol !== 'https:')
            throw new StudioError('INTERNAL_ERROR');
          return new Response(null, {
            status: 302,
            headers: {
              Location: output.href,
              'Cache-Control': 'no-store',
              'Referrer-Policy': 'no-referrer',
            },
          });
        } catch (error) {
          return studioFailure(error);
        }
      },
    },
  },
});
