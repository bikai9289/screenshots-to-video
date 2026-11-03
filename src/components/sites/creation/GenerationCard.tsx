'use client';

import React from 'react';

import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { WorkspaceRecentCreations } from '@/components/sites/workspace/WorkspaceRecentCreations';

import { HeroGenerationPanel } from '../shared/HeroGenerationPanel';
import {
  getImageModelsList,
  getModelMaxPromptLength,
  getVideoModelsList,
  ModelConfig,
  supportsModelAspectRatio,
} from '../shared/models';
import { GenerationUploadArea } from './GenerationUploadArea';
import { QuickAuthModal } from './QuickAuthModal';
import { useGenerationController } from './useGenerationController';

export interface GenerationCardProps {
  mode:
    | 'text-to-image'
    | 'image-to-image'
    | 'text-to-video'
    | 'image-to-video'
    | 'text-to-music'
    | 'png-maker';
  models: ModelConfig[];
  defaultPrompt?: string;
  placeholder?: string;
  requireImageUpload?: boolean;
  showImageUpload?: boolean;
  filterMode?: string;
}

/**
 * 创作工作台核心面板组件
 * 集合提示词输入区、参数栏（比例/时长/分辨率）、图片上传区、即时生成状态以及所属类型的最近作品列表
 */
export function GenerationCard({
  mode,
  models,
  defaultPrompt = '',
  placeholder,
  requireImageUpload = false,
  showImageUpload = false,
  filterMode,
}: GenerationCardProps) {
  const { data: publicConfig } = usePublicConfig();
  const mediaType: 'image' | 'video' | 'music' =
    mode === 'text-to-video' || mode === 'image-to-video'
      ? 'video'
      : mode === 'text-to-music'
        ? 'music'
        : 'image';
  const activeModels =
    mediaType === 'image'
      ? getImageModelsList(mode, publicConfig?.active_ai_provider)
      : mediaType === 'video'
        ? getVideoModelsList(publicConfig?.active_ai_provider)
        : models;
  const {
    prompt,
    setPrompt,
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
    uploadingItems,
    maxImages,
    isUploadingImage,
    handleUploadClick,
    handleFilesSelected,
    handleReplaceFile,
    handleRemoveImage,
    isGenerating,
    handleGenerate,
    isVideoMode,
    showAuthModal,
    setShowAuthModal,
  } = useGenerationController({
    mode,
    models: activeModels,
    defaultPrompt,
    requireImageUpload,
    provider: publicConfig?.active_ai_provider,
  });

  const resolvedPlaceholder =
    placeholder ?? m['stp.common.describe_placeholder']();

  const currentModel = activeModels.find(
    (mItem) => mItem.id === selectedModelId
  );
  const supportsImageInput =
    mediaType === 'image' && currentModel?.supportsImageToImage === true;
  const showUploadArea =
    (requireImageUpload ||
      showImageUpload ||
      mode === 'image-to-image' ||
      mode === 'image-to-video' ||
      mode === 'png-maker') &&
    (mediaType !== 'image' || supportsImageInput || requireImageUpload);
  const isFirstLastFrameMode =
    isVideoMode && Boolean(currentModel?.supportsFirstLastFrame);

  const firstFrame = imageUrls[0]?.trim();
  const lastFrame = imageUrls[1]?.trim();
  const isImageModeOnly =
    mode === 'image-to-video' ||
    mode === 'image-to-image' ||
    mode === 'png-maker' ||
    requireImageUpload;

  const isButtonDisabled =
    isUploadingImage ||
    isGenerating ||
    (isImageModeOnly
      ? !firstFrame
      : isFirstLastFrameMode && Boolean(lastFrame && !firstFrame)
        ? true
        : !prompt.trim() && !firstFrame);
  const maxLength = getModelMaxPromptLength(
    selectedModelId,
    publicConfig?.active_ai_provider,
    mode
  );

  return (
    <div id="ai-generator" data-section="ai-generator" className="space-y-6">
      <HeroGenerationPanel
        prompt={prompt}
        onPromptChange={setPrompt}
        placeholder={resolvedPlaceholder}
        maxLength={maxLength}
        isMusic={mode === 'text-to-music'}
        hidePrompt={mode === 'png-maker'}
        uploadArea={
          showUploadArea && (
            <GenerationUploadArea
              images={imageUrls}
              uploadingItems={uploadingItems}
              maxImages={maxImages}
              disabled={isGenerating}
              isFirstLastFrameMode={isFirstLastFrameMode}
              isImageRequired={isImageModeOnly}
              onUploadClick={handleUploadClick}
              onFilesSelected={handleFilesSelected}
              onReplaceFile={handleReplaceFile}
              onRemoveImage={handleRemoveImage}
            />
          )
        }
        models={activeModels}
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        selectedRatio={selectedRatio}
        onRatioChange={setSelectedRatio}
        showRatio={
          mode !== 'text-to-music' &&
          (!isVideoMode ||
            supportsModelAspectRatio(
              selectedModelId,
              publicConfig?.active_ai_provider,
              mode === 'image-to-video' || Boolean(firstFrame || lastFrame)
            ))
        }
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        showDuration={isVideoMode}
        selectedResolution={selectedResolution}
        onResolutionChange={setSelectedResolution}
        showResolution={mediaType !== 'music'}
        publicVisibility={publicVisibility}
        onVisibilityChange={setPublicVisibility}
        isGenerating={isGenerating}
        provider={publicConfig?.active_ai_provider}
        disabled={isUploadingImage}
        onGenerate={() => handleGenerate()}
      />

      {/* Media-specific Recent Creations Grid (Last 10 + Generating loading card) */}
      <WorkspaceRecentCreations
        filterMediaType={mediaType}
        filterMode={filterMode}
        isGenerating={isGenerating}
        generatingPrompt={prompt}
        limit={8}
      />

      {/* Quick Auth Modal for Unauthenticated Users */}
      <QuickAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
}

export type { ModelConfig as ModelOption };
