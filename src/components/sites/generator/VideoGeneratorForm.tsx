import {
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Wand2,
  X,
} from 'lucide-react';

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

export const VIDEO_ASPECT_RATIOS = [
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '1:1', value: '1:1' },
];

export interface VideoGeneratorFormProps {
  activeTab: 'text-to-video' | 'image-to-video';
  setActiveTab: (tab: 'text-to-video' | 'image-to-video') => void;
  handleRemoveStartImage: () => void;
  startImagePreview: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestStartImage?: () => void;
  endImagePreview?: string;
  endFileInputRef?: React.RefObject<HTMLInputElement | null>;
  handleEndImageSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveEndImage?: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  activeModels: ModelConfig[];
  supportsFirstLastFrame?: boolean;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  currentCredits: number;
  availableDurations: string[];
  duration: string;
  setDuration: (d: string) => void;
  availableResolutions: string[];
  resolution: string;
  setResolution: (r: string) => void;
  showAspectRatio: boolean;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  publicVisibility: boolean;
  setPublicVisibility: (v: boolean) => void;
  isGenerating: boolean;
  isUploading: boolean;
  progressText: string;
  handleGenerate: () => void;
}

export function VideoGeneratorForm({
  activeTab,
  setActiveTab,
  handleRemoveStartImage,
  startImagePreview,
  fileInputRef,
  handleImageSelect,
  onRequestStartImage,
  endImagePreview,
  endFileInputRef,
  handleEndImageSelect,
  handleRemoveEndImage,
  prompt,
  setPrompt,
  activeModels,
  supportsFirstLastFrame,
  selectedModelId,
  setSelectedModelId,
  currentCredits,
  availableDurations,
  duration,
  setDuration,
  availableResolutions,
  resolution,
  setResolution,
  showAspectRatio,
  aspectRatio,
  setAspectRatio,
  publicVisibility,
  setPublicVisibility,
  isGenerating,
  isUploading,
  progressText,
  handleGenerate,
}: VideoGeneratorFormProps) {
  return (
    <div className="bg-card from-primary/5 border-border/80 relative flex flex-col justify-between space-y-5 rounded-3xl border bg-gradient-to-tr via-transparent to-transparent p-6 shadow-xl backdrop-blur-2xl sm:p-7 dark:border-zinc-800/60 dark:bg-zinc-900/50">
      <div className="space-y-5">
        {/* Tab Selector */}
        <div className="bg-muted/70 border-border/40 flex rounded-xl border p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('text-to-video');
              handleRemoveStartImage();
            }}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
              activeTab === 'text-to-video'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m['stp.nav.text_to_video']()}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image-to-video')}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
              activeTab === 'image-to-video'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m['stp.nav.image_to_video']()}
          </button>
        </div>

        {/* Reference / Start Image (Image to Video) */}
        {activeTab === 'image-to-video' && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {supportsFirstLastFrame
                ? `${m['app.generator.reference_image']()} (首帧/尾帧)`
                : m['app.generator.reference_image']()}
            </Label>

            <div className="grid grid-cols-2 gap-3">
              {startImagePreview ? (
                <div className="border-border relative aspect-video min-h-0 w-full overflow-hidden rounded-xl border">
                  <img
                    src={startImagePreview}
                    alt={m['app.generator.start_frame_alt']()}
                    className="h-full w-full object-cover"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 backdrop-blur-[2px]">
                      <Loader2 className="size-5 animate-spin text-white sm:size-6" />
                      <span className="text-xs font-medium text-white">
                        {m['stp.common.uploading']?.() || 'Uploading...'}
                      </span>
                    </div>
                  )}
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={handleRemoveStartImage}
                      aria-label={m['app.generator.remove_reference_image']()}
                      className="hover:bg-destructive absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/75 text-white shadow-md transition-all hover:scale-110"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() =>
                    onRequestStartImage
                      ? onRequestStartImage()
                      : fileInputRef.current?.click()
                  }
                  className="border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/30 group box-border flex aspect-video min-h-0 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-2 text-center transition-colors sm:p-3"
                >
                  <ImageIcon className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-transform group-hover:scale-110 sm:size-5" />
                  <p className="text-foreground/90 group-hover:text-primary mt-1 max-w-full truncate text-[11px] leading-tight font-medium transition-colors sm:text-xs">
                    {supportsFirstLastFrame
                      ? m['stp.common.first_frame_badge']()
                      : m['app.generator.reference_image']()}
                  </p>
                  <p className="text-muted-foreground/75 mt-0.5 max-w-full truncate text-[9px] leading-tight sm:text-[10px]">
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
              {supportsFirstLastFrame && (
                <>
                  {endImagePreview ? (
                    <div className="border-border relative aspect-video min-h-0 w-full overflow-hidden rounded-xl border">
                      <img
                        src={endImagePreview}
                        alt="End frame"
                        className="h-full w-full object-cover"
                      />
                      {handleRemoveEndImage && (
                        <button
                          type="button"
                          onClick={handleRemoveEndImage}
                          aria-label={
                            m['stp.common.remove_image']?.() || 'Remove image'
                          }
                          className="hover:bg-destructive absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/75 text-white shadow-md transition-all hover:scale-110"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => endFileInputRef?.current?.click()}
                      className="border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/30 group box-border flex aspect-video min-h-0 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-2 text-center transition-colors sm:p-3"
                    >
                      <ImageIcon className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-transform group-hover:scale-110 sm:size-5" />
                      <p className="text-foreground/90 group-hover:text-primary mt-1 max-w-full truncate text-[11px] leading-tight font-medium transition-colors sm:text-xs">
                        {m['stp.common.last_frame_badge']()}
                      </p>
                      <p className="text-muted-foreground/75 mt-0.5 max-w-full truncate text-[9px] leading-tight sm:text-[10px]">
                        {m['stp.common.max_size_5mb']()}
                      </p>
                    </div>
                  )}
                  <input
                    ref={endFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEndImageSelect}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Prompt Row with ModelSelect (no label) inline on the right */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label
              htmlFor="video-prompt"
              className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
            >
              {m['app.generator.prompt']()}
            </Label>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <ModelSelect
                models={activeModels}
                value={selectedModelId}
                onChange={setSelectedModelId}
                className="h-8 min-w-0 flex-1 sm:h-9 sm:min-w-[160px]"
              />
              <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                {currentCredits} {m['app.generator.credits']()}
              </span>
            </div>
          </div>

          <textarea
            id="video-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={m['app.generator.prompt_placeholder']()}
            rows={4}
            className="bg-muted/30 border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary/20 w-full resize-none rounded-xl border p-3.5 text-xs transition-colors focus:ring-2 focus:outline-none sm:text-sm dark:border-zinc-800 dark:bg-black/40"
          />
        </div>

        {/* Parameters (Directly below Prompt) */}
        {/* Duration Control */}
        {availableDurations.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {m['app.generator.duration']()}
            </Label>
            <div className="flex gap-2">
              {availableDurations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all',
                    duration === d
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/80 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resolution Control */}
        {availableResolutions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {m['app.generator.resolution']()}
            </Label>
            <div className="flex gap-2">
              {availableResolutions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResolution(r)}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all',
                    resolution === r
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/80 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aspect Ratio Control */}
        {showAspectRatio && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {m['app.generator.aspect_ratio']()}
            </Label>
            <div className="flex flex-wrap gap-2">
              {VIDEO_ASPECT_RATIOS.map((ratio) => (
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

        {/* Public Visibility Control */}
        <div className="border-border/80 bg-muted/20 flex items-center justify-between rounded-xl border px-3.5 py-2.5 dark:bg-black/20">
          <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
            <span>{m['stp.common.public_visibility']()}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-help p-0.5"
                  aria-label={m['app.generator.visibility_info']()}
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
                {m['app.generator.generate_video_btn']()} ({currentCredits}{' '}
                {m['app.generator.credits']()})
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
