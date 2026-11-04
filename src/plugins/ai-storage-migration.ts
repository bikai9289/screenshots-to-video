import { maintainScreenshots } from '@/server/screenshots-maintenance';
import { definePlugin } from 'nitro';

import { runWithDbScope } from '@/core/db/request-scope';
import { expireTimedOutTasks } from '@/modules/ai-tasks/service';
import { syncDailyAITasksToR2 } from '@/modules/ai/storage-migration';

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', ({ context, env }) => {
    // Scheduled events can be the first event in an isolate: no HTTP entry
    // has initialized D1/R2 bindings yet.
    (globalThis as any).__CF_ENV__ = env;
    context.waitUntil(
      runWithDbScope(() => maintainScreenshots(true))
        .then((summary) => {
          console.info('Screenshot maintenance completed:', summary);
          if (summary.failed)
            console.error('Screenshot maintenance requires retry:', {
              failed: summary.failed,
            });
        })
        .catch(() =>
          console.error(
            'Screenshot maintenance failed; pending tasks and inputs retained for retry.'
          )
        )
    );
    context.waitUntil(
      runWithDbScope(() =>
        Promise.all([syncDailyAITasksToR2(), expireTimedOutTasks()])
      )
        .then(
          ([{ totalChecked, pendingCount, migratedCount }, expiredCount]) => {
            console.info('AI storage migration completed:', {
              totalChecked,
              pendingCount,
              migratedCount,
              expiredCount,
            });
          }
        )
        .catch((error) => {
          console.error('AI storage migration failed:', error);
        })
    );
  });
});
