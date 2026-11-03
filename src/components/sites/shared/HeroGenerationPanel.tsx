'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import { GenerationParamsBar } from './GenerationParamsBar';
import { type ModelConfig } from './models';

interface HeroGenerationPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  placeholder: string;
  maxLength?: number;
  isMusic: boolean;
  uploadArea?: React.ReactNode;
  models: ModelConfig[];
  selectedModelId: string;
  onModelChange: (id: string) => void;
  selectedRatio: string;
  onRatioChange: (ratio: string) => void;
  showRatio: boolean;
  selectedDuration: string;
  onDurationChange: (duration: string) => void;
  showDuration: boolean;
  selectedResolution: string;
  onResolutionChange: (resolution: string) => void;
  showResolution: boolean;
  publicVisibility: boolean;
  onVisibilityChange: (visible: boolean) => void;
  isGenerating: boolean;
  disabled: boolean;
  onGenerate: () => void;
  className?: string;
  hidePrompt?: boolean;
  provider?: string;
}

export function HeroGenerationPanel({
  prompt,
  onPromptChange,
  placeholder,
  maxLength,
  isMusic,
  uploadArea,
  models,
  selectedModelId,
  onModelChange,
  selectedRatio,
  onRatioChange,
  showRatio,
  selectedDuration,
  onDurationChange,
  showDuration,
  selectedResolution,
  onResolutionChange,
  showResolution,
  publicVisibility,
  onVisibilityChange,
  isGenerating,
  disabled,
  onGenerate,
  className,
  hidePrompt = false,
  provider,
}: HeroGenerationPanelProps) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground border-border/80 focus-within:border-primary/50 dark:focus-within:border-primary/60 relative z-20 flex flex-col overflow-hidden rounded-2xl border shadow-none transition-all dark:border-white/15 dark:bg-[#13151b] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_40px_rgba(0,0,0,0.6)]',
        className
      )}
    >
      <div className="space-y-4 p-5 sm:p-6">
        {uploadArea}
        {!hidePrompt && (
          <div className="relative">
            <textarea
              className={`text-foreground placeholder:text-muted-foreground/70 w-full resize-none rounded-md border-0 bg-transparent p-0 text-sm leading-relaxed focus:outline-hidden sm:text-base ${
                isMusic ? 'min-h-[174px]' : 'min-h-[104px]'
              }`}
              placeholder={placeholder}
              maxLength={maxLength}
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
            />
            <span className="text-muted-foreground/60 absolute right-1 bottom-0 font-mono text-[11px]">
              {prompt.length}
              {maxLength !== undefined ? `/${maxLength}` : ''}
            </span>
          </div>
        )}
        <GenerationParamsBar
          models={models}
          selectedModelId={selectedModelId}
          onModelChange={onModelChange}
          selectedRatio={selectedRatio}
          onRatioChange={onRatioChange}
          showRatio={showRatio}
          selectedDuration={selectedDuration}
          onDurationChange={onDurationChange}
          showDuration={showDuration}
          selectedResolution={selectedResolution}
          onResolutionChange={onResolutionChange}
          showResolution={showResolution}
          publicVisibility={publicVisibility}
          onVisibilityChange={onVisibilityChange}
          isGenerating={isGenerating}
          disabled={disabled}
          onGenerate={onGenerate}
          provider={provider}
        />
      </div>
    </div>
  );
}
