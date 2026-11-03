'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { extractMediaUrl, extractVideoUrl } from '@/core/ai';
import { ensureClientUser, useSession } from '@/core/auth/client';
import { saveLocalCreation } from '@/modules/creations/store';
import {
  isUploadUnauthorized,
  resolveUploadImageErrorMessage,
} from '@/lib/upload-image-error';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { QuickAuthModal } from '@/components/sites/creation/QuickAuthModal';
import {
  AI_MODELS,
  calculateCredits,
  getModelSupportedDurations,
  getModelSupportedResolutions,
  getVideoModelsList,
  ModelConfig,
  supportsModelAspectRatio,
} from '@/components/sites/shared/models';

import { VideoGeneratorForm } from './VideoGeneratorForm';
import { VideoGeneratorPreview } from './VideoGeneratorPreview';

const isImageReferenceUrl = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !/\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(value.trim());

export interface VideoGeneratorWorkspaceProps {
  search?: {
    prompt?: string;
    model?: string;
    startImageUrl?: string;
  };
}

export function VideoGeneratorWorkspace({
  search,
}: VideoGeneratorWorkspaceProps) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: publicConfig } = usePublicConfig();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const activeModels = useMemo(() => {
    return getVideoModelsList(publicConfig?.active_ai_provider);
  }, [publicConfig?.active_ai_provider]);

  const [activeTab, setActiveTab] = useState<
    'text-to-video' | 'image-to-video'
  >('text-to-video');
  const [prompt, setPrompt] = useState(search?.prompt || '');
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    if (search?.model && AI_MODELS[search.model]?.type === 'video') {
      return search.model;
    }
    return 'seedance-2-5';
  });

  useEffect(() => {
    if (
      activeModels.length > 0 &&
      !activeModels.some((m) => m.id === selectedModelId)
    ) {
      setSelectedModelId(activeModels[0].id);
    }
  }, [activeModels, selectedModelId]);

  const selectedModel: ModelConfig | undefined =
    activeModels.find((m) => m.id === selectedModelId) || activeModels[0];
  const supportsFirstLastFrame = Boolean(selectedModel?.supportsFirstLastFrame);

  const availableResolutions = useMemo(() => {
    return getModelSupportedResolutions(
      selectedModelId,
      publicConfig?.active_ai_provider
    );
  }, [selectedModelId, publicConfig?.active_ai_provider]);

  const [resolution, setResolution] = useState<string>('720P');

  useEffect(() => {
    if (
      availableResolutions.length > 0 &&
      !availableResolutions.includes(resolution)
    ) {
      setResolution(availableResolutions[0]);
    }
  }, [availableResolutions, resolution]);

  const availableDurations = useMemo(() => {
    return getModelSupportedDurations(
      selectedModelId,
      publicConfig?.active_ai_provider,
      resolution
    );
  }, [selectedModelId, publicConfig?.active_ai_provider, resolution]);

  const [duration, setDuration] = useState<string>('5s');

  useEffect(() => {
    if (
      availableDurations.length > 0 &&
      !availableDurations.includes(duration)
    ) {
      setDuration(availableDurations[0]);
    }
  }, [availableDurations, duration]);

  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [publicVisibility, setPublicVisibility] = useState(false);
  const [startImageFile, setStartImageFile] = useState<File | null>(null);
  const [endImagePreview, setEndImagePreview] = useState('');
  const [endImageUrl, setEndImageUrl] = useState('');
  const endFileInputRef = useRef<HTMLInputElement>(null);
  const [startImageUrl, setStartImageUrl] = useState<string>(
    search?.startImageUrl || ''
  );
  const [startImagePreview, setStartImagePreview] = useState<string>(
    search?.startImageUrl || ''
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(
    null
  );
  const [videoLoadError, setVideoLoadError] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const autoTriggeredRef = useRef(false);

  const showAspectRatio = supportsModelAspectRatio(
    selectedModelId,
    publicConfig?.active_ai_provider,
    activeTab === 'image-to-video' && Boolean(startImageUrl)
  );

  const currentCredits = calculateCredits(
    selectedModelId || selectedModel?.id || '',
    'video',
    { duration, resolution }
  );

  const handleModelChange = (modelId: string) => {
    const nextResolutions = getModelSupportedResolutions(
      modelId,
      publicConfig?.active_ai_provider
    );
    const nextResolution = nextResolutions[0] || resolution;
    const nextDurations = getModelSupportedDurations(
      modelId,
      publicConfig?.active_ai_provider,
      nextResolution
    );
    setSelectedModelId(modelId);
    setResolution(nextResolution);
    setDuration(nextDurations[0] || duration);
  };

  const handleResolutionChange = (nextResolution: string) => {
    const nextDurations = getModelSupportedDurations(
      selectedModelId,
      publicConfig?.active_ai_provider,
      nextResolution
    );
    setResolution(nextResolution);
    if (nextDurations.length > 0 && !nextDurations.includes(duration)) {
      setDuration(nextDurations[0]);
    }
  };

  // 立即在组件挂载第一时间同步恢复草稿缓存，实现零延迟即时回显
  useEffect(() => {
    isMountedRef.current = true;
    try {
      const raw = sessionStorage.getItem(
        'nanobanana_joyflix_pending_generation_draft'
      );
      if (raw) {
        const draft = JSON.parse(raw);
        if (Date.now() - (draft.createdAt || 0) < 30 * 60 * 1000) {
          if (draft.prompt) setPrompt(draft.prompt);
          if (draft.modelId) setSelectedModelId(draft.modelId);
          if (draft.duration) setDuration(draft.duration);
          if (draft.resolution) setResolution(draft.resolution);
          if (draft.aspectRatio) setAspectRatio(draft.aspectRatio);
          const img = [
            draft.startImageUrl,
            draft.imagePreview,
            draft.image,
            draft.imageUrls?.[0],
          ].find(isImageReferenceUrl);
          if (img) {
            setActiveTab('image-to-video');
            setStartImageUrl(img);
            setStartImagePreview(img);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (search?.prompt) setPrompt(search.prompt);
    if (search?.startImageUrl) {
      setActiveTab('image-to-video');
      setStartImageUrl(search.startImageUrl);
      setStartImagePreview(search.startImageUrl);
    }

    let activeDraft: any = null;
    try {
      const raw = sessionStorage.getItem(
        'nanobanana_joyflix_pending_generation_draft'
      );
      if (raw) {
        const draft = JSON.parse(raw);
        if (Date.now() - (draft.createdAt || 0) < 30 * 60 * 1000) {
          activeDraft = draft;
        } else {
          sessionStorage.removeItem(
            'nanobanana_joyflix_pending_generation_draft'
          );
        }
      }
    } catch {}

    if (
      activeDraft &&
      activeDraft.generationRequested &&
      session?.user &&
      !autoTriggeredRef.current
    ) {
      sessionStorage.removeItem('nanobanana_joyflix_pending_generation_draft');
      autoTriggeredRef.current = true;
      const targetMode: 'text-to-video' | 'image-to-video' =
        activeDraft.mode === 'image-to-video' ||
        [activeDraft.startImageUrl, activeDraft.imagePreview].some(
          isImageReferenceUrl
        )
          ? 'image-to-video'
          : 'text-to-video';
      const targetImg =
        [
          activeDraft.startImageUrl,
          activeDraft.imagePreview,
          activeDraft.imageUrls?.[0],
        ].find(isImageReferenceUrl) || '';

      setTimeout(() => {
        if (!isMountedRef.current) return;
        void handleGenerate({
          prompt: activeDraft.prompt,
          modelId: activeDraft.modelId,
          duration: activeDraft.duration,
          resolution: activeDraft.resolution,
          aspectRatio: activeDraft.aspectRatio,
          startImageUrl: targetImg,
          activeTab: targetMode,
        });
      }, 100);
    }

    const handleSelectPrompt = (e: any) => {
      if (e?.detail) {
        if (typeof e.detail === 'string') {
          setPrompt(e.detail);
        } else if (typeof e.detail === 'object') {
          if (e.detail.prompt) setPrompt(e.detail.prompt);
          if (e.detail.model) setSelectedModelId(e.detail.model);
          if (e.detail.startImageUrl || e.detail.image) {
            const img = e.detail.startImageUrl || e.detail.image;
            setActiveTab('image-to-video');
            setStartImageUrl(img);
            setStartImagePreview(img);
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    const handleReset = () => {
      sessionStorage.removeItem('nanobanana_joyflix_pending_generation_draft');
      setPrompt('');
      setStartImageUrl('');
      setStartImagePreview('');
      setStartImageFile(null);
      setActiveTab('text-to-video');
    };
    window.addEventListener(
      'nanobanana_joyflix_select_prompt',
      handleSelectPrompt
    );
    window.addEventListener(
      'nanobanana_joyflix_reset_video_generator',
      handleReset
    );

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      window.removeEventListener(
        'nanobanana_joyflix_select_prompt',
        handleSelectPrompt
      );
      window.removeEventListener(
        'nanobanana_joyflix_reset_video_generator',
        handleReset
      );
    };
  }, [search?.prompt, search?.startImageUrl, session?.user]);

  const handleRequestStartImage = async () => {
    const user = await ensureClientUser(session?.user);
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = await ensureClientUser(session?.user);
    if (!user) {
      setShowAuthModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(m['stp.common.image_size_limit_exceeded']());
      return;
    }

    setActiveTab('image-to-video');

    setStartImageFile(file);
    const preview = URL.createObjectURL(file);
    setStartImagePreview(preview);

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      const uploadedUrl = data?.data?.urls?.[0] || data?.data?.url || '';
      if (res.ok && data?.code !== -1 && uploadedUrl) {
        setStartImageUrl(uploadedUrl);
      } else if (isUploadUnauthorized(data?.message, res.status)) {
        setShowAuthModal(true);
      } else {
        toast.error(resolveUploadImageErrorMessage(data?.message));
      }
    } catch (err: any) {
      console.error(err);
      if (
        err?.message?.toLowerCase().includes('unauthorized') ||
        err?.message?.includes('未登录')
      ) {
        setShowAuthModal(true);
      } else {
        toast.error(
          resolveUploadImageErrorMessage(err?.message) ||
            m['stp.common.image_upload_failed']()
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveStartImage = () => {
    setStartImageFile(null);
    setStartImageUrl('');
    setStartImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleEndImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(m['stp.common.image_format_unsupported']());
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(m['stp.common.image_size_limit_exceeded']());
      return;
    }
    setEndImagePreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append('file', file);
    void fetch('/api/storage/upload-image', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    })
      .then(async (r) => {
        const d = await r.json();
        const url = d?.data?.urls?.[0] || d?.data?.url || '';
        if (r.ok && d?.code !== -1 && url) {
          setEndImageUrl(url);
          return;
        }
        if (isUploadUnauthorized(d?.message, r.status)) {
          setShowAuthModal(true);
          return;
        }
        toast.error(resolveUploadImageErrorMessage(d?.message));
      })
      .catch(() => {
        toast.error(m['stp.common.image_upload_failed']());
      });
  };
  const handleRemoveEndImage = () => {
    setEndImagePreview('');
    setEndImageUrl('');
  };

  const handleGenerate = async (overrides?: {
    prompt?: string;
    modelId?: string;
    duration?: string;
    resolution?: string;
    aspectRatio?: string;
    startImageUrl?: string;
    activeTab?: 'text-to-video' | 'image-to-video';
  }) => {
    if (isUploading) {
      toast.error(m['app.generator.uploading_image']());
      return;
    }

    const effTab = overrides?.activeTab || activeTab;
    const effStartImage =
      overrides?.startImageUrl !== undefined
        ? overrides.startImageUrl
        : startImageUrl;
    const effPrompt =
      overrides?.prompt !== undefined ? overrides.prompt : prompt;
    const effModelId = overrides?.modelId || selectedModelId;
    const effDuration = overrides?.duration || duration;
    const effResolution = overrides?.resolution || resolution;
    const effAspectRatio = overrides?.aspectRatio || aspectRatio;

    if (effTab === 'image-to-video' && !effStartImage?.trim()) {
      toast.error(m['app.generator.reference_image_required']());
      return;
    }

    if (!effPrompt.trim()) {
      toast.error(m['app.generator.prompt_required']());
      return;
    }

    if (!session?.user) {
      try {
        sessionStorage.setItem(
          'nanobanana_joyflix_pending_generation_draft',
          JSON.stringify({
            generationRequested: true,
            prompt: effPrompt.trim(),
            modelId: effModelId,
            duration: effDuration,
            resolution: effResolution,
            aspectRatio: effAspectRatio,
            startImageUrl: effStartImage || '',
            imagePreview: startImagePreview || effStartImage || '',
            mode: effTab,
            target: 'video',
            createdAt: Date.now(),
          })
        );
      } catch (err) {
        console.warn('Failed to save draft:', err);
      }
      setShowAuthModal(true);
      return;
    }

    try {
      setIsGenerating(true);
      setProgressText(m['app.generator.generating']());
      setGeneratedVideoUrl(null);
      setVideoLoadError(false);

      const effectiveMode = effTab;
      const validImages = [
        effStartImage,
        supportsFirstLastFrame ? endImageUrl : '',
      ].filter(Boolean);
      const options: any = {
        mode: effectiveMode,
        visibility: publicVisibility ? 'public' : 'private',
        image_urls: validImages,
        image_input: validImages,
      };
      if (showAspectRatio && effAspectRatio) {
        options.aspect_ratio = effAspectRatio;
      }
      if (effDuration) {
        options.duration = effDuration;
      }
      if (availableResolutions.length > 0 && effResolution) {
        options.resolution = effResolution;
      }
      if (effStartImage) {
        options.first_frame_image = effStartImage;
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: 'video',
          mode: effectiveMode,
          scene: effectiveMode,
          prompt: effPrompt.trim(),
          model: effModelId,
          imageUrl: effStartImage || undefined,
          imageUrls: validImages,
          options,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.code !== 0) {
        throw new Error(json.message || 'Generation failed');
      }

      const createdTaskId = json.data?.taskId || json.data?.id;
      pollTask(createdTaskId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to generate');
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const pollTask = (id: string) => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const startTime = Date.now();
    const timeout = 360000;

    const check = async () => {
      if (!isMountedRef.current) return;
      if (Date.now() - startTime > timeout) {
        setIsGenerating(false);
        setProgressText('');
        toast.error('Video generation timed out. Please check your workspace.');
        return;
      }

      try {
        const res = await fetch(
          `/api/ai/task?taskId=${encodeURIComponent(id)}`
        );
        const json = await res.json();
        const task = json.data;

        if (!isMountedRef.current) return;

        if (task?.taskStatus === 'success' || task?.status === 'success') {
          setIsGenerating(false);
          setProgressText('');

          const mediaUrl =
            extractVideoUrl(task?.taskInfo?.videos) ||
            extractVideoUrl(task?.taskResult?.videos) ||
            extractVideoUrl(task?.taskResult?.output) ||
            extractVideoUrl(task?.taskInfo?.output) ||
            extractVideoUrl(task?.taskResult) ||
            extractVideoUrl(task?.taskInfo) ||
            extractVideoUrl(task) ||
            extractMediaUrl(task?.taskInfo?.videos) ||
            extractMediaUrl(task?.taskResult?.videos) ||
            extractMediaUrl(task?.taskResult?.output) ||
            extractMediaUrl(task?.taskInfo?.output) ||
            extractMediaUrl(task?.taskResult) ||
            extractMediaUrl(task?.taskInfo) ||
            extractMediaUrl(task);

          if (mediaUrl) {
            setVideoLoadError(false);
            setGeneratedVideoUrl(mediaUrl);
            toast.success('Success');
            saveLocalCreation({
              id,
              mediaType: 'video',
              url: mediaUrl,
              prompt: prompt.trim(),
              status: 'success',
              createdAt: Date.now(),
              model: selectedModelId,
              visibility: publicVisibility ? 'public' : 'private',
            });
          } else {
            toast.error('Completed but no video returned');
          }
          return;
        }

        if (task?.taskStatus === 'failed' || task?.status === 'failed') {
          setIsGenerating(false);
          setProgressText('');
          toast.error(task.syncError || 'Generation failed');
          return;
        }

        if (task?.progress) {
          setProgressText(
            `${m['app.generator.generating']()} (${task.progress}%)`
          );
        }

        if (isMountedRef.current) {
          pollTimerRef.current = setTimeout(check, 3000);
        }
      } catch (e) {
        console.warn('Polling error:', e);
        if (isMountedRef.current) {
          pollTimerRef.current = setTimeout(check, 3000);
        }
      }
    };

    pollTimerRef.current = setTimeout(check, 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[440px_1fr] xl:grid-cols-[460px_1fr]">
      <VideoGeneratorForm
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleRemoveStartImage={handleRemoveStartImage}
        startImagePreview={startImagePreview}
        fileInputRef={fileInputRef}
        handleImageSelect={handleImageSelect}
        onRequestStartImage={handleRequestStartImage}
        endImagePreview={endImagePreview}
        endFileInputRef={endFileInputRef}
        handleEndImageSelect={handleEndImageSelect}
        handleRemoveEndImage={handleRemoveEndImage}
        prompt={prompt}
        setPrompt={setPrompt}
        activeModels={activeModels}
        supportsFirstLastFrame={supportsFirstLastFrame}
        selectedModelId={selectedModelId}
        setSelectedModelId={handleModelChange}
        currentCredits={currentCredits}
        availableDurations={availableDurations}
        duration={duration}
        setDuration={setDuration}
        availableResolutions={availableResolutions}
        resolution={resolution}
        setResolution={handleResolutionChange}
        showAspectRatio={showAspectRatio}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        publicVisibility={publicVisibility}
        setPublicVisibility={setPublicVisibility}
        isGenerating={isGenerating}
        isUploading={isUploading}
        progressText={progressText}
        handleGenerate={handleGenerate}
      />

      <VideoGeneratorPreview
        isGenerating={isGenerating}
        progressText={progressText}
        generatedVideoUrl={generatedVideoUrl}
        videoLoadError={videoLoadError}
        setVideoLoadError={setVideoLoadError}
        setGeneratedVideoUrl={setGeneratedVideoUrl}
      />

      <QuickAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        callbackUrl="/ai-video-generator"
      />
    </div>
  );
}
