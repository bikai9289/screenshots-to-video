import { createFileRoute } from '@tanstack/react-router';

import { syncDailyAITasksToR2 } from '@/modules/ai/storage-migration';
import { respData, respErr } from '@/lib/resp';

async function handleSync(request: Request) {
  const runtimeEnv =
    (globalThis as any).__CF_ENV__ ?? (globalThis as any).__env__;
  const cronSecret =
    runtimeEnv?.AI_STORAGE_CRON_SECRET ||
    runtimeEnv?.CRON_SECRET ||
    runtimeEnv?.PAYMENT_CRON_SECRET ||
    process.env.AI_STORAGE_CRON_SECRET ||
    process.env.CRON_SECRET ||
    process.env.PAYMENT_CRON_SECRET ||
    '';

  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return respErr('Unauthorized', { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const days = Number(url.searchParams.get('days') || 1);
    const limit = Number(url.searchParams.get('limit') || 100);

    const result = await syncDailyAITasksToR2({ days, limit });
    return respData(result);
  } catch (error: any) {
    return respErr(error?.message || 'Failed to sync AI media to R2', {
      status: 500,
    });
  }
}

export const Route = createFileRoute('/api/ai/storage/sync-r2')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handleSync(request),
      POST: ({ request }: { request: Request }) => handleSync(request),
    },
  },
});
