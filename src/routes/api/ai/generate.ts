import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

import {
  AITaskStatus,
  extractAudioUrl,
  extractMediaUrl,
  extractVideoUrl,
  sanitizeUserErrorMessage,
} from '@/core/ai/types';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { atomic, AtomicGuardError } from '@/core/db/atomic';
import { envConfigs } from '@/config';
import { aiTask } from '@/config/db/schema';
import { expireTimedOutTasks } from '@/modules/ai-tasks/service';
import {
  createMockGenerateResult,
  generateMedia,
  getActiveAIProvider,
} from '@/modules/ai/service';
import { getConfig, isMockMode } from '@/modules/config/service';
import { getBalance, planConsume, revoke } from '@/modules/credits/service';
import { getUserPlan } from '@/modules/invite-codes/service';
import { hasPermission } from '@/modules/rbac/service';
import { createAIWebhookToken } from '@/lib/ai-webhook';
import { getUuid } from '@/lib/hash';
import { consumeProviderSlidingWindowRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import {
  AI_MODELS,
  calculateCredits,
  getModelMaxImages,
  getModelMaxPromptLength,
  getModelSupportedDurations,
} from '@/components/sites/shared/models';

import { getPublicTaskErrorCode, toPublicTaskResult } from './-task-utils';
import { reclaimUserGhostSlots } from './task';

const MEDIA_TYPES = new Set(['image', 'video', 'music']);
const MAX_ACTIVE_TASKS_PER_USER = 10;
const PROVIDER_GENERATE_LIMIT = 20;
const PROVIDER_GENERATE_WINDOW_MS = 10_000;

function isActiveSlotConflict(error: unknown) {
  const message = String((error as any)?.message || error);
  return /uq_ai_task_user_active_slot|ai_task.*active_slot/i.test(message);
}

function isUnsafeImageUrl(value: string) {
  try {
    const { protocol, hostname } = new URL(value);
    if (!['http:', 'https:'].includes(protocol)) return true;
    const host = hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === 'localhost.localdomain' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      /^(10|127)\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host)
    );
  } catch {
    return true;
  }
}

async function POST({ request }: { request: Request }) {
  let consumedCreditId: string | null = null;
  let dbTaskId: string | null = null;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    // Server-side invite gate (UI/info alone is bypassable via direct API).
    const inviteRequired = (await getConfig('invite_code_required')) === 'true';
    if (inviteRequired) {
      const { plan } = await getUserPlan(session.user.id);
      const isAdmin = await hasPermission(session.user.id, 'admin.*');
      if (plan !== 'trial' && plan !== 'member' && !isAdmin) {
        return respErr('Invite code required');
      }
    }

    await expireTimedOutTasks(MAX_ACTIVE_TASKS_PER_USER, session.user.id);

    const body = await request.json().catch(() => ({}));
    const {
      mediaType = 'image',
      prompt = '',
      model,
      mode,
      scene,
      options: rawOptions,
      imageUrl,
      imageUrls,
    } = body;
    const effectiveMode = mode || scene || rawOptions?.mode;
    const options =
      rawOptions && typeof rawOptions === 'object' ? { ...rawOptions } : {};
    delete options.image_url;
    delete options.image_urls;
    delete options.image_input;
    if (effectiveMode) {
      options.mode = effectiveMode;
    }

    const normalizedImageUrls = (
      Array.isArray(imageUrls) ? imageUrls : imageUrl ? [imageUrl] : []
    ).filter((url): url is string => typeof url === 'string' && Boolean(url));

    // 清理非当前模态的冲突参数，防止生图携带生视频参数（如 duration, 480P 等）
    if (mediaType === 'image') {
      delete options.duration;
      if (
        options.resolution &&
        ['480p', '720p', '1080p', '4k_video'].includes(
          String(options.resolution).toLowerCase()
        )
      ) {
        delete options.resolution;
      }
      if (options.aspect_ratio === 'Auto') {
        delete options.aspect_ratio;
      }
    } else if (mediaType === 'music') {
      delete options.duration;
      delete options.resolution;
      delete options.aspect_ratio;
    }
    if (mediaType === 'video') {
      if (model === 'viduq3') {
        delete options.resolution;
      }
      const isSeedance =
        typeof model === 'string' && model.includes('seedance');
      const hasImage = normalizedImageUrls.length > 0;
      if (isSeedance && hasImage) {
        options.aspect_ratio = 'adaptive';
      }
    }
    const isMock = await isMockMode();

    if (typeof prompt !== 'string' || typeof mediaType !== 'string') {
      return respErr('Invalid generation request');
    }

    if (!MEDIA_TYPES.has(mediaType)) {
      return respErr('Unsupported media type');
    }

    if (
      normalizedImageUrls.some((url) => {
        return isUnsafeImageUrl(url);
      })
    ) {
      return respErr('Invalid image URL');
    }

    if (!prompt && normalizedImageUrls.length === 0) {
      return respErr('Prompt or image is required');
    }

    const selectedModel = model ? AI_MODELS[model] : undefined;
    if (!selectedModel || selectedModel.type !== mediaType) {
      return respErr('Unsupported model');
    }
    if (mediaType === 'image') {
      const supported = selectedModel.supportedResolutions || ['1K', '2K'];
      if (options.resolution) {
        const matched = supported.find(
          (r) => r.toLowerCase() === String(options.resolution).toLowerCase()
        );
        options.resolution = matched || selectedModel.defaultResolution || '1K';
      } else {
        options.resolution = selectedModel.defaultResolution || '1K';
      }
    } else if (mediaType === 'video' && options.resolution) {
      const supported = selectedModel.supportedResolutions || ['720P', '1080P'];
      const matched = supported.find(
        (r) => r.toLowerCase() === String(options.resolution).toLowerCase()
      );
      if (matched) {
        options.resolution = matched;
      } else {
        options.resolution = selectedModel.defaultResolution || '720P';
      }
    }
    if (
      normalizedImageUrls.length > 0 &&
      mediaType === 'image' &&
      selectedModel.supportsImageToImage !== true
    ) {
      return respErr(
        'The selected model does not support image input. Please select another supported model.'
      );
    }
    if (
      normalizedImageUrls.length > getModelMaxImages(model, selectedModel.type)
    ) {
      return respErr('Too many input images for this model');
    }
    // Persist validated reference images for admin/detail (client-supplied keys were stripped above)
    if (normalizedImageUrls.length > 0) {
      options.image_urls = normalizedImageUrls;
      options.image_url = normalizedImageUrls[0];
      options.image_input = normalizedImageUrls;
    }

    const provider = await getActiveAIProvider();
    if (!provider && !isMock) {
      return respErr('No AI Provider configured');
    }
    const maxPromptLength = getModelMaxPromptLength(
      model,
      provider?.name,
      effectiveMode
    );
    if (maxPromptLength && prompt.length > maxPromptLength) {
      return respErr('Prompt is too long for this model');
    }

    // Bill only allowed durations — vendors clamp up, so raw client duration undercharges.
    if (mediaType === 'video') {
      const supported = getModelSupportedDurations(
        model,
        provider?.name,
        String(options?.resolution || '')
      );
      const raw = String(options?.duration || '').trim();
      const rawSeconds = parseInt(raw, 10);
      const matched =
        supported.find((d) => d === raw || d === `${raw}s`) ||
        supported.find((d) => parseInt(d, 10) === rawSeconds) ||
        supported[0] ||
        '5s';
      options.duration = matched;
    }

    const costCredits = calculateCredits(model, mediaType, {
      duration: options?.duration,
      resolution: options?.resolution,
    });

    dbTaskId = getUuid();
    let reserved = false;
    for (
      let activeSlot = 0;
      activeSlot < MAX_ACTIVE_TASKS_PER_USER;
      activeSlot++
    ) {
      try {
        await db()
          .insert(aiTask)
          .values({
            id: dbTaskId,
            userId: session.user.id,
            mediaType,
            provider: provider?.name || 'mock',
            model: model || 'default',
            prompt: prompt || 'Image to ' + mediaType,
            options: options ? JSON.stringify(options) : null,
            status: 'pending',
            activeSlot,
            costCredits,
            scene: effectiveMode || `ai_${mediaType}`,
          });
        reserved = true;
        break;
      } catch (error) {
        if (!isActiveSlotConflict(error)) throw error;
      }
    }
    if (!reserved) {
      // 幽灵槽位回收与主动状态同步：
      // 当 10 个槽位被占满时，主动核实第三方任务状态并解绑无前端轮询的离线幽灵槽位，防止 20 分钟死锁
      await reclaimUserGhostSlots(session.user.id);

      for (
        let activeSlot = 0;
        activeSlot < MAX_ACTIVE_TASKS_PER_USER;
        activeSlot++
      ) {
        try {
          await db()
            .insert(aiTask)
            .values({
              id: dbTaskId,
              userId: session.user.id,
              mediaType,
              provider: provider?.name || 'mock',
              model: model || 'default',
              prompt: prompt || 'Image to ' + mediaType,
              options: options ? JSON.stringify(options) : null,
              status: 'pending',
              activeSlot,
              costCredits,
              scene: effectiveMode || `ai_${mediaType}`,
            });
          reserved = true;
          break;
        } catch (error) {
          if (!isActiveSlotConflict(error)) throw error;
        }
      }
    }

    if (!reserved) {
      return respErr(
        `You already have ${MAX_ACTIVE_TASKS_PER_USER} active generation tasks. Please wait for one to finish before submitting another.`
      );
    }

    const markReservedTaskFailed = async () => {
      await db()
        .update(aiTask)
        .set({ status: 'failed', activeSlot: null })
        .where(eq(aiTask.id, dbTaskId!));
    };

    if (!isMock) {
      try {
        const rateLimit = await consumeProviderSlidingWindowRateLimit({
          key: `ai-provider-generate:${provider!.name}`,
          limit: PROVIDER_GENERATE_LIMIT,
          windowMs: PROVIDER_GENERATE_WINDOW_MS,
        });
        if (!rateLimit.allowed) {
          await db().delete(aiTask).where(eq(aiTask.id, dbTaskId));
          return respErr(
            'The AI generation service is busy. Please try again shortly.',
            {
              status: 429,
              headers: {
                'cache-control': 'no-store',
                'retry-after': String(
                  Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000))
                ),
              },
            }
          );
        }
      } catch {
        await db().delete(aiTask).where(eq(aiTask.id, dbTaskId));
        return respErr(
          'The AI generation service is busy. Please try again shortly.',
          { status: 503 }
        );
      }
    }

    const balance = await getBalance(session.user.id);
    if (balance < costCredits) {
      await markReservedTaskFailed();
      return respErr(
        `Insufficient credits (requires ${costCredits} credits, current balance: ${balance}). Please purchase credits to continue.`
      );
    }

    if (costCredits > 0) {
      try {
        // Plan the charge, then write it and link it to the task in one
        // atomic step (D1-safe); retry if a concurrent spend wins the race.
        let linkedCreditId: string | undefined;
        for (let attempt = 0; attempt < 3 && !linkedCreditId; attempt++) {
          const plan = await planConsume({
            userId: session.user.id,
            userEmail: session.user.email,
            credits: costCredits,
            scene: `ai_${mediaType}`,
            description: `AI ${mediaType} generation (${model || 'default'})`,
            metadata: JSON.stringify({ taskId: dbTaskId }),
          });
          if (!plan) throw new Error('Failed to deduct credits');
          try {
            await atomic((q) => [
              ...plan.steps(q),
              q
                .update(aiTask)
                .set({ creditId: plan.consumedCredit.id })
                .where(eq(aiTask.id, dbTaskId!)),
            ]);
            linkedCreditId = plan.consumedCredit.id;
          } catch (error) {
            if (!(error instanceof AtomicGuardError)) throw error;
          }
        }
        if (!linkedCreditId) throw new Error('Failed to deduct credits');
        consumedCreditId = linkedCreditId;
      } catch (error: any) {
        await markReservedTaskFailed();
        if (error?.message === 'Failed to deduct credits') {
          return respErr('Failed to deduct credits, please try again.');
        }
        throw error;
      }
    }

    // Call AI provider or create mock result
    try {
      const callbackUrlObj = new URL(
        '/api/ai/task',
        envConfigs.app_url && !envConfigs.app_url.includes('localhost')
          ? envConfigs.app_url
          : request.url
      );
      if (dbTaskId) {
        callbackUrlObj.searchParams.set('dbTaskId', dbTaskId);
        callbackUrlObj.searchParams.set(
          'token',
          await createAIWebhookToken(dbTaskId, envConfigs.auth_secret)
        );
      }

      const result = isMock
        ? createMockGenerateResult(dbTaskId, mediaType)
        : await generateMedia(
            {
              mediaType,
              prompt,
              model,
              options,
              imageUrl: normalizedImageUrls[0],
              imageUrls: normalizedImageUrls,
              callbackUrl: callbackUrlObj.toString(),
            },
            provider!
          );

      // Update task record on success
      const hasMedia = Boolean(
        mediaType === 'music'
          ? extractAudioUrl(result)
          : mediaType === 'video'
            ? extractVideoUrl(result) || extractMediaUrl(result)
            : extractMediaUrl(result)
      );
      const isFinished = result.taskStatus === AITaskStatus.SUCCESS && hasMedia;
      const isFailed =
        result.taskStatus === AITaskStatus.FAILED ||
        result.taskStatus === AITaskStatus.CANCELED ||
        (result.taskStatus === AITaskStatus.SUCCESS && !hasMedia);

      if (dbTaskId) {
        try {
          if (isFailed && consumedCreditId) {
            await revoke(consumedCreditId);
            consumedCreditId = null;
          }
          await db()
            .update(aiTask)
            .set({
              taskId: isFinished ? null : result.taskId || null,
              status: isFinished
                ? 'success'
                : result.taskStatus === AITaskStatus.CANCELED
                  ? 'canceled'
                  : isFailed
                    ? 'failed'
                    : 'processing',
              taskInfo: result.taskInfo
                ? JSON.stringify(result.taskInfo)
                : null,
              taskResult: JSON.stringify(result),
              activeSlot: isFinished || isFailed ? null : undefined,
              creditId: isFailed ? null : undefined,
            })
            .where(eq(aiTask.id, dbTaskId));
        } catch (dbUpdateErr) {
          console.error('Failed to update aiTask status:', dbUpdateErr);
        }
      }

      const remainingBalance = await getBalance(session.user.id);
      const publicResult = toPublicTaskResult({
        ...result,
        taskStatus: isFailed ? AITaskStatus.FAILED : result.taskStatus,
        id: dbTaskId,
        mediaType,
      });

      return respData({
        id: dbTaskId,
        dbId: dbTaskId,
        ...publicResult,
        taskId:
          result.taskStatus === AITaskStatus.SUCCESS
            ? dbTaskId
            : result.taskId || dbTaskId,
        costCredits,
        remainingBalance,
      });
    } catch (generateErr: any) {
      // Rollback consumed credits immediately on generation error!
      if (consumedCreditId) {
        try {
          await revoke(consumedCreditId);
          consumedCreditId = null;
        } catch (revokeErr) {
          console.error(
            'Failed to revoke credits after AI generation error:',
            revokeErr
          );
        }
      }

      if (dbTaskId) {
        try {
          await db()
            .update(aiTask)
            .set({
              status: 'failed',
              activeSlot: null,
              creditId: consumedCreditId ? undefined : null,
              taskResult: JSON.stringify({
                error: generateErr?.message || 'Generation failed',
              }),
            })
            .where(eq(aiTask.id, dbTaskId));
        } catch (dbFailErr) {
          console.error('Failed to mark aiTask failed:', dbFailErr);
        }
      }

      throw new Error(
        getPublicTaskErrorCode(generateErr?.message || generateErr)
      );
    }
  } catch (error: any) {
    console.error('AI generation request failed:', error);
    return respErr(sanitizeUserErrorMessage(error?.message));
  }
}

export const Route = createFileRoute('/api/ai/generate')({
  server: {
    handlers: { POST },
  },
});
