import { and, asc, desc, eq, ilike, isNull, ne, or } from 'drizzle-orm';

import { extractMediaUrl, normalizeLegacyMediaUrl } from '@/core/ai';
import { db } from '@/core/db';
import { aiTask, NewShowcase, showcase, Showcase } from '@/config/db/schema';

export interface GetLatestShowcasesOptions {
  limit?: number;
  tags?: string;
  excludeTags?: string;
  searchTerm?: string;
  sortOrder?: 'asc' | 'desc';
  type?: string;
}

export const FALLBACK_SHOWCASES: Showcase[] = [
  {
    id: 'sc-1',
    userId: 'system',
    title: '3D Caricature of Celebrity',
    prompt:
      'A highly stylized 3D caricature of celebrity, with an oversized head, expressive facial features, rendered in a smooth polished style.',
    image:
      'https://img-template-nano-banana.16781678.xyz/uploads/2025-12-09/1765215470859-wuqc1m.jpg',
    videoUrl: null,
    tags: '3d,character',
    description: 'Stylized 3D portrait character creation',
    type: 'image',
    createdAt: new Date('2025-12-08T17:37:57.000Z'),
  },
  {
    id: 'sc-2',
    userId: 'system',
    title: 'Cinematic Movie Shot',
    prompt:
      'Ultra-realistic cinematic 8K shot of cyber neon city, rainy night, reflective puddle, volumetric fog, anamorphic lens flare.',
    image:
      'https://img-template-nano-banana.16781678.xyz/uploads/2025-12-08/1765199754670-9ldx0i.jpg',
    videoUrl:
      'https://palixoss.16781678.xyz/uploads/ai/image/2026-09-05/26f56c79-d2f1-4680-984a-5920b8ecc754.mp4',
    tags: 'cyberpunk,cinematic',
    description: 'Atmospheric sci-fi environment rendering',
    type: 'video',
    createdAt: new Date('2025-12-08T13:16:04.000Z'),
  },
  {
    id: 'sc-3',
    userId: 'system',
    title: 'Photorealistic Wildlife Portrait',
    prompt:
      'Close-up macro portrait of an arctic fox in snowstorm, intricate fur details, crystal eyes, soft depth of field.',
    image:
      'https://img-template-nano-banana.16781678.xyz/uploads/2025-12-08/1765164420858-ryuumb.jpg',
    videoUrl: null,
    tags: 'nature,animal',
    description: 'High-fidelity macro wildlife capture',
    type: 'image',
    createdAt: new Date('2025-12-08T03:27:25.000Z'),
  },
  {
    id: 'sc-4',
    userId: 'system',
    title: 'Dynamic Anime Action',
    prompt:
      'Cardcaptor Sakura dynamic spellcasting sequence with swirling cherry blossom petals, vibrant celestial magic circles.',
    image:
      'https://img-template-nano-banana.16781678.xyz/uploads/2025-12-08/1765190413009-j4uepk.jpg',
    videoUrl:
      'https://palixoss.16781678.xyz/uploads/ai/image/2026-09-05/26f56c79-d2f1-4680-984a-5920b8ecc754.mp4',
    tags: 'anime,action',
    description: 'Japanese animation fluid keyframe sequence',
    type: 'video',
    createdAt: new Date('2025-12-08T10:40:25.000Z'),
  },
  {
    id: 'sc-5',
    userId: 'system',
    title: 'Futuristic Fashion Editorial',
    prompt:
      'Editorial fashion portrait featuring holographic haute couture dress, studio minimalist lighting, vogue aesthetic.',
    image:
      'https://img-template-nano-banana.16781678.xyz/uploads/2025-12-08/1765200082640-fmjl02.jpg',
    videoUrl: null,
    tags: 'fashion,editorial',
    description: 'Contemporary haute couture editorial rendering',
    type: 'image',
    createdAt: new Date('2025-12-08T13:28:53.000Z'),
  },
  {
    id: 'sc-6',
    userId: 'system',
    title: 'Retro Vice City Sunset',
    prompt:
      '1980s retro wave supercar parked near ocean palm trees during pink synthwave sunset, chrome reflections, lo-fi haze.',
    image:
      'https://img-template-nano-banana.16781678.xyz/uploads/2025-12-08/1765199754670-9ldx0i.jpg',
    videoUrl:
      'https://palixoss.16781678.xyz/uploads/ai/image/2026-09-05/26f56c79-d2f1-4680-984a-5920b8ecc754.mp4',
    tags: 'retro,synthwave',
    description: '80s aesthetics nostalgic synthwave loop',
    type: 'video',
    createdAt: new Date('2025-12-08T13:16:04.000Z'),
  },
];

export async function getLatestShowcases({
  limit = 20,
  tags,
  excludeTags,
  searchTerm,
  sortOrder = 'desc',
  type,
}: GetLatestShowcasesOptions = {}): Promise<Showcase[]> {
  try {
    const conditions = [];

    if (tags) {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) {
        const tagConditions = tagList.map((tag) =>
          or(
            ilike(showcase.tags, `${tag},%`),
            ilike(showcase.tags, `%,${tag},%`),
            ilike(showcase.tags, `%,${tag}`),
            ilike(showcase.tags, tag)
          )
        );
        conditions.push(and(...tagConditions));
      }
    }

    if (searchTerm) {
      conditions.push(
        or(
          ilike(showcase.prompt, `%${searchTerm}%`),
          ilike(showcase.title, `%${searchTerm}%`),
          ilike(showcase.tags, `%${searchTerm}%`)
        )
      );
    }

    if (type) {
      conditions.push(eq(showcase.type, type));
    }

    let query = db().select().from(showcase);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = await query
      .orderBy(
        sortOrder === 'asc' ? asc(showcase.createdAt) : desc(showcase.createdAt)
      )
      .limit(limit);

    // 查询成功的用户任务，仅公开可见（过滤 private 项与 mock 模拟生成的作品）
    let publicShowcases: Showcase[] = [];
    try {
      const taskConditions = [
        eq(aiTask.status, 'success'),
        isNull(aiTask.deletedAt),
        ne(aiTask.provider, 'mock'),
      ];
      if (type && ['image', 'video'].includes(type)) {
        taskConditions.push(eq(aiTask.mediaType, type));
      }
      if (searchTerm) {
        taskConditions.push(ilike(aiTask.prompt, `%${searchTerm}%`));
      }

      const tasks = await db()
        .select()
        .from(aiTask)
        .where(and(...taskConditions))
        .orderBy(desc(aiTask.createdAt))
        .limit(limit);

      publicShowcases = tasks
        .map((t: any): Showcase | null => {
          // 排除 mock 任务
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

          // 如果用户设置为 private，则严格不公开展示在前台 showcases
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

          // 严格排除 mock 生成结果
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
          let mediaUrl = parsedResult ? extractMediaUrl(parsedResult) : '';

          if (!mediaUrl && parsedInfo) {
            mediaUrl = extractMediaUrl(parsedInfo);
          }

          if (!mediaUrl) return null;

          // 排除 mock 固定测试资源
          if (
            mediaUrl.includes('palix-ai.mp4') ||
            mediaUrl.includes('1778247593756-bdtvb0.png') ||
            mediaUrl.includes('test.mp3')
          ) {
            return null;
          }

          return {
            id: t.id,
            userId: t.userId,
            title: t.prompt?.slice(0, 40) || 'AI Creation',
            prompt: t.prompt,
            image: !isVideo
              ? mediaUrl
              : t.imageUrl
                ? normalizeLegacyMediaUrl(t.imageUrl)
                : mediaUrl,
            videoUrl: isVideo ? normalizeLegacyMediaUrl(mediaUrl) : null,
            tags: t.model || null,
            description: t.prompt,
            type: t.mediaType,
            createdAt: t.createdAt,
          } as Showcase;
        })
        .filter((item: Showcase | null): item is Showcase => item !== null);
    } catch (taskErr) {
      console.error('Failed to query user tasks for showcases:', taskErr);
    }

    const merged = [...publicShowcases, ...rows];

    if (merged.length > 0) {
      return merged.slice(0, limit);
    }

    // Return fallback if database has no records yet
    let filtered = [...FALLBACK_SHOWCASES];
    if (type) {
      filtered = filtered.filter((s) => s.type === type);
    }
    return filtered.slice(0, limit);
  } catch (error) {
    console.error('Failed to get showcases:', error);
    let filtered = [...FALLBACK_SHOWCASES];
    if (type) {
      filtered = filtered.filter((s) => s.type === type);
    }
    return filtered.slice(0, limit);
  }
}

export async function getShowcase(id: string): Promise<Showcase | null> {
  try {
    const result = await db()
      .select()
      .from(showcase)
      .where(eq(showcase.id, id))
      .limit(1);
    if (result[0]) return result[0];
    return FALLBACK_SHOWCASES.find((s) => s.id === id) || null;
  } catch (error) {
    console.error('Failed to get showcase:', error);
    return FALLBACK_SHOWCASES.find((s) => s.id === id) || null;
  }
}
