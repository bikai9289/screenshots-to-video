import { createFileRoute } from '@tanstack/react-router';

import { findPromptByTitle } from '@/modules/prompts/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const title = url.searchParams.get('title');

    if (!title) {
      return respErr('Title parameter is required', { status: 400 });
    }

    const item = await findPromptByTitle(title);
    if (!item) {
      return respErr('Prompt not found', { status: 404 });
    }

    return respData(item);
  } catch (error: any) {
    console.error('get prompt by title failed:', error);
    return respErr(error.message || 'Failed to get prompt');
  }
}

export const Route = createFileRoute('/api/prompts/by-title')({
  server: {
    handlers: { GET },
  },
});
