import { createFileRoute } from '@tanstack/react-router';

import { getPrompts, PromptStatus } from '@/modules/prompts/service';
import { getLatestShowcases } from '@/modules/showcases/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const tags = url.searchParams.get('tags') || undefined;
    const excludeTags = url.searchParams.get('excludeTags') || undefined;
    const searchTerm = url.searchParams.get('searchTerm') || undefined;
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as
      | 'asc'
      | 'desc';
    const type = url.searchParams.get('type') || undefined;
    const usePrompts = url.searchParams.get('usePrompts') === 'true';

    if (usePrompts) {
      const prompts = await getPrompts({
        page: 1,
        limit,
        type,
        status: PromptStatus.PUBLISHED,
      });

      const transformed = prompts.map((p) => ({
        id: p.id,
        title: p.promptTitle || p.title,
        description: p.promptDescription || p.description,
        prompt: p.promptDescription || p.description,
        image: p.image || '',
        videoUrl: p.type === 'video' ? p.image || '' : null,
        type: p.type,
        createdAt:
          p.createdAt instanceof Date
            ? p.createdAt.toISOString()
            : String(p.createdAt),
      }));

      return respData(transformed);
    }

    const showcases = await getLatestShowcases({
      limit,
      tags,
      excludeTags,
      searchTerm,
      sortOrder,
      type,
    });

    return respData(showcases);
  } catch (error: any) {
    console.error('get showcases latest failed:', error);
    return respErr(error.message || 'Failed to get showcases');
  }
}

export const Route = createFileRoute('/api/showcases/latest')({
  server: {
    handlers: { GET },
  },
});
