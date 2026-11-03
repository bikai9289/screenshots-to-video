import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Image as ImageIcon, RotateCcw, Video } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { DownloadButton } from '@/components/download-button';
import { Button, buttonVariants } from '@/components/ui/button';

export interface ImageGeneratorPreviewProps {
  isGenerating: boolean;
  progressText: string;
  generatedImageUrl: string | null;
  imageLoadError: boolean;
  setImageLoadError: (error: boolean) => void;
  prompt: string;
  onReset: () => void;
}

export function ImageGeneratorPreview({
  isGenerating,
  progressText,
  generatedImageUrl,
  imageLoadError,
  setImageLoadError,
  prompt,
  onReset,
}: ImageGeneratorPreviewProps) {
  const navigate = useNavigate();

  const handleTurnIntoVideo = () => {
    try {
      sessionStorage.setItem(
        'nanobanana_joyflix_pending_generation_draft',
        JSON.stringify({
          prompt,
          mode: 'image-to-video',
          imagePreview: generatedImageUrl,
          imageUrls: [generatedImageUrl],
          createdAt: Date.now(),
        })
      );
    } catch {}
    navigate({
      to: '/ai-video-generator',
      search: {
        prompt: undefined,
        startImageUrl: undefined,
        model: undefined,
      },
    });
  };

  return (
    <div className="bg-card border-border/80 relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-3xl sm:p-7 lg:min-h-[560px] dark:border-zinc-800/60 dark:bg-zinc-900/40">
      <div className="bg-primary/5 pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full blur-[100px]" />

      <div className="text-foreground relative z-10 mb-4 flex items-center font-serif text-xl font-extrabold">
        <div className="bg-muted mr-3 rounded-xl p-2 shadow-inner">
          <ImageIcon className="text-muted-foreground h-5 w-5" />
        </div>
        <span>{m['app.generator.image_title']()}</span>
      </div>

      <div className="relative z-10 my-auto flex flex-1 flex-col items-center justify-center">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
            <div className="relative flex size-16 items-center justify-center sm:size-20">
              <div className="border-primary/20 absolute inset-0 animate-ping rounded-full border-2" />
              <div className="border-primary size-10 animate-spin rounded-full border-4 border-t-transparent sm:size-12" />
            </div>
            <div>
              <h3 className="text-foreground text-base font-bold sm:text-lg">
                {m['app.generator.generating']()}
              </h3>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {progressText}
              </p>
            </div>
          </div>
        ) : generatedImageUrl && !imageLoadError ? (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="relative max-h-[480px] w-full overflow-hidden rounded-2xl bg-black/5 shadow-xl sm:max-h-[540px]">
              <img
                src={generatedImageUrl}
                alt="Generated preview"
                onError={() => setImageLoadError(true)}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-2.5 pt-2">
              <DownloadButton
                url={generatedImageUrl}
                filename="generated-image.png"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'gap-1.5 text-xs',
                })}
                iconClassName="size-3.5"
              >
                <span>{m['app.generator.download_hd']()}</span>
              </DownloadButton>

              <Button
                type="button"
                size="sm"
                onClick={handleTurnIntoVideo}
                className="gap-1.5 bg-purple-600 text-xs text-white hover:bg-purple-700"
              >
                <Video className="size-3.5" />
                <span>{m['app.generator.turn_into_video']()}</span>
              </Button>
            </div>
          </div>
        ) : generatedImageUrl && imageLoadError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-2xl shadow-inner">
              <ImageIcon className="text-destructive size-8 opacity-70" />
            </div>
            <h3 className="text-foreground mt-4 text-base font-bold sm:text-lg">
              {m['app.generator.preview_unavailable_title']()}
            </h3>
            <p className="text-muted-foreground mt-1.5 max-w-sm text-xs sm:text-sm">
              {m['app.generator.preview_unavailable_subtitle']()}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <DownloadButton
                url={generatedImageUrl}
                filename="generated-image.png"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'gap-1.5 text-xs',
                })}
                iconClassName="size-3.5"
              >
                <span>{m['app.generator.download_hd']()}</span>
              </DownloadButton>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onReset}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" />
                <span>{m['app.generator.generate_image_btn']()}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-primary/10 flex size-16 items-center justify-center rounded-2xl shadow-inner">
              <ImageIcon className="text-primary size-8 opacity-70" />
            </div>
            <h3 className="text-foreground mt-4 text-base font-bold sm:text-lg">
              {m['app.generator.image_title']()}
            </h3>
            <p className="text-muted-foreground mt-1.5 max-w-sm text-xs sm:text-sm">
              {m['app.generator.image_subtitle']()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
