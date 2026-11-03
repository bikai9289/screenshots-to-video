'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, PlayCircle } from 'lucide-react';

import type { CreationItem } from '@/modules/creations/store';
import { cn } from '@/lib/utils';

export interface RecentVideoCardMediaProps {
  item: CreationItem;
  isClicked: boolean;
  onPlayClick: () => void;
}

export function RecentVideoCardMedia({
  item,
  isClicked,
  onPlayClick,
}: RecentVideoCardMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);

  const isMockCover =
    item.thumbnailUrl?.includes('text-to-video-ai-cover.webp') &&
    item.url &&
    !item.url.includes('mock');

  const rawCover =
    (!isMockCover ? item.thumbnailUrl : '') ||
    (/\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(item.url || '') ? item.url : '') ||
    '/imgs/blocks/block-video.jpg';
  const coverIsVideo =
    !videoLoadError && /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(rawCover);
  const coverImage =
    coverIsVideo && !rawCover.includes('#') ? `${rawCover}#t=0.001` : rawCover;

  useEffect(() => {
    if (!isClicked || !videoRef.current) return;
    videoRef.current.play().catch(() => {});
  }, [isClicked]);

  if (!isClicked) {
    return (
      <button
        type="button"
        className="group/play bg-muted relative h-full w-full cursor-pointer overflow-hidden text-left"
        onClick={(event) => {
          event.stopPropagation();
          onPlayClick();
        }}
        aria-label="Play video"
      >
        {coverIsVideo ? (
          <video
            src={coverImage}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(event) => {
              try {
                event.currentTarget.currentTime = 0.1;
              } catch {}
            }}
            onError={() => {
              setVideoLoadError(true);
            }}
            className="h-full w-full object-cover transition-all duration-500 group-hover/play:scale-105"
          />
        ) : (
          <img
            src={videoLoadError ? '/imgs/blocks/block-video.jpg' : coverImage}
            alt={item.prompt}
            className="h-full w-full object-cover transition-all duration-500 group-hover/play:scale-105"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-black/25 transition-colors group-hover/play:bg-black/15" />
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle className="size-12 text-white/90 drop-shadow-lg transition-transform duration-200 group-hover/play:scale-110 group-hover/play:text-white" />
        </div>
      </button>
    );
  }

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return (
    <div className="group/play relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={item.url}
        poster={item.thumbnailUrl}
        preload="metadata"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={togglePlayback}
        className={cn(
          'absolute inset-0 flex cursor-pointer items-center justify-center bg-transparent transition-all duration-300 focus-visible:outline-hidden',
          isPlaying ? 'hover:bg-black/20' : 'bg-black/10'
        )}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
      >
        <span
          className={cn(
            'flex size-12 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white shadow-xl backdrop-blur-md transition-all duration-200',
            isPlaying
              ? 'opacity-0 group-hover/play:scale-105 group-hover/play:opacity-100'
              : 'scale-100 opacity-100 hover:scale-110'
          )}
        >
          {isPlaying ? (
            <Pause className="size-5 text-white" />
          ) : (
            <Play className="size-5 translate-x-0.5 fill-current" />
          )}
        </span>
      </button>
    </div>
  );
}
