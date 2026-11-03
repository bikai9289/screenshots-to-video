'use client';

import React, { useState } from 'react';
import { PlayCircle } from 'lucide-react';

import type { CreationItem } from '@/modules/creations/store';
import { LazyAudio } from '@/components/lazy';

export interface RecentMusicCardMediaProps {
  item: CreationItem;
  isClicked: boolean;
  onPlayClick: () => void;
}

export function RecentMusicCardMedia({
  item,
  isClicked,
  onPlayClick,
}: RecentMusicCardMediaProps) {
  const [isPlaying, setIsPlaying] = useState(true);

  if (isClicked) {
    return (
      <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-slate-950 p-3.5">
        <img
          src="/imgs/blocks/block-music.jpg"
          alt={item.prompt}
          className="absolute inset-0 h-full w-full object-cover brightness-90 saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

        {/* Dynamic soundwaves – animates only while audio is playing */}
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="flex items-end gap-1 rounded-full border border-amber-500/40 bg-black/60 px-4 py-2 backdrop-blur-md">
            {[
              35, 75, 45, 90, 60, 100, 50, 85, 40, 95, 55, 80, 30, 70, 45, 60,
            ].map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full bg-gradient-to-t from-amber-500 to-amber-300 transition-all duration-300 ${
                  isPlaying ? 'animate-pulse' : 'opacity-40'
                }`}
                style={{
                  height: isPlaying
                    ? `${Math.max(4, Math.round(h * 0.24))}px`
                    : '4px',
                  animationDelay: `${(i * 70) % 500}ms`,
                  animationDuration: `${300 + (i % 4) * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>

        <LazyAudio
          src={item.url}
          controls
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="relative z-10 h-7 w-full opacity-95 transition-opacity hover:opacity-100"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group/play relative h-full w-full cursor-pointer overflow-hidden bg-slate-950 text-left"
      onClick={(e) => {
        e.stopPropagation();
        onPlayClick();
      }}
      title="Play audio"
    >
      <img
        src="/imgs/blocks/block-music.jpg"
        alt={item.prompt}
        className="h-full w-full object-cover brightness-75 transition-all duration-700 group-hover/play:scale-105 group-hover/play:brightness-90"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/35" />

      {/* Soundwave equalizer ribbon preview */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center">
        <div className="flex items-end gap-1 rounded-full border border-amber-500/30 bg-black/60 px-3 py-1 backdrop-blur-md">
          {[35, 75, 45, 90, 60, 100, 50, 85, 40, 95, 55, 80, 30, 70].map(
            (h, i) => (
              <span
                key={i}
                className="w-0.5 rounded-full bg-gradient-to-t from-amber-500 to-amber-300 opacity-60 group-hover/play:animate-pulse"
                style={{
                  height: '4px',
                  animationDelay: `${(i * 70) % 500}ms`,
                  animationDuration: `${350 + (i % 4) * 120}ms`,
                }}
              />
            )
          )}
        </div>
      </div>

      {/* Center Play icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <PlayCircle className="size-12 text-white/90 drop-shadow-lg transition-transform duration-200 group-hover/play:scale-110 group-hover/play:text-amber-300" />
      </div>
    </button>
  );
}
