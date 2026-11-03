import { createFileRoute } from '@tanstack/react-router';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';

import {
  extractAudioUrl,
  extractMediaUrl,
  normalizeLegacyMediaUrl,
} from '@/core/ai';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { expireTimedOutTasks } from '@/modules/ai-tasks/service';
import { respData, respErr } from '@/lib/resp';

import { getPublicTaskErrorCode } from './-task-utils';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    // 在查询历史列表前，先触发一次过期巡检兜底，避免历史卡死任务长期滞留
    try {
      await expireTimedOutTasks();
    } catch {}

    const url = new URL(request.url);
    const mediaType = url.searchParams.get('mediaType');
    const limitParam = Number(url.searchParams.get('limit')) || 50;

    const conditions = [
      eq(aiTask.userId, session.user.id),
      ne(aiTask.status, 'canceled'),
      isNull(aiTask.deletedAt),
    ];

    if (mediaType && ['image', 'video', 'music'].includes(mediaType)) {
      conditions.push(eq(aiTask.mediaType, mediaType));
    }

    const tasks = await db()
      .select()
      .from(aiTask)
      .where(and(...conditions))
      .orderBy(desc(aiTask.createdAt))
      .limit(Math.min(limitParam, 100));

    const creations = (
      await Promise.all(
        tasks.map(async (t: any) => {
          let parsedResult: any = null;
          try {
            if (t.taskResult) {
              parsedResult = JSON.parse(t.taskResult);
            }
          } catch {}

          const isMusic = t.mediaType === 'music';
          let mediaUrl = parsedResult
            ? isMusic
              ? extractAudioUrl(parsedResult)
              : extractMediaUrl(parsedResult)
            : '';

          let parsedInfo: any = null;
          if (t.taskInfo) {
            try {
              parsedInfo = JSON.parse(t.taskInfo);
            } catch {}
          }

          if (!mediaUrl && parsedInfo) {
            mediaUrl = isMusic
              ? extractAudioUrl(parsedInfo)
              : extractMediaUrl(parsedInfo);
          }

          const taskStatus = t.status || 'success';

          if (
            !mediaUrl &&
            taskStatus !== 'failed' &&
            taskStatus !== 'pending' &&
            taskStatus !== 'processing'
          ) {
            return null;
          }

          let options: any = {};
          try {
            if (t.options) options = JSON.parse(t.options);
          } catch {}

          let itemMode =
            options.mode || (!t.scene?.startsWith('ai_') ? t.scene : undefined);
          if (!itemMode) {
            if (t.mediaType === 'video') {
              itemMode =
                options.image_urls?.length || options.image_input?.length
                  ? 'image-to-video'
                  : 'text-to-video';
            } else if (t.mediaType === 'music') {
              itemMode = 'text-to-music';
            } else {
              if (
                t.prompt?.includes('移除图片主体之外的所有背景') ||
                t.prompt?.toLowerCase().includes('png')
              ) {
                itemMode = 'png-maker';
              } else if (
                options.image_urls?.length ||
                options.image_input?.length
              ) {
                itemMode = 'image-to-image';
              } else {
                itemMode = 'text-to-image';
              }
            }
          }

          return {
            id: t.taskId || t.id,
            dbId: t.id,
            mediaType: (t.mediaType as 'image' | 'video' | 'music') || 'image',
            mode: itemMode,
            status: taskStatus,
            errorCode:
              taskStatus === 'failed'
                ? getPublicTaskErrorCode({
                    taskInfo: parsedInfo,
                    taskResult: parsedResult,
                  })
                : undefined,
            prompt: t.prompt,
            model: t.model,
            url: mediaUrl,
            thumbnailUrl: parsedResult?.thumbnailUrl
              ? normalizeLegacyMediaUrl(parsedResult.thumbnailUrl)
              : undefined,
            aspectRatio: options.ratio || options.aspect_ratio || undefined,
            duration: options.duration || undefined,
            visibility:
              (options.visibility as 'public' | 'private') || 'public',
            createdAt:
              t.createdAt instanceof Date
                ? t.createdAt.getTime()
                : Number(t.createdAt) || Date.now(),
          };
        })
      )
    ).filter(Boolean);

    return respData({ items: creations });
  } catch (error: any) {
    console.error('Failed to fetch user creations:', error);
    return respErr('Failed to fetch creations');
  }
}

export const Route = createFileRoute('/api/ai/creations')({
  server: {
    handlers: { GET },
  },
});
