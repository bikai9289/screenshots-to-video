'use client';

import React, { useState } from 'react';
import { Film, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { resolveUploadImageErrorMessage } from '@/lib/upload-image-error';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  GenerationUploadArea,
  type UploadingItem,
} from '@/components/sites/creation/GenerationUploadArea';
import { QuickAuthModal } from '@/components/sites/creation/QuickAuthModal';
import { HeroGenerationPanel } from '@/components/sites/shared/HeroGenerationPanel';
import {
  AI_MODELS,
  getImageModelsList,
  getModelMaxImages,
  getVideoModelsList,
  supportsModelAspectRatio,
  TAB_MODELS,
  type ModelConfig,
} from '@/components/sites/shared/models';

type Tab = 'video' | 'image';

const MAX_LENGTHS: Record<Tab, number> = {
  video: 1536,
  image: 5000,
};

const TABS: Array<{
  key: Tab;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'video',
    icon: Film,
  },
  {
    key: 'image',
    icon: ImageIcon,
  },
];

interface HeroGeneratorCardProps {
  className?: string;
  defaultTab?: Tab;
}

export function HeroGeneratorCard({
  className = '',
  defaultTab = 'video',
}: HeroGeneratorCardProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [prompt, setPrompt] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(
    TAB_MODELS[defaultTab][0].id
  );
  const [selectedRatio, setSelectedRatio] = useState('Auto');
  const [selectedDuration, setSelectedDuration] = useState('5s');
  const [selectedResolution, setSelectedResolution] = useState(
    defaultTab === 'image' ? '1K' : '720P'
  );
  const [publicVisibility, setPublicVisibility] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([]);

  const maxImages = getModelMaxImages(selectedModelId, activeTab);
  const isUploadingImage = uploadingItems.length > 0;

  const { data: publicConfig } = usePublicConfig();
  const currentModelList: ModelConfig[] =
    activeTab === 'image'
      ? getImageModelsList(undefined, publicConfig?.active_ai_provider)
      : getVideoModelsList(publicConfig?.active_ai_provider);
  React.useEffect(() => {
    if (currentModelList.some((model) => model.id === selectedModelId)) return;
    const nextModel = currentModelList[0];
    if (!nextModel) return;
    setSelectedModelId(nextModel.id);
    setSelectedResolution(
      nextModel.defaultResolution || (activeTab === 'video' ? '720P' : '1K')
    );
  }, [activeTab, currentModelList, selectedModelId]);
  const selectedModelConfig = currentModelList.find(
    (m) => m.id === selectedModelId
  );
  const currentMaxLength = MAX_LENGTHS[activeTab];

  const placeholder =
    activeTab === 'image'
      ? m['landing.hero.placeholder_image']()
      : m['landing.hero.placeholder_video']();

  const firstFrame = imageUrls[0]?.trim();
  const lastFrame = imageUrls[1]?.trim();
  const isFirstLastFrameMode =
    activeTab === 'video' &&
    Boolean(selectedModelConfig?.supportsFirstLastFrame);

  const canGenerate = isFirstLastFrameMode
    ? Boolean(prompt.trim()) && !(lastFrame && !firstFrame)
    : Boolean(prompt.trim());

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const targetList =
      tab === 'image'
        ? getImageModelsList(undefined, publicConfig?.active_ai_provider)
        : getVideoModelsList(publicConfig?.active_ai_provider);
    const firstModel = targetList[0]?.id || '';
    setSelectedModelId(firstModel);
    setImageUrls([]);
    setUploadingItems([]);
    if (tab === 'image') {
      setSelectedResolution(AI_MODELS[firstModel]?.defaultResolution || '1K');
    } else if (tab === 'video') {
      setSelectedResolution(AI_MODELS[firstModel]?.defaultResolution || '720P');
    }
  };

  const getWorkspaceTarget = () => {
    const target =
      activeTab === 'video' ? '/workspace/ai-video' : '/workspace/ai-image';

    const searchParams = new URLSearchParams();
    if (prompt.trim()) {
      searchParams.set('prompt', prompt.trim());
    }
    if (selectedModelId) {
      searchParams.set('model', selectedModelId);
    }
    if (selectedRatio) {
      searchParams.set('ratio', selectedRatio);
    }
    if (selectedDuration && activeTab === 'video') {
      searchParams.set('duration', selectedDuration);
    }
    if (selectedResolution) {
      searchParams.set('resolution', selectedResolution);
    }
    if (firstFrame) {
      searchParams.set('image_url', firstFrame);
    }
    searchParams.set('auto', '1');

    return `${target}?${searchParams.toString()}`;
  };

  const navigateToWorkspace = () => {
    router.push(getWorkspaceTarget());
  };

  const handleGenerate = () => {
    if (isFirstLastFrameMode && lastFrame && !firstFrame) {
      toast.error(m['stp.common.first_frame_required']());
      return;
    }
    if (!prompt.trim()) {
      toast.error(m['stp.common.alert_enter_text_prompt']());
      return;
    }
    if (!session?.user) {
      const mode =
        activeTab === 'video'
          ? firstFrame
            ? 'image-to-video'
            : 'text-to-video'
          : firstFrame
            ? 'image-to-image'
            : 'text-to-image';
      try {
        sessionStorage.setItem(
          'nanobanana_joyflix_pending_generation_draft',
          JSON.stringify({
            generationRequested: true,
            prompt: prompt.trim(),
            modelId: selectedModelId,
            ratio: selectedRatio,
            duration: selectedDuration,
            resolution: selectedResolution,
            imagePreview: firstFrame || '',
            imageUrls,
            mode,
            createdAt: Date.now(),
          })
        );
      } catch {}
      setShowAuthModal(true);
      return;
    }
    const mode =
      activeTab === 'video'
        ? firstFrame
          ? 'image-to-video'
          : 'text-to-video'
        : firstFrame
          ? 'image-to-image'
          : 'text-to-image';
    try {
      sessionStorage.setItem(
        'nanobanana_joyflix_pending_generation_draft',
        JSON.stringify({
          generationRequested: true,
          prompt: prompt.trim(),
          modelId: selectedModelId,
          ratio: selectedRatio,
          duration: selectedDuration,
          resolution: selectedResolution,
          imagePreview: firstFrame || '',
          imageUrls,
          mode,
          createdAt: Date.now(),
        })
      );
    } catch {}
    const target =
      activeTab === 'video' ? '/workspace/ai-video' : '/workspace/ai-image';
    router.push(target);
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!files.length) return;
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(m['stp.common.image_size_limit_exceeded']());
    }
    const validFiles = files.filter((f) => f.size <= MAX_FILE_SIZE);
    if (!validFiles.length) return;

    const currentTotal = imageUrls.length + uploadingItems.length;
    const availableSlots = Math.max(0, maxImages - currentTotal);
    const filesToProcess = validFiles.slice(0, availableSlots);
    if (filesToProcess.length < validFiles.length) {
      toast.info(m['stp.common.image_limit_reached']({ max: maxImages }));
    }
    if (!filesToProcess.length) return;

    const newUploading: UploadingItem[] = filesToProcess.map((file, i) => ({
      id: `hero-upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      localUrl: URL.createObjectURL(file),
      slotIndex: imageUrls.length + i,
    }));

    setUploadingItems((prev) => [...prev, ...newUploading]);

    try {
      const formData = new FormData();
      filesToProcess.forEach((file) => formData.append('files', file));
      const response = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      const urls = data?.data?.urls || data?.urls;
      if (!response.ok || data?.code === -1 || !Array.isArray(urls)) {
        throw new Error(resolveUploadImageErrorMessage(data?.message));
      }
      setImageUrls((prev) => [...prev, ...urls].slice(0, maxImages));
    } catch (error: any) {
      toast.error(
        resolveUploadImageErrorMessage(error.message) ||
          m['stp.common.image_upload_failed']()
      );
    } finally {
      newUploading.forEach((item) => URL.revokeObjectURL(item.localUrl));
      setUploadingItems((prev) =>
        prev.filter((item) => !newUploading.some((next) => next.id === item.id))
      );
    }
  };

  const handleReplaceFile = async (index: number, file: File) => {
    if (!file) return;
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(m['stp.common.image_size_limit_exceeded']());
      return;
    }

    const replaceId = `hero-rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const localUrl = URL.createObjectURL(file);
    const item: UploadingItem = { id: replaceId, localUrl, slotIndex: index };

    setUploadingItems((prev) => [...prev, item]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      const uploadedUrl = data?.data?.urls?.[0] || data?.urls?.[0];
      if (response.ok && data?.code !== -1 && uploadedUrl) {
        setImageUrls((prev) => {
          const next = [...prev];
          while (next.length <= index) {
            next.push('');
          }
          next[index] = uploadedUrl;
          return next;
        });
      } else {
        toast.error(resolveUploadImageErrorMessage(data?.message));
      }
    } catch (error: any) {
      toast.error(
        resolveUploadImageErrorMessage(error?.message) ||
          m['stp.common.image_replace_failed']()
      );
    } finally {
      if (localUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localUrl);
      }
      setUploadingItems((prev) => prev.filter((it) => it.id !== replaceId));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => {
      const next = [...prev];
      if (index < next.length) {
        next[index] = '';
      }
      if (next.every((item) => !item)) {
        return [];
      }
      return next;
    });
  };

  return (
    <div
      className={`animate-slide-up mx-auto w-full max-w-6xl text-left ${className}`}
    >
      {/* Mobile / Tablet Tab Buttons (< lg) - Seamlessly docked atop the card */}
      <div className="border-border/80 bg-muted/40 flex items-center gap-1.5 rounded-t-2xl border-x border-t p-1.5 backdrop-blur-md lg:hidden dark:border-white/15 dark:bg-[#13151b]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const label =
            tab.key === 'image'
              ? m['landing.hero.tab_image']()
              : m['landing.hero.tab_video']();

          return (
            <button
              key={tab.key}
              type="button"
              data-active={isActive}
              onClick={() => handleTabChange(tab.key)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                isActive
                  ? 'border-border/80 text-primary bg-card border font-bold shadow-xs dark:border-white/20 dark:bg-[#1a1d26] dark:text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:text-white/60 dark:hover:bg-white/[0.04] dark:hover:text-white'
              }`}
            >
              <tab.icon
                className={`size-4 shrink-0 ${
                  isActive
                    ? 'text-primary dark:text-white'
                    : 'text-muted-foreground dark:text-white/60'
                }`}
              />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Signature Tab Buttons (>= lg) */}
      <div className="relative z-0 hidden flex-nowrap items-center gap-0 overflow-x-auto px-2 pb-0 lg:flex">
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.key;
          const maskUrl = isActive
            ? 'url(/imgs/tab1.png)'
            : 'url(/imgs/tab2.png)';
          const label =
            tab.key === 'image'
              ? m['landing.hero.tab_image']()
              : m['landing.hero.tab_video']();

          return (
            <button
              key={tab.key}
              type="button"
              data-active={isActive}
              onClick={() => handleTabChange(tab.key)}
              style={{
                zIndex: isActive ? 5 : 4 - idx,
                WebkitMaskImage: maskUrl,
                maskImage: maskUrl,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
                transitionProperty: 'background-color, color, transform',
              }}
              className={`mode-tab-button group relative flex w-auto shrink-0 basis-auto cursor-pointer items-center justify-start gap-2 px-10 pt-3 pb-10 text-sm font-semibold shadow-none transition-colors focus-visible:outline-none ${
                isActive
                  ? 'bg-primary text-primary-foreground pl-8 dark:border-x dark:border-t dark:border-white/15 dark:bg-[#13151b] dark:text-white'
                  : `bg-card/70 text-muted-foreground hover:text-foreground dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/[0.08] dark:hover:text-white ${
                      idx > 0 ? '-ml-10' : ''
                    }`
              }`}
            >
              <tab.icon className="block size-4.5 shrink-0 transition-transform group-hover:scale-110" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <HeroGenerationPanel
        prompt={prompt}
        onPromptChange={setPrompt}
        placeholder={placeholder}
        maxLength={currentMaxLength}
        isMusic={false}
        uploadArea={
          (activeTab === 'image' || activeTab === 'video') && (
            <GenerationUploadArea
              images={imageUrls}
              uploadingItems={uploadingItems}
              maxImages={maxImages}
              isFirstLastFrameMode={
                activeTab === 'video' &&
                Boolean(selectedModelConfig?.supportsFirstLastFrame)
              }
              onUploadClick={(e) => {
                if (!session?.user) {
                  e.preventDefault();
                  setShowAuthModal(true);
                }
              }}
              onFilesSelected={handleFilesSelected}
              onReplaceFile={handleReplaceFile}
              onRemoveImage={handleRemoveImage}
            />
          )
        }
        models={currentModelList}
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        selectedRatio={selectedRatio}
        onRatioChange={setSelectedRatio}
        showRatio={
          activeTab !== 'video' ||
          supportsModelAspectRatio(
            selectedModelId,
            publicConfig?.active_ai_provider,
            imageUrls.length > 0
          )
        }
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        showDuration={activeTab === 'video'}
        selectedResolution={selectedResolution}
        onResolutionChange={setSelectedResolution}
        showResolution
        publicVisibility={publicVisibility}
        onVisibilityChange={setPublicVisibility}
        isGenerating={isGenerating}
        disabled={isUploadingImage}
        onGenerate={handleGenerate}
        provider={publicConfig?.active_ai_provider}
        className="rounded-t-none border-t-0 lg:-mt-8 lg:rounded-t-2xl lg:border-t"
      />
      <QuickAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={navigateToWorkspace}
        callbackUrl={getWorkspaceTarget()}
      />
    </div>
  );
}
