import { createFileRoute } from '@tanstack/react-router';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';

import { extractAudioUrl, extractMediaUrl } from '@/core/ai';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const mediaType = url.searchParams.get('mediaType');
    const limitParam = Math.min(Number(url.searchParams.get('limit')) || 9, 20);

    const conditions = [eq(aiTask.status, 'success'), isNull(aiTask.deletedAt)];

    if (mediaType && ['image', 'video', 'music'].includes(mediaType)) {
      conditions.push(eq(aiTask.mediaType, mediaType));
    }

    const tasks = await db()
      .select()
      .from(aiTask)
      .where(and(...conditions))
      .orderBy(desc(aiTask.createdAt))
      .limit(limitParam * 2);

    const publicCreations = tasks
      .map((t: any) => {
        if (
          t.provider === 'mock' ||
          (typeof t.id === 'string' && t.id.startsWith('mock_')) ||
          (typeof t.taskId === 'string' && t.taskId.startsWith('mock_'))
        ) {
          return null;
        }

        let parsedOptions: any = {};
        try {
          if (t.options) parsedOptions = JSON.parse(t.options);
        } catch {}

        // 如果用户显式设置为 private，则不公开展示
        if (parsedOptions.visibility === 'private') {
          return null;
        }

        let parsedResult: any = null;
        try {
          if (t.taskResult) parsedResult = JSON.parse(t.taskResult);
        } catch {}

        let parsedInfo: any = null;
        if (t.taskInfo) {
          try {
            parsedInfo = JSON.parse(t.taskInfo);
          } catch {}
        }

        if (
          parsedResult?.mock === true ||
          parsedInfo?.mock === true ||
          parsedInfo?.mockQueryRequiredPolls !== undefined ||
          (typeof parsedResult?.taskId === 'string' &&
            parsedResult.taskId.startsWith('mock_')) ||
          (typeof parsedInfo?.taskId === 'string' &&
            parsedInfo.taskId.startsWith('mock_'))
        ) {
          return null;
        }

        const isVideo = t.mediaType === 'video';
        const isMusic = t.mediaType === 'music';

        let mediaUrl = parsedResult
          ? isMusic
            ? extractAudioUrl(parsedResult)
            : extractMediaUrl(parsedResult)
          : '';

        if (!mediaUrl && parsedInfo) {
          mediaUrl = isMusic
            ? extractAudioUrl(parsedInfo)
            : extractMediaUrl(parsedInfo);
        }

        if (!mediaUrl) return null;

        if (
          mediaUrl.includes('palix-ai.mp4') ||
          mediaUrl.includes('1778247593756-bdtvb0.png') ||
          mediaUrl.includes('test.mp3')
        ) {
          return null;
        }

        return {
          id: t.id,
          title: t.prompt?.slice(0, 40) || 'Community Creation',
          image: !isVideo && !isMusic ? mediaUrl : undefined,
          video: isVideo ? mediaUrl : undefined,
          audio: isMusic ? mediaUrl : undefined,
          prompt: t.prompt || '',
          model: t.model || 'Pixany AI',
          mediaType: t.mediaType,
        };
      })
      .filter(Boolean)
      .slice(0, limitParam);

    return respData(
      { items: publicCreations },
      {
        headers: {
          'Cache-Control':
            'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('Failed to fetch public creations:', error);
    return respErr('Failed to fetch public creations');
  }
}

export const Route = createFileRoute('/api/ai/public-creations')({
  server: {
    handlers: { GET },
  },
});
