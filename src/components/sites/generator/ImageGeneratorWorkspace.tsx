'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { extractMediaUrl } from '@/core/ai';
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
  getImageModelsList,
  getModelSupportedResolutions,
  ModelConfig,
  supportsModelAspectRatio,
} from '@/components/sites/shared/models';

import { ImageGeneratorForm } from './ImageGeneratorForm';
import { ImageGeneratorPreview } from './ImageGeneratorPreview';

export interface ImageGeneratorWorkspaceProps {
  search?: {
    prompt?: string;
    model?: string;
    image?: string;
  };
}

export function ImageGeneratorWorkspace({
  search,
}: ImageGeneratorWorkspaceProps) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: publicConfig } = usePublicConfig();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'text-to-image' | 'image-to-image'
  >('text-to-image');
  const [prompt, setPrompt] = useState(search?.prompt || '');

  const activeModels = useMemo(() => {
    return getImageModelsList(activeTab, publicConfig?.active_ai_provider);
  }, [activeTab, publicConfig?.active_ai_provider]);

  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    if (search?.model && AI_MODELS[search.model]?.type === 'image') {
      return search.model;
    }
    return 'nano-banana-pro';
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

  const availableResolutions = useMemo(() => {
    return getModelSupportedResolutions(
      selectedModelId,
      publicConfig?.active_ai_provider
    );
  }, [selectedModelId, publicConfig?.active_ai_provider]);

  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1K');
  const [publicVisibility, setPublicVisibility] = useState(false);

  useEffect(() => {
    if (
      availableResolutions.length > 0 &&
      !availableResolutions.includes(resolution)
    ) {
      setResolution(availableResolutions[0]);
    }
  }, [availableResolutions, resolution]);

  const [refImageFile, setRefImageFile] = useState<File | null>(null);
  const [refImageUrl, setRefImageUrl] = useState<string>(search?.image || '');
  const [refImagePreview, setRefImagePreview] = useState<string>(
    search?.image || ''
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null
  );
  const [imageLoadError, setImageLoadError] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const autoTriggeredRef = useRef(false);

  const showAspectRatio = supportsModelAspectRatio(
    selectedModelId,
    publicConfig?.active_ai_provider,
    activeTab === 'image-to-image' && Boolean(refImageUrl)
  );

  const currentCredits = calculateCredits(
    selectedModelId || selectedModel?.id || '',
    'image',
    { resolution }
  );

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
          if (draft.resolution) setResolution(draft.resolution);
          if (draft.aspectRatio) setAspectRatio(draft.aspectRatio);
          if (
            draft.image ||
            draft.refImageUrl ||
            draft.imagePreview ||
            draft.startImageUrl ||
            (draft.imageUrls && draft.imageUrls[0])
          ) {
            const img =
              draft.image ||
              draft.refImageUrl ||
              draft.imagePreview ||
              draft.startImageUrl ||
              draft.imageUrls[0];
            setActiveTab('image-to-image');
            setRefImageUrl(img);
            setRefImagePreview(img);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (search?.prompt) setPrompt(search.prompt);
    if (search?.image) {
      setActiveTab('image-to-image');
      setRefImageUrl(search.image);
      setRefImagePreview(search.image);
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
      const targetMode: 'text-to-image' | 'image-to-image' =
        activeDraft.mode === 'image-to-image' ||
        activeDraft.image ||
        activeDraft.refImageUrl ||
        activeDraft.imagePreview
          ? 'image-to-image'
          : 'text-to-image';
      const targetImg =
        activeDraft.image ||
        activeDraft.refImageUrl ||
        activeDraft.imagePreview ||
        activeDraft.startImageUrl ||
        (activeDraft.imageUrls ? activeDraft.imageUrls[0] : '');

      setTimeout(() => {
        if (!isMountedRef.current) return;
        void handleGenerate({
          prompt: activeDraft.prompt,
          modelId: activeDraft.modelId,
          resolution: activeDraft.resolution,
          aspectRatio: activeDraft.aspectRatio,
          refImageUrl: targetImg,
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
          if (
            e.detail.image ||
            e.detail.refImageUrl ||
            e.detail.startImageUrl
          ) {
            const img =
              e.detail.image || e.detail.refImageUrl || e.detail.startImageUrl;
            setActiveTab('image-to-image');
            setRefImageUrl(img);
            setRefImagePreview(img);
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener(
      'nanobanana_joyflix_select_prompt',
      handleSelectPrompt
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
    };
  }, [search?.prompt, search?.image, session?.user]);

  const handleRequestRefImage = async () => {
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

    setRefImageFile(file);
    const preview = URL.createObjectURL(file);
    setRefImagePreview(preview);

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
        setRefImageUrl(uploadedUrl);
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

  const handleRemoveRefImage = () => {
    setRefImageFile(null);
    setRefImageUrl('');
    setRefImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async (overrides?: {
    prompt?: string;
    modelId?: string;
    resolution?: string;
    aspectRatio?: string;
    refImageUrl?: string;
    activeTab?: 'text-to-image' | 'image-to-image';
  }) => {
    if (isUploading) {
      toast.error(m['app.generator.uploading_image']());
      return;
    }

    const effTab = overrides?.activeTab || activeTab;
    const effRefImage =
      overrides?.refImageUrl !== undefined
        ? overrides.refImageUrl
        : refImageUrl;
    const effPrompt =
      overrides?.prompt !== undefined ? overrides.prompt : prompt;
    const effModelId = overrides?.modelId || selectedModelId;
    const effResolution = overrides?.resolution || resolution;
    const effAspectRatio = overrides?.aspectRatio || aspectRatio;

    if (effTab === 'image-to-image' && !effRefImage?.trim()) {
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
            resolution: effResolution,
            aspectRatio: effAspectRatio,
            image: effRefImage || '',
            imagePreview: refImagePreview || effRefImage || '',
            refImageUrl: effRefImage || '',
            mode: effTab,
            target: 'image',
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
      setGeneratedImageUrl(null);
      setImageLoadError(false);

      const effectiveMode = effTab;
      const validImages = effRefImage ? [effRefImage] : [];
      const options: any = {
        mode: effectiveMode,
        visibility: publicVisibility ? 'public' : 'private',
        image_urls: validImages,
        image_input: validImages,
      };
      if (showAspectRatio && effAspectRatio && effAspectRatio !== 'Auto') {
        options.aspect_ratio = effAspectRatio;
      }
      if (availableResolutions.length > 0 && effResolution) {
        options.resolution = effResolution;
      }
      if (effRefImage) {
        options.first_frame_image = effRefImage;
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: 'image',
          mode: effectiveMode,
          scene: effectiveMode,
          prompt: effPrompt.trim(),
          model: effModelId,
          imageUrl: effRefImage || undefined,
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
    const timeout = 180000;

    const check = async () => {
      if (!isMountedRef.current) return;
      if (Date.now() - startTime > timeout) {
        setIsGenerating(false);
        setProgressText('');
        toast.error('Generation timed out. Please check your workspace.');
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
            extractMediaUrl(task?.taskInfo?.images) ||
            extractMediaUrl(task?.taskInfo?.output) ||
            extractMediaUrl(task?.taskResult?.images) ||
            extractMediaUrl(task?.taskResult?.output) ||
            extractMediaUrl(task?.taskResult) ||
            extractMediaUrl(task?.taskInfo) ||
            extractMediaUrl(task);

          if (mediaUrl) {
            setImageLoadError(false);
            setGeneratedImageUrl(mediaUrl);
            toast.success('Success');
            saveLocalCreation({
              id,
              mediaType: 'image',
              url: mediaUrl,
              prompt: prompt.trim(),
              status: 'success',
              createdAt: Date.now(),
              model: selectedModelId,
              visibility: publicVisibility ? 'public' : 'private',
            });
          } else {
            toast.error('Completed but no image returned');
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

    pollTimerRef.current = setTimeout(check, 1500);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[440px_1fr] xl:grid-cols-[460px_1fr]">
      <ImageGeneratorForm
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        refImagePreview={refImagePreview}
        handleRemoveRefImage={handleRemoveRefImage}
        fileInputRef={fileInputRef}
        handleImageSelect={handleImageSelect}
        onRequestRefImage={handleRequestRefImage}
        prompt={prompt}
        setPrompt={setPrompt}
        activeModels={activeModels}
        selectedModelId={selectedModelId}
        setSelectedModelId={setSelectedModelId}
        currentCredits={currentCredits}
        showAspectRatio={showAspectRatio}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        availableResolutions={availableResolutions}
        resolution={resolution}
        setResolution={setResolution}
        publicVisibility={publicVisibility}
        setPublicVisibility={setPublicVisibility}
        isGenerating={isGenerating}
        isUploading={isUploading}
        progressText={progressText}
        handleGenerate={handleGenerate}
      />

      <ImageGeneratorPreview
        isGenerating={isGenerating}
        progressText={progressText}
        generatedImageUrl={generatedImageUrl}
        imageLoadError={imageLoadError}
        setImageLoadError={setImageLoadError}
        prompt={prompt}
        onReset={() => {
          setGeneratedImageUrl(null);
          setImageLoadError(false);
        }}
      />

      <QuickAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        callbackUrl="/ai-image-generator"
      />
    </div>
  );
}
