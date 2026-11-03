import { createFileRoute } from '@tanstack/react-router';
import {
  screenshotServiceReady,
  studioFailure,
  studioSession,
} from '@/server/screenshots';

import { screenshotLimits } from '@/config/screenshots-product';
import { getAllConfigs } from '@/modules/config/service';
import {
  getRenderBalance,
  listRenders,
  publicRender,
} from '@/modules/screenshots/service';
import { respData } from '@/lib/resp';

export const Route = createFileRoute('/api/screenshots/account')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await studioSession(request, 300);
          const config = await getAllConfigs();
          return respData(
            {
              remainingRenders: await getRenderBalance(session.user.id),
              serviceAvailable: screenshotServiceReady(config),
              limits: screenshotLimits,
              tasks: (await listRenders(session.user.id)).map(publicRender),
            },
            { headers: { 'Cache-Control': 'no-store' } }
          );
        } catch (error) {
          return studioFailure(error);
        }
      },
    },
  },
});
