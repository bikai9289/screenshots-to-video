import React from 'react';
import { HelpCircle, Loader2, Paperclip, Wand2, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { ModelConfig } from '@/components/sites/shared/models';
import { ModelSelect } from '@/components/sites/shared/ModelSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
];

export interface ImageGeneratorFormProps {
  activeTab: 'text-to-image' | 'image-to-image';
  setActiveTab: (tab: 'text-to-image' | 'image-to-image') => void;
  refImagePreview: string;
  handleRemoveRefImage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestRefImage?: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  activeModels: ModelConfig[];
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  currentCredits: number;
  showAspectRatio: boolean;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  availableResolutions: string[];
  resolution: string;
  setResolution: (res: string) => void;
  publicVisibility: boolean;
  setPublicVisibility: (v: boolean) => void;
  isGenerating: boolean;
  isUploading: boolean;
  progressText: string;
  handleGenerate: () => void;
}

export function ImageGeneratorForm({
  activeTab,
  setActiveTab,
  refImagePreview,
  handleRemoveRefImage,
  fileInputRef,
  handleImageSelect,
  onRequestRefImage,
  prompt,
  setPrompt,
  activeModels,
  selectedModelId,
  setSelectedModelId,
  currentCredits,
  showAspectRatio,
  aspectRatio,
  setAspectRatio,
  availableResolutions,
  resolution,
  setResolution,
  publicVisibility,
  setPublicVisibility,
  isGenerating,
  isUploading,
  progressText,
  handleGenerate,
}: ImageGeneratorFormProps) {
  return (
    <div className="bg-card from-primary/5 border-border/80 relative flex flex-col justify-between space-y-5 rounded-3xl border bg-gradient-to-tr via-transparent to-transparent p-6 shadow-xl backdrop-blur-2xl sm:p-7 dark:border-zinc-800/60 dark:bg-zinc-900/50">
      <div className="space-y-5">
        {/* Tab Selector */}
        <div className="bg-muted/70 border-border/40 flex rounded-xl border p-1">
          <button
            type="button"
            onClick={() => setActiveTab('text-to-image')}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
              activeTab === 'text-to-image'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m['app.generator.text_to_image']()}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image-to-image')}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
              activeTab === 'image-to-image'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m['app.generator.image_to_image']()}
          </button>
        </div>

        {/* Reference Image (Image to Image) */}
        {activeTab === 'image-to-image' && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {m['app.generator.reference_image']()}
            </Label>

            {refImagePreview ? (
              <div className="border-border relative aspect-video w-full overflow-hidden rounded-xl border">
                <img
                  src={refImagePreview}
                  alt="Reference"
                  className="h-full w-full object-cover"
                />
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-[2px]">
                    <Loader2 className="size-6 animate-spin text-white" />
                    <span className="text-xs font-medium text-white">
                      {m['stp.common.uploading']?.() || 'Uploading...'}
                    </span>
                  </div>
                )}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={handleRemoveRefImage}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() =>
                  onRequestRefImage
                    ? onRequestRefImage()
                    : fileInputRef.current?.click()
                }
                className="border-border/80 hover:border-primary/50 bg-muted/20 flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors"
              >
                <Paperclip className="text-muted-foreground size-5" />
                <p className="text-foreground mt-1.5 text-xs font-medium">
                  {m['app.generator.reference_image']()}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {m['stp.common.max_size_5mb']()}
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>
        )}

        {/* Prompt Row with ModelSelect (no label) inline on the right */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label
              htmlFor="image-prompt"
              className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
            >
              {m['app.generator.prompt']()}
            </Label>
            <div className="flex items-center gap-2">
              <ModelSelect
                models={activeModels}
                value={selectedModelId}
                onChange={setSelectedModelId}
                className="h-8 min-w-[130px] sm:h-9 sm:min-w-[160px]"
              />
              <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                {currentCredits} {m['app.generator.credits']()}
              </span>
            </div>
          </div>

          <textarea
            id="image-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={m['app.generator.prompt_placeholder']()}
            rows={4}
            className="bg-muted/30 border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary/20 w-full resize-none rounded-xl border p-3.5 text-xs transition-colors focus:ring-2 focus:outline-none sm:text-sm dark:border-zinc-800 dark:bg-black/40"
          />
        </div>

        {/* Parameters (Directly below Prompt) */}
        {showAspectRatio && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {m['app.generator.aspect_ratio']()}
            </Label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  type="button"
                  onClick={() => setAspectRatio(ratio.value)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                    aspectRatio === ratio.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/80 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {availableResolutions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {m['app.generator.resolution']()}
            </Label>
            <div className="flex gap-2">
              {availableResolutions.map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setResolution(res)}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all',
                    resolution === res
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/80 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Public Visibility Control */}
        <div className="border-border/80 bg-muted/20 flex items-center justify-between rounded-xl border px-3.5 py-2.5 dark:bg-black/20">
          <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
            <span>{m['stp.common.public_visibility']()}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-help p-0.5"
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
            </TooltipProvider>
          </div>
          <Switch
            checked={publicVisibility}
            onCheckedChange={(checked) => setPublicVisibility(checked)}
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <Button
          type="button"
          disabled={isGenerating || isUploading}
          onClick={handleGenerate}
          className="h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-lg sm:h-12 sm:text-base"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin sm:size-5" />
              <span>{progressText || m['app.generator.generating']()}</span>
            </>
          ) : (
            <>
              <Wand2 className="size-4 sm:size-5" />
              <span>
                {m['app.generator.generate_image_btn']()} ({currentCredits}{' '}
                {m['app.generator.credits']()})
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
