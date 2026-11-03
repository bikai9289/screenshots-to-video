import { definePlugin } from 'nitro';

import { expireTimedOutTasks } from '@/modules/ai-tasks/service';
import { syncDailyAITasksToR2 } from '@/modules/ai/storage-migration';

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', ({ context }) => {
    context.waitUntil(
      Promise.all([syncDailyAITasksToR2(), expireTimedOutTasks()])
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
