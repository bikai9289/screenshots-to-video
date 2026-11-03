import { createFileRoute } from '@tanstack/react-router';

import { getLatestShowcases } from '@/modules/showcases/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const type = url.searchParams.get('type') || undefined;

    const items = await getLatestShowcases({
      limit,
      type,
    });

    return respData({ items });
  } catch (error: any) {
    console.error('get showcases failed:', error);
    return respErr(error.message || 'Failed to get showcases');
  }
}

export const Route = createFileRoute('/api/showcases')({
  server: {
    handlers: { GET },
  },
});
