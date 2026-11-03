import { getCustomConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

import type { AdminHandlerContext } from '../types';

const noStore = {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
};

const WRITE_DISABLED =
  'Admin settings writes are disabled. Configure via environment variables or wrangler secrets.';

export async function GET({ request, actor }: AdminHandlerContext) {
  try {
    const configs = await getCustomConfigs();
    return respData(configs, noStore);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export async function POST({ request, actor }: AdminHandlerContext) {
  void request;
  void actor;
  return respErr(WRITE_DISABLED);
}
