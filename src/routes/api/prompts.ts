import { createFileRoute } from '@tanstack/react-router';

import { getPrompts, PromptStatus } from '@/modules/prompts/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const type = url.searchParams.get('type') || undefined;

    const prompts = await getPrompts({
      page,
      limit,
      type,
      status: PromptStatus.PUBLISHED,
    });

    return respData({
      items: prompts,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('get prompts failed:', error);
    return respErr(error.message || 'Failed to get prompts');
  }
}

export const Route = createFileRoute('/api/prompts')({
  server: {
    handlers: { GET },
  },
});
