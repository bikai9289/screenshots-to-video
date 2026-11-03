'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Music, Pause, PlayCircle, Sparkles, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiGet } from '@/lib/api-client';
import { copyToClipboard } from '@/lib/copy';
import { m } from '@/paraglide/messages.js';
import { LazyAudio, LazyImage, LazyVideo } from '@/components/lazy';
import {
  FEATURE_INSPIRATIONS,
  type FeatureType,
  type InspirationItem,
} from '@/components/sites/shared/inspirations-data';

export type { InspirationItem, FeatureType };

interface InspirationSectionProps {
  title?: string;
  subtitle?: string;
  feature?: FeatureType;
  items?: InspirationItem[];
  onSelectPrompt?: (prompt: string) => void;
  autoScrollTop?: boolean;
}

function getMediaTypeForFeature(feature?: FeatureType): string | undefined {
  if (!feature || feature === 'workspace') return undefined;
  if (['ai-video', 'text-to-video', 'image-to-video'].includes(feature)) {
    return 'video';
  }
  if (
    ['ai-image', 'text-to-image', 'image-to-image', 'png-maker'].includes(
      feature
    )
  ) {
    return 'image';
  }
  if (['ai-audio', 'text-to-music'].includes(feature)) {
    return 'music';
  }
  return undefined;
}

function InspirationAudioMedia({ item }: { item: InspirationItem }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const coverImage = item.image || '/imgs/blocks/block-music.jpg';

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      document.querySelectorAll('audio').forEach((a) => {
        if (a !== audioRef.current) a.pause();
      });
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  return (
    <div
      className="group relative aspect-video w-full cursor-pointer overflow-hidden bg-slate-950"
      onClick={togglePlay}
    >
      {/* Studio Cover Background with soundwave visual */}
      <img
        src={coverImage}
        alt={item.title}
        className={`h-full w-full object-cover transition-all duration-700 ${
          isPlaying
            ? 'scale-105 brightness-90 saturate-125'
            : 'brightness-75 group-hover:scale-105 group-hover:brightness-90'
        }`}
        loading="lazy"
      />

      {/* Ambient gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />

      {/* Animated Soundwave Ribbon Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center">
        <div className="flex items-end gap-1 rounded-full border border-amber-500/30 bg-black/60 px-3.5 py-1.5 backdrop-blur-md">
          {[
            35, 75, 45, 90, 60, 100, 50, 85, 40, 95, 55, 80, 30, 70, 45, 60,
          ].map((h, i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full bg-gradient-to-t from-amber-500 to-amber-300 transition-all ${
                isPlaying ? 'animate-pulse' : 'opacity-50'
              }`}
              style={{
                height: isPlaying
                  ? `${Math.max(4, Math.round(h * 0.22))}px`
                  : '4px',
                animationDelay: `${(i * 70) % 500}ms`,
                animationDuration: `${350 + (i % 4) * 120}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Center Play/Pause button */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isPlaying ? (
          <div className="flex size-12 items-center justify-center rounded-full border border-white/30 bg-black/70 text-white shadow-xl backdrop-blur-md transition-transform hover:scale-110">
            <Pause className="size-5 text-amber-300" />
          </div>
        ) : (
          <PlayCircle className="size-12 text-white/90 drop-shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:text-amber-300" />
        )}
      </div>

      {/* Model & Audio Badge */}
      <span className="absolute top-2.5 right-2.5 rounded-full border border-white/15 bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-xs">
        {item.model}
      </span>

      {/* Playing Status Indicator */}
      {isPlaying && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-black/70 px-2 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-md">
          <Volume2 className="size-3 animate-pulse" />
          <span>Playing</span>
        </div>
      )}

      {/* Audio element with preload="none" */}
      <audio
        ref={audioRef}
        src={item.audio}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </div>
  );
}

function InspirationMedia({ item }: { item: InspirationItem }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  if (item.video) {
    return (
      <div
        className="bg-muted relative aspect-video w-full overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el) {
              el.muted = true;
              el.volume = 0;
            }
          }}
          src={item.video}
          poster={
            item.image && !/\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(item.image)
              ? item.image
              : undefined
          }
          loop
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => {
            try {
              event.currentTarget.currentTime = 0.1;
            } catch {}
          }}
          suppressHydrationWarning
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-2.5 right-2.5 rounded-full border border-white/10 bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-xs">
          {item.model}
        </span>
      </div>
    );
  }

  if (item.audio || item.mediaType === 'music') {
    return <InspirationAudioMedia item={item} />;
  }

  if (item.image) {
    return (
      <div className="bg-muted relative aspect-video w-full overflow-hidden">
        <LazyImage
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          wrapperClassName="h-full w-full"
        />
        <span className="absolute top-2.5 right-2.5 rounded-full border border-white/10 bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-xs">
          {item.model}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-muted relative aspect-video w-full overflow-hidden">
      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
        <Sparkles className="size-8 opacity-40" />
      </div>
      <span className="absolute top-2.5 right-2.5 rounded-full border border-white/10 bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-xs">
        {item.model}
      </span>
    </div>
  );
}

export function InspirationSection({
  title,
  subtitle,
  feature,
  items,
  onSelectPrompt,
  autoScrollTop,
}: InspirationSectionProps) {
  const mediaType = getMediaTypeForFeature(feature);

  // 优先获取全站真实用户最新公开的生成作品
  const { data } = useQuery({
    queryKey: ['public-creations', mediaType || 'all'],
    queryFn: () =>
      apiGet<{ items: InspirationItem[] }>(
        `/api/ai/public-creations?limit=9${mediaType ? `&mediaType=${mediaType}` : ''}`
      ),
    staleTime: 60 * 1000,
  });

  const publicItems = data?.items || [];
  const fallbackItems =
    items ?? (feature ? FEATURE_INSPIRATIONS[feature] : []) ?? [];

  // 优先展示真实用户的公开作品，不足 9 个时用写死的兜底数据补齐，最多展示 9 个
  const resolvedItems = useMemo(() => {
    const list: InspirationItem[] = [...publicItems];
    for (const fb of fallbackItems) {
      if (list.length >= 9) break;
      const exists = list.some(
        (item) =>
          item.id === fb.id ||
          (fb.video && item.video === fb.video) ||
          (fb.image && item.image === fb.image)
      );
      if (!exists) {
        list.push(fb);
      }
    }
    return list;
  }, [publicItems, fallbackItems]);

  if (!resolvedItems.length) return null;

  const resolvedTitle = title ?? m['stp.common.inspiration']();
  const resolvedSubtitle = subtitle ?? m['stp.common.inspiration_desc']();

  const handleUsePrompt = async (promptText: string) => {
    await copyToClipboard(promptText);
    if (onSelectPrompt) {
      onSelectPrompt(promptText);
    } else {
      window.dispatchEvent(
        new CustomEvent('nanobanana_joyflix_select_prompt', {
          detail: promptText,
        })
      );
    }
    toast.success(m['stp.workspace.prompt_copied']());

    const isExactWorkspaceHome =
      typeof window !== 'undefined' &&
      /^\/([a-zA-Z_-]+\/)?workspace\/?$/.test(window.location.pathname);

    const shouldScroll = autoScrollTop ?? !isExactWorkspaceHome;

    if (shouldScroll) {
      const scrollableMain = document.querySelector('main.overflow-y-auto');
      if (scrollableMain) {
        scrollableMain.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-8">
      <div className="mb-6 flex flex-col justify-between md:flex-row md:items-end">
        <div>
          <h2 className="text-foreground text-2xl leading-tight font-bold md:text-3xl">
            {resolvedTitle}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {resolvedSubtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {resolvedItems.map((item) => (
          <div
            key={item.id}
            className="group bg-card/70 hover:bg-card text-card-foreground border-border/80 hover:border-primary/40 dark:hover:border-primary/50 relative flex flex-col overflow-hidden rounded-2xl border shadow-xs backdrop-blur-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/12 dark:bg-[#13151b]/80 dark:hover:bg-[#13151b]"
          >
            <InspirationMedia item={item} />

            <div className="flex flex-1 flex-col justify-between gap-3 p-4">
              <div>
                <h3 className="text-foreground line-clamp-1 text-sm font-semibold">
                  {item.title}
                </h3>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs italic">
                  &ldquo;{item.prompt}&rdquo;
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleUsePrompt(item.prompt)}
                className="text-primary hover:text-primary/80 mt-auto inline-flex cursor-pointer items-center justify-center self-start text-xs font-semibold transition-colors"
              >
                {m['stp.common.use_prompt']()}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
