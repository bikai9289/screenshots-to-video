'use client';

import React from 'react';
import { Clock, HelpCircle, Loader2, Monitor, Sparkles } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  calculateCredits,
  getModelSupportedDurations,
  getModelSupportedResolutions,
  ModelConfig,
} from './models';
import { ModelSelect } from './ModelSelect';
import { RatioSelect } from './RatioSelect';

interface GenerationParamsBarProps {
  models: ModelConfig[];
  selectedModelId: string;
  onModelChange: (id: string) => void;
  selectedRatio?: string;
  onRatioChange?: (ratio: string) => void;
  showRatio?: boolean;
  selectedDuration?: string;
  onDurationChange?: (duration: string) => void;
  showDuration?: boolean;
  selectedResolution?: string;
  onResolutionChange?: (resolution: string) => void;
  showResolution?: boolean;
  publicVisibility: boolean;
  onVisibilityChange: (visible: boolean) => void;
  credits?: number;
  isGenerating?: boolean;
  disabled?: boolean;
  onGenerate: () => void;
  generateLabel?: string;
  provider?: string;
}

export function GenerationParamsBar({
  models,
  selectedModelId,
  onModelChange,
  selectedRatio = 'Auto',
  onRatioChange,
  showRatio = true,
  selectedDuration = '5s',
  onDurationChange,
  showDuration = false,
  selectedResolution = '720P',
  onResolutionChange,
  showResolution = false,
  publicVisibility,
  onVisibilityChange,
  credits,
  isGenerating = false,
  disabled = false,
  onGenerate,
  generateLabel,
  provider,
}: GenerationParamsBarProps) {
  const currentModel =
    models.find((mItem) => mItem.id === selectedModelId) || models[0];

  const availableDurations = getModelSupportedDurations(
    selectedModelId,
    provider,
    selectedResolution
  );
  const availableResolutions = getModelSupportedResolutions(
    selectedModelId,
    provider
  );

  const shouldShowDuration = showDuration && availableDurations.length > 0;
  const shouldShowResolution =
    showResolution && availableResolutions.length > 0;

  const handleModelChange = (modelId: string) => {
    const nextResolutions = getModelSupportedResolutions(modelId, provider);
    const nextResolution = nextResolutions.includes(selectedResolution)
      ? selectedResolution
      : nextResolutions[0] || selectedResolution;
    const nextDurations = getModelSupportedDurations(
      modelId,
      provider,
      nextResolution
    );
    onModelChange(modelId);
    if (
      onResolutionChange &&
      nextResolutions.length > 0 &&
      nextResolution !== selectedResolution
    ) {
      onResolutionChange(nextResolution);
    }
    if (
      onDurationChange &&
      nextDurations.length > 0 &&
      !nextDurations.includes(selectedDuration)
    ) {
      onDurationChange(nextDurations[0]);
    }
  };

  const handleResolutionChange = (nextResolution: string) => {
    onResolutionChange?.(nextResolution);
    const nextDurations = getModelSupportedDurations(
      selectedModelId,
      provider,
      nextResolution
    );
    if (
      onDurationChange &&
      nextDurations.length > 0 &&
      !nextDurations.includes(selectedDuration)
    ) {
      onDurationChange(nextDurations[0]);
    }
  };

  // 动态同步所选模型支持的分辨率与时长
  React.useEffect(() => {
    if (availableResolutions.length > 0 && onResolutionChange) {
      if (!availableResolutions.includes(selectedResolution)) {
        onResolutionChange(availableResolutions[0]);
      }
    }
  }, [
    selectedModelId,
    availableResolutions,
    selectedResolution,
    onResolutionChange,
  ]);

  React.useEffect(() => {
    if (availableDurations.length > 0 && onDurationChange) {
      if (!availableDurations.includes(selectedDuration)) {
        onDurationChange(availableDurations[0]);
      }
    }
  }, [selectedModelId, availableDurations, selectedDuration, onDurationChange]);

  const calculatedCredits = calculateCredits(
    selectedModelId || currentModel?.id || '',
    currentModel?.type || 'image',
    { duration: selectedDuration, resolution: selectedResolution }
  );
  const displayCredits = credits ?? calculatedCredits;
  const isButtonDisabled = disabled || isGenerating;
  const resolvedGenerateLabel = generateLabel ?? m['stp.common.generate']();

  return (
    <TooltipProvider>
      <div className="border-border/60 flex flex-col gap-3 border-t pt-3.5 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between dark:border-white/10">
        {/* Parameter Controls */}
        <div className="flex flex-row flex-wrap items-center gap-2.5">
          {/* Model Selector */}
          {models.length > 0 && (
            <ModelSelect
              models={models}
              value={selectedModelId}
              onChange={handleModelChange}
            />
          )}

          {/* Aspect Ratio Selector */}
          {showRatio && onRatioChange && (
            <RatioSelect value={selectedRatio} onChange={onRatioChange} />
          )}

          {/* Video Duration Selector */}
          {shouldShowDuration && onDurationChange && (
            <Select
              value={selectedDuration}
              onValueChange={(val) => val && onDurationChange(val)}
            >
              <SelectTrigger className="bg-muted/50 border-border/80 hover:border-primary/40 flex h-10 min-w-[85px] items-center justify-between gap-2 rounded-xl px-3 text-xs font-medium transition-colors dark:border-white/15 dark:bg-white/[0.05] dark:hover:border-white/30 dark:hover:bg-white/[0.08]">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Clock className="text-muted-foreground size-3.5 shrink-0 dark:text-white/60" />
                  <span className="text-foreground text-xs font-semibold dark:text-white">
                    {selectedDuration}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="min-w-[100px] rounded-xl p-1.5">
                {availableDurations.map((d) => (
                  <SelectItem
                    key={d}
                    value={d}
                    className="rounded-lg px-2.5 py-1.5"
                  >
                    <div className="flex w-full items-center gap-2">
                      <Clock className="text-muted-foreground size-3.5" />
                      <span className="text-foreground text-xs font-medium">
                        {d}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Video Resolution Selector */}
          {shouldShowResolution && onResolutionChange && (
            <Select
              value={selectedResolution}
              onValueChange={(val) => val && handleResolutionChange(val)}
            >
              <SelectTrigger className="bg-muted/50 border-border/80 hover:border-primary/40 flex h-10 min-w-[95px] items-center justify-between gap-2 rounded-xl px-3 text-xs font-medium transition-colors dark:border-white/15 dark:bg-white/[0.05] dark:hover:border-white/30 dark:hover:bg-white/[0.08]">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Monitor className="text-muted-foreground size-3.5 shrink-0 dark:text-white/60" />
                  <span className="text-foreground text-xs font-semibold dark:text-white">
                    {selectedResolution}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="min-w-[110px] rounded-xl p-1.5">
                {availableResolutions.map((res) => (
                  <SelectItem
                    key={res}
                    value={res}
                    className="rounded-lg px-2.5 py-1.5"
                  >
                    <div className="flex w-full items-center gap-2">
                      <Monitor className="text-muted-foreground size-3.5" />
                      <span className="text-foreground text-xs font-medium">
                        {res}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Public Visibility Switch with Tooltip */}
          <div className="border-border/80 bg-muted/50 flex h-10 items-center gap-2.5 rounded-xl border px-3 dark:border-white/15 dark:bg-white/[0.05]">
            <div className="text-muted-foreground flex items-center gap-1 text-xs font-medium dark:text-white/70">
              <span>{m['stp.common.public_visibility']()}</span>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="text-muted-foreground/70 hover:text-foreground cursor-help p-0.5 dark:text-white/50 dark:hover:text-white"
                  aria-label="Visibility info"
                >
                  <HelpCircle className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs p-2.5 text-center text-xs"
                >
                  {m['stp.common.public_visibility_tooltip']()}
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              checked={publicVisibility}
              onCheckedChange={(checked) => onVisibilityChange(checked)}
            />
          </div>
        </div>

        {/* Credits & Action Button */}
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <span className="text-muted-foreground font-mono text-xs font-semibold">
            {displayCredits} {m['stp.common.credits']()}
          </span>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isButtonDisabled}
            className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-xs font-bold whitespace-nowrap transition-all duration-200 outline-none sm:text-sm ${
              isButtonDisabled
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs hover:scale-[1.02] hover:shadow-md active:scale-95'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-1.5 -ml-1 size-4 animate-spin text-current" />
                <span>{m['stp.common.generating']()}</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>{resolvedGenerateLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}
