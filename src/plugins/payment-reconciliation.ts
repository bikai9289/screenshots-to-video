import { reconcilePayments } from '@/server/payment-reconciliation';
import { definePlugin } from 'nitro';

import { runWithDbScope } from '@/core/db/request-scope';

export default definePlugin((app) => {
  app.hooks.hook('cloudflare:scheduled', ({ context, env, controller }) => {
    if (controller.cron !== '*/5 * * * *') return;
    (globalThis as any).__CF_ENV__ = env;
    context.waitUntil(
      runWithDbScope(reconcilePayments)
        .then((summary) => console.info('Payment reconciliation:', summary))
        .catch(() =>
          console.error(
            'Payment reconciliation unavailable; orders retained for retry.'
          )
        )
    );
  });
});
