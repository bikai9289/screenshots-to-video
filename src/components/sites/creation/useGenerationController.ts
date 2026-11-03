'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { extractAudioUrl, extractMediaUrl, extractVideoUrl } from '@/core/ai';
import { useSession } from '@/core/auth/client';
import {
  pollPendingCreationTasks,
  removeLocalCreation,
  removeLocalCreationOnly,
  saveLocalCreation,
} from '@/modules/creations/store';
import { apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';

import {
  getModelMaxImages,
  getModelMaxPromptLength,
  ModelConfig,
  PNG_MAKER_FIXED_PROMPT,
} from '../shared/models';
import { formatLocalizedErrorMessage } from './generation-errors';
import { useMediaUpload } from './useMediaUpload';
import { useTaskPolling } from './useTaskPolling';

export function scrollToRecentCreations() {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    const el =
      document.getElementById('recent-creations') ||
      document.querySelector('[data-section="recent-creations"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const scrollableMain = document.querySelector('main.overflow-y-auto');
      if (scrollableMain) {
        scrollableMain.scrollTo({ top: 420, behavior: 'smooth' });
      }
    }
  }, 120);
}

export interface UseGenerationControllerProps {
  mode:
    | 'text-to-image'
    | 'image-to-image'
    | 'text-to-video'
    | 'image-to-video'
    | 'text-to-music'
    | 'png-maker';
  models: ModelConfig[];
  defaultPrompt?: string;
  requireImageUpload?: boolean;
  provider?: string;
}

/**
 * AI 生成主控制器 Hook
 * 统一管理文生图、图生图、文生视频、图生视频、文生音乐以及 PNG 抠图等全部生成场景的状态、图片上传、轮询与权限校验
 */
export function useGenerationController({
  mode,
  models,
  defaultPrompt = '',
  requireImageUpload = false,
  provider,
}: UseGenerationControllerProps) {
  // 用户登录态
  const { data: session, isPending } = useSession();
  const user = session?.user;

  // 模式判断
  const isVideoMode = mode === 'text-to-video' || mode === 'image-to-video';
  const isMusicMode = mode === 'text-to-music';

  // 生成参数核心状态
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [selectedRatio, setSelectedRatio] = useState('Auto');
  const [selectedDuration, setSelectedDuration] = useState('5s');
  const [selectedResolution, setSelectedResolution] = useState(
    models[0]?.defaultResolution || (isVideoMode ? '720P' : '1K')
  );
  const [publicVisibility, setPublicVisibility] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const promptRef = useRef(defaultPrompt);
  const updatePrompt = (value: string) => {
    promptRef.current = value;
    setPrompt(value);
  };

  // 避免重复自动执行与防止并发请求
  const autoInitialized = useRef(false);
  const generationSessionRef = useRef(0);
  const generationInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      generationSessionRef.current += 1;
      generationInFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (models.some((model) => model.id === selectedModelId)) return;
    const nextModel = models[0];
    if (!nextModel) return;
    setSelectedModelId(nextModel.id);
    setSelectedResolution(
      nextModel.defaultResolution || (isVideoMode ? '720P' : '1K')
    );
  }, [isVideoMode, models, selectedModelId]);

  const maxImages =
    mode === 'png-maker'
      ? 1
      : getModelMaxImages(
          selectedModelId,
          isVideoMode ? 'video' : isMusicMode ? 'music' : 'image'
        );

  const {
    imageUrls,
    setImageUrls,
    clearImages,
    imagePreview,
    images,
    uploadingItems,
    isUploadingImage,
    handleUploadClick,
    handleFilesSelected,
    handleReplaceFile,
    handleRemoveImage,
  } = useMediaUpload({
    maxImages,
    user,
    onRequireAuth: () => setShowAuthModal(true),
  });

  const {
    generatedResult,
    setGeneratedResult,
    isPolling,
    watchTask,
    clearWatchedTasks,
    resetPolling,
  } = useTaskPolling();

  useEffect(() => clearWatchedTasks, [mode, clearWatchedTasks]);

  const isGenerating = isSubmitting;

  const handleGenerate = async (
    customPrompt?: string,
    overrides?: {
      modelId?: string;
      ratio?: string;
      duration?: string;
      resolution?: string;
      imageUrl?: string;
      imageUrls?: string[];
    }
  ) => {
    if (generationInFlightRef.current) return;
    if (isUploadingImage) {
      toast.info(m['stp.common.image_uploading_wait']());
      return;
    }

    const rawImages =
      overrides?.imageUrls ||
      (overrides?.imageUrl ? [overrides.imageUrl] : imageUrls);
    const firstFrame = rawImages[0]?.trim() || '';
    const lastFrame = rawImages[1]?.trim() || '';
    const modelId = overrides?.modelId || selectedModelId;
    const currentModelConfig = models.find((mItem) => mItem.id === modelId);
    const supportsImageInput =
      isVideoMode ||
      isMusicMode ||
      currentModelConfig?.supportsImageToImage === true;
    const validImages = supportsImageInput
      ? [firstFrame, lastFrame].filter(Boolean)
      : [];
    const inputFirstFrame = validImages[0] || '';

    let effectiveMode = mode;
    let finalPrompt = (
      customPrompt !== undefined ? customPrompt : promptRef.current
    ).trim();

    if (mode === 'png-maker') {
      effectiveMode = 'png-maker';
      finalPrompt = PNG_MAKER_FIXED_PROMPT;
    } else if (isVideoMode) {
      effectiveMode = inputFirstFrame ? 'image-to-video' : 'text-to-video';
    } else if (isMusicMode) {
      effectiveMode = 'text-to-music';
    } else {
      effectiveMode = inputFirstFrame ? 'image-to-image' : 'text-to-image';
    }

    const ratio = overrides?.ratio || selectedRatio;
    const duration = overrides?.duration || selectedDuration;
    const resolution = overrides?.resolution || selectedResolution;

    const isFirstLastFrameMode =
      isVideoMode && Boolean(currentModelConfig?.supportsFirstLastFrame);

    const isImageModeOnly =
      mode === 'image-to-video' ||
      mode === 'image-to-image' ||
      mode === 'png-maker' ||
      requireImageUpload;

    if (isImageModeOnly) {
      if (isFirstLastFrameMode && !firstFrame) {
        toast.error(m['stp.common.first_frame_required']());
        return;
      }
      if (!firstFrame) {
        toast.error(m['stp.common.alert_upload_first']());
        return;
      }
    } else if (isFirstLastFrameMode && lastFrame && !firstFrame) {
      toast.error(m['stp.common.first_frame_required']());
      return;
    }

    if (mode !== 'png-maker' && !finalPrompt) {
      if (isMusicMode) {
        toast.error(m['stp.common.alert_enter_music_prompt']());
      } else {
        toast.error(m['stp.common.alert_enter_text_prompt']());
      }
      return;
    }

    const maxPromptLength = getModelMaxPromptLength(
      modelId,
      provider,
      effectiveMode
    );
    if (maxPromptLength && finalPrompt.length > maxPromptLength) {
      toast.error(m['stp.common.prompt_too_long']());
      return;
    }

    // 未登录访客拦截：暂存生成草稿并弹出快捷登录/注册弹窗
    if (!user) {
      try {
        sessionStorage.setItem(
          'nanobanana_joyflix_pending_generation_draft',
          JSON.stringify({
            generationRequested: true,
            prompt: finalPrompt,
            modelId,
            ratio,
            duration,
            resolution,
            imagePreview: firstFrame || '',
            imageUrls: validImages,
            requiresImageUpload: isImageModeOnly,
            mode: effectiveMode,
            createdAt: Date.now(),
          })
        );
      } catch {}
      setShowAuthModal(true);
      return;
    }

    // 启动生成请求与任务轮询会话
    const generationSession = ++generationSessionRef.current;
    resetPolling();

    setIsSubmitting(true);
    generationInFlightRef.current = true;
    setGeneratedResult(null);

    try {
      let mediaType: 'image' | 'video' | 'music' = 'image';
      if (isVideoMode) mediaType = 'video';
      if (isMusicMode) mediaType = 'music';

      const options: any = {
        mode: effectiveMode,
        visibility: publicVisibility ? 'public' : 'private',
        image_urls: validImages,
        image_input: validImages,
      };

      if (inputFirstFrame) {
        options.first_frame_image = inputFirstFrame;
      }
      if (validImages[1]) {
        options.last_frame_image = validImages[1];
      }

      if (mediaType === 'video') {
        options.duration = duration;
        if (modelId !== 'viduq3') options.resolution = resolution;
        const isSeedance = modelId.includes('seedance');
        if (isSeedance && validImages.length > 0) {
          options.aspect_ratio = 'adaptive';
        } else if (ratio && ratio !== 'Auto') {
          options.aspect_ratio = ratio;
        }
      } else if (mediaType === 'image') {
        if (ratio && ratio !== 'Auto') options.aspect_ratio = ratio;
        if (resolution) options.resolution = resolution;
      }

      const res: any = await apiPost('/api/ai/generate', {
        mediaType,
        mode: effectiveMode,
        scene: effectiveMode,
        prompt: finalPrompt,
        model: modelId,
        imageUrl: inputFirstFrame || undefined,
        imageUrls: validImages,
        options,
      });

      if (res) {
        const isCurrentGeneration =
          isMountedRef.current &&
          generationSession === generationSessionRef.current;
        if (!isCurrentGeneration) return;
        setGeneratedResult(res);
        const mainUrl =
          mediaType === 'music'
            ? extractAudioUrl(res)
            : mediaType === 'video'
              ? extractVideoUrl(res) || extractMediaUrl(res)
              : extractMediaUrl(res);

        const displayPrompt =
          mode === 'png-maker'
            ? prompt.trim() || m['stp.png_maker.default_title']()
            : finalPrompt;

        const targetId = res.taskId || res.id || res.dbId || String(Date.now());

        if (res.taskStatus === 'failed' || res.taskStatus === 'canceled') {
          saveLocalCreation({
            id: targetId,
            mediaType,
            mode: effectiveMode,
            prompt: displayPrompt,
            model: modelId,
            url: '',
            status: 'failed',
            errorCode: res.taskInfo?.userErrorCode,
            aspectRatio: ratio,
            duration,
            resolution,
            visibility: publicVisibility ? 'public' : 'private',
          });
          toast.error(formatLocalizedErrorMessage(res.taskInfo?.userErrorCode));
          scrollToRecentCreations();
        } else if (mainUrl) {
          saveLocalCreation({
            id: targetId,
            mediaType,
            mode: effectiveMode,
            prompt: displayPrompt,
            model: modelId,
            url: mainUrl,
            status: 'success',
            aspectRatio: ratio,
            duration,
            resolution,
            visibility: publicVisibility ? 'public' : 'private',
          });
          toast.success(m['stp.common.creation_completed']());
          scrollToRecentCreations();
        } else if (targetId) {
          watchTask(targetId);
          saveLocalCreation({
            id: targetId,
            mediaType,
            mode: effectiveMode,
            prompt: displayPrompt,
            model: modelId,
            url: '',
            status: 'processing',
            aspectRatio: ratio,
            duration,
            resolution,
            visibility: publicVisibility ? 'public' : 'private',
          });
          if (mediaType === 'video') {
            toast.success(m['stp.common.task_submitted_video']());
          } else if (mediaType === 'music') {
            toast.success(m['stp.common.task_submitted_music']());
          } else {
            toast.success(m['stp.common.task_submitted_image']());
          }
          pollPendingCreationTasks(mediaType);
          scrollToRecentCreations();
        }
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      if (
        isMountedRef.current &&
        generationSession === generationSessionRef.current
      ) {
        toast.error(formatLocalizedErrorMessage(err?.message));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
      if (generationSession === generationSessionRef.current) {
        generationInFlightRef.current = false;
      }
    }
  };

  // 统一初始化：登录草稿恢复 与 URL 参数自动触发（互斥且仅执行一次）
  useEffect(() => {
    if (isPending || autoInitialized.current) return;
    if (!user) {
      try {
        const raw = sessionStorage.getItem(
          'nanobanana_joyflix_pending_generation_draft'
        );
        if (raw) {
          const draft = JSON.parse(raw);
          if (Date.now() - (draft.createdAt || 0) < 30 * 60 * 1000) return;
        }
      } catch {}
    }
    // 1. 优先检查并恢复未完成的草稿
    if (user) {
      try {
        const raw = sessionStorage.getItem(
          'nanobanana_joyflix_pending_generation_draft'
        );
        if (raw) {
          const draft = JSON.parse(raw);
          // Only resume drafts created after an explicit Generate click.
          if (draft.generationRequested !== true) {
            sessionStorage.removeItem(
              'nanobanana_joyflix_pending_generation_draft'
            );
          } else if (Date.now() - (draft.createdAt || 0) >= 30 * 60 * 1000) {
            sessionStorage.removeItem(
              'nanobanana_joyflix_pending_generation_draft'
            );
          } else {
            const isMatchingMode =
              draft.mode === mode ||
              (isVideoMode &&
                (draft.mode === 'text-to-video' ||
                  draft.mode === 'image-to-video')) ||
              (!isVideoMode &&
                !isMusicMode &&
                (draft.mode === 'text-to-image' ||
                  draft.mode === 'image-to-image' ||
                  draft.mode === 'png-maker')) ||
              (isMusicMode && draft.mode === 'text-to-music');

            if (isMatchingMode) {
              sessionStorage.removeItem(
                'nanobanana_joyflix_pending_generation_draft'
              );
              if (draft.prompt) updatePrompt(draft.prompt);
              if (draft.modelId && models.some((m) => m.id === draft.modelId)) {
                setSelectedModelId(draft.modelId);
              }
              if (draft.ratio) setSelectedRatio(draft.ratio);
              if (draft.duration && isVideoMode)
                setSelectedDuration(draft.duration);
              if (draft.resolution) setSelectedResolution(draft.resolution);
              if (draft.imageUrls && Array.isArray(draft.imageUrls)) {
                setImageUrls(draft.imageUrls);
              } else if (draft.imagePreview) {
                setImageUrls([draft.imagePreview]);
              }

              if (
                draft.prompt ||
                (draft.imageUrls && draft.imageUrls.length > 0)
              ) {
                if (typeof window !== 'undefined' && window.location.search) {
                  window.history.replaceState({}, '', window.location.pathname);
                }
                autoInitialized.current = true;
                // 延迟一帧执行，确保 SPA 路由导航完成后 Sonner toaster 已就绪
                setTimeout(() => {
                  handleGenerate(draft.prompt, {
                    modelId: draft.modelId,
                    ratio: draft.ratio,
                    duration: draft.duration,
                    resolution: draft.resolution,
                    imageUrl: draft.imagePreview,
                    imageUrls: draft.imageUrls,
                  });
                }, 0);
                return;
              }
            }
          }
        }
      } catch {}
    }

    // 2. 解析 URL 查询参数
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const intent = params.get('intent');
      const urlPrompt = params.get('prompt');
      const urlModel = params.get('model');
      const urlRatio = params.get('ratio') || params.get('aspect_ratio');
      const urlDuration = params.get('duration');
      const urlResolution = params.get('resolution');
      const urlImage = params.get('image_url');
      const isAuto =
        params.get('auto') === '1' || params.get('autoGenerate') === 'true';

      if (urlPrompt) updatePrompt(urlPrompt.trim());
      if (urlModel && models.some((m) => m.id === urlModel)) {
        setSelectedModelId(urlModel);
      }
      if (urlRatio) setSelectedRatio(urlRatio);
      if (urlDuration && isVideoMode) setSelectedDuration(urlDuration);
      if (urlResolution) setSelectedResolution(urlResolution);
      if (urlImage) setImageUrls([urlImage]);

      if (intent === 'upload') {
        params.delete('intent');
        const newSearch = params.toString()
          ? `?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newSearch);
        toast.info(m['stp.common.prompt_first']());
        autoInitialized.current = true;
        return;
      }

      if (isAuto && (urlPrompt || urlImage)) {
        window.history.replaceState({}, '', window.location.pathname);
        handleGenerate((urlPrompt || '').trim(), {
          modelId: urlModel || undefined,
          ratio: urlRatio || undefined,
          duration: urlDuration || undefined,
          resolution: urlResolution || undefined,
          imageUrls: urlImage ? [urlImage] : undefined,
        });
      }
      if (!isAuto || user) autoInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, user]);

  const controllerMediaType: 'video' | 'music' | 'image' = isVideoMode
    ? 'video'
    : isMusicMode
      ? 'music'
      : 'image';

  useEffect(() => {
    pollPendingCreationTasks(controllerMediaType);
  }, [controllerMediaType]);

  useEffect(() => {
    const handleSelectPrompt = (e: CustomEvent<string> | Event) => {
      const customEvent = e as CustomEvent<string>;
      if (typeof customEvent.detail === 'string') {
        updatePrompt(customEvent.detail);
      }
    };

    window.addEventListener(
      'nanobanana_joyflix_select_prompt',
      handleSelectPrompt
    );
    return () => {
      window.removeEventListener(
        'nanobanana_joyflix_select_prompt',
        handleSelectPrompt
      );
    };
  }, []);

  return {
    prompt,
    setPrompt: updatePrompt,
    selectedModelId,
    setSelectedModelId,
    selectedRatio,
    setSelectedRatio,
    selectedDuration,
    setSelectedDuration,
    selectedResolution,
    setSelectedResolution,
    publicVisibility,
    setPublicVisibility,
    imageUrls,
    setImageUrls,
    imagePreview,
    images,
    uploadingItems,
    maxImages,
    isUploadingImage,
    handleUploadClick,
    handleFilesSelected,
    handleReplaceFile,
    handleRemoveImage,
    isGenerating,
    generatedResult,
    handleGenerate,
    isVideoMode,
    isMusicMode,
    showAuthModal,
    setShowAuthModal,
  };
}
