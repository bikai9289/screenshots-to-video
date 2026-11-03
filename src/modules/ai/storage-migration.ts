import { and, desc, eq, gte, isNull } from 'drizzle-orm';

import { extractAudioUrl, extractMediaUrl } from '@/core/ai';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { getAllConfigs, type ConfigMap } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';
import { getUuid } from '@/lib/hash';

export interface StorageMediaItem {
  sourceUrl: string;
  r2Url?: string;
  mediaType: 'image' | 'video' | 'music' | string;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  error?: string;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson(value: unknown): any {
  if (!value || typeof value !== 'string') return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function extFromUrl(url: string, defaultExt = 'png'): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() || defaultExt;
    if (
      [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'bmp',
        'mp4',
        'webm',
        'mov',
        'mp3',
        'wav',
        'ogg',
        'm4a',
      ].includes(ext)
    ) {
      return ext;
    }
  } catch {}
  return defaultExt;
}

function contentTypeByExt(ext: string): string {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    case 'png':
    default:
      return 'image/png';
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getManagedStoragePrefixes(configs: ConfigMap): string[] {
  const prefixes: string[] = [];
  const uploadPath = String(configs.r2_upload_path || 'uploads').replace(
    /^\/+|\/+$/g,
    ''
  );
  const publicDomain = String(configs.r2_domain || '').trim();
  const endpoint = String(configs.r2_endpoint || '').trim();
  const bucket = String(configs.r2_bucket_name || '').trim();
  const accountId = String(configs.r2_account_id || '').trim();
  const s3Domain = String(configs.s3_domain || '').trim();
  const s3Endpoint = String(configs.s3_endpoint || '').trim();
  const s3Bucket = String(configs.s3_bucket || '').trim();

  if (publicDomain) {
    prefixes.push(`${trimTrailingSlash(publicDomain)}/${uploadPath}/`);
  }
  if (endpoint && bucket) {
    prefixes.push(`${trimTrailingSlash(endpoint)}/${bucket}/${uploadPath}/`);
  } else if (accountId && bucket) {
    prefixes.push(
      `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${uploadPath}/`
    );
  }
  if (s3Domain) {
    prefixes.push(`${trimTrailingSlash(s3Domain)}/`);
  }
  if (s3Endpoint && s3Bucket) {
    prefixes.push(`${trimTrailingSlash(s3Endpoint)}/${s3Bucket}/`);
  }

  return prefixes;
}

export function isManagedStorageUrl(url: string, prefixes: string[]): boolean {
  if (!url) return false;
  return prefixes.some((prefix) => url.startsWith(prefix));
}

function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ExtractedUrlInfo {
  url: string;
  mediaType: 'image' | 'video' | 'music';
}

function parseSingleCandidateUrl(u: any): string | null {
  if (typeof u === 'string' && u) return u;
  if (Array.isArray(u)) {
    for (const item of u) {
      const res = parseSingleCandidateUrl(item);
      if (res) return res;
    }
  }
  return null;
}

export function extractCandidateMediaUrls(
  taskInfo: any,
  fallbackMediaType = 'image',
  taskResult?: any
): ExtractedUrlInfo[] {
  const result: ExtractedUrlInfo[] = [];

  const addIfValid = (urlVal: any, mediaType: 'image' | 'video' | 'music') => {
    const cleanUrl = parseSingleCandidateUrl(urlVal);
    if (
      cleanUrl &&
      isHttpUrl(cleanUrl) &&
      !result.some((r) => r.url === cleanUrl)
    ) {
      result.push({ url: cleanUrl, mediaType });
    }
  };

  if (Array.isArray(taskInfo?.images)) {
    taskInfo.images.forEach((item: any) => {
      addIfValid(item?.imageUrl || item?.url || item?.src || item, 'image');
    });
  }

  if (Array.isArray(taskInfo?.videos)) {
    taskInfo.videos.forEach((item: any) => {
      addIfValid(item?.videoUrl || item?.url || item?.src || item, 'video');
    });
  }

  if (Array.isArray(taskInfo?.songs)) {
    taskInfo.songs.forEach((item: any) => {
      addIfValid(item?.audioUrl || item?.url || item?.src || item, 'music');
    });
  }

  if (Array.isArray(taskInfo?.output)) {
    taskInfo.output.forEach((item: any) => {
      addIfValid(item?.url || item, (fallbackMediaType as any) || 'image');
    });
  }

  if (taskResult) {
    const rObj =
      taskResult.data?.result ||
      taskResult.result ||
      taskResult.taskInfo ||
      taskResult.data ||
      taskResult;

    if (Array.isArray(rObj.images)) {
      rObj.images.forEach((item: any) =>
        addIfValid(item?.url || item?.imageUrl || item, 'image')
      );
    }
    if (Array.isArray(rObj.videos)) {
      rObj.videos.forEach((item: any) =>
        addIfValid(
          item?.video_url || item?.videoUrl || item?.url || item,
          'video'
        )
      );
    }
    if (Array.isArray(rObj.songs)) {
      rObj.songs.forEach((item: any) =>
        addIfValid(
          item?.audio_url || item?.audioUrl || item?.url || item,
          'music'
        )
      );
    }
    if (rObj.url) {
      addIfValid(rObj.url, (fallbackMediaType as any) || 'image');
    }

    const fallbackUrl =
      fallbackMediaType === 'music'
        ? extractAudioUrl(taskResult)
        : extractMediaUrl(taskResult);
    addIfValid(fallbackUrl, (fallbackMediaType as any) || 'image');
  }

  return result;
}

function replaceMigratedUrls(value: any, urlMap: Map<string, string>): any {
  if (typeof value === 'string') return urlMap.get(value) || value;
  if (Array.isArray(value)) {
    return value.map((item) => replaceMigratedUrls(item, urlMap));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceMigratedUrls(item, urlMap),
      ])
    );
  }
  return value;
}

/**
 * Migrates a single AI task's supplier URLs to Cloudflare R2 storage.
 */
export async function migrateAITaskToR2(taskId: string, configs?: ConfigMap) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) {
    return { ok: false, skipped: true, reason: 'task not found' };
  }

  const resolvedConfigs = configs || (await getAllConfigs());
  const managedPrefixes = getManagedStoragePrefixes(resolvedConfigs);

  let taskInfo: any = {};
  if (task.taskInfo) {
    try {
      taskInfo = JSON.parse(task.taskInfo);
    } catch {
      taskInfo = {};
    }
  }

  let taskResult: any = null;
  if (task.taskResult) {
    try {
      taskResult = JSON.parse(task.taskResult);
    } catch {}
  }

  const candidates = extractCandidateMediaUrls(
    taskInfo,
    task.mediaType,
    taskResult
  );
  const pendingCandidates = candidates.filter(
    (c) => isHttpUrl(c.url) && !isManagedStorageUrl(c.url, managedPrefixes)
  );

  if (pendingCandidates.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'all media already in R2 storage',
    };
  }

  const storage = await getStorage();
  if (!storage) {
    return { ok: false, skipped: true, reason: 'storage not configured' };
  }

  const urlMap = new Map<string, string>();
  const dateStr = new Date().toISOString().slice(0, 10);

  for (const candidate of pendingCandidates) {
    const defaultExt =
      candidate.mediaType === 'video'
        ? 'mp4'
        : candidate.mediaType === 'music'
          ? 'mp3'
          : 'png';
    const ext = extFromUrl(candidate.url, defaultExt);
    const key = `ai/${candidate.mediaType}/${dateStr}/${getUuid()}.${ext}`;

    try {
      const uploadResult = await storage.downloadAndUpload({
        url: candidate.url,
        key,
        contentType: contentTypeByExt(ext),
      });

      if (uploadResult.success && uploadResult.url) {
        urlMap.set(candidate.url, uploadResult.url);
      } else {
        console.error(
          `Failed to upload ${candidate.url} to R2:`,
          uploadResult.error
        );
      }
    } catch (err: any) {
      console.error(
        `Error downloading & uploading ${candidate.url} to R2:`,
        err
      );
    }
  }

  if (urlMap.size === 0) {
    return {
      ok: false,
      skipped: false,
      reason: 'failed to upload media to R2',
    };
  }

  taskInfo = replaceMigratedUrls(taskInfo, urlMap);
  taskResult = replaceMigratedUrls(taskResult, urlMap);

  await db()
    .update(aiTask)
    .set({
      taskInfo: JSON.stringify(taskInfo),
      taskResult: taskResult ? JSON.stringify(taskResult) : task.taskResult,
    })
    .where(eq(aiTask.id, task.id));

  return {
    ok: true,
    skipped: false,
    migratedUrls: Array.from(urlMap.entries()).map(([source, r2]) => ({
      source,
      r2,
    })),
  };
}

/**
 * Daily scheduled cron task batches every recent successful task that still
 * references supplier-hosted media, then replaces those URLs in the database.
 */
export async function syncDailyAITasksToR2(options?: {
  days?: number;
  limit?: number;
}) {
  const days = options?.days ?? 7;
  const limit = options?.limit ?? 100;
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const configs = await getAllConfigs();
  const managedPrefixes = getManagedStoragePrefixes(configs);

  const tasks = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.status, 'success'),
        isNull(aiTask.deletedAt),
        gte(aiTask.createdAt, sinceDate)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit);

  const pendingTasks = (tasks as any[]).filter((t: any) => {
    const candidates = extractCandidateMediaUrls(
      parseJson(t.taskInfo),
      t.mediaType,
      parseJson(t.taskResult)
    );
    return candidates.some(
      (c) => isHttpUrl(c.url) && !isManagedStorageUrl(c.url, managedPrefixes)
    );
  });

  const results: Array<{ taskId: string; result: any }> = [];
  for (const t of pendingTasks) {
    const res = await migrateAITaskToR2(t.id, configs);
    results.push({ taskId: t.id, result: res });
  }

  return {
    totalChecked: tasks.length,
    pendingCount: pendingTasks.length,
    migratedCount: results.filter((r) => r.result.ok && !r.result.skipped)
      .length,
    results,
  };
}
