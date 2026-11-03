'use client';

import React from 'react';
import {
  Check,
  CircleAlert,
  Clock,
  Copy,
  Film,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Music,
  Trash2,
} from 'lucide-react';

import { formatDateTime, type CreationItem } from '@/modules/creations/store';
import { m } from '@/paraglide/messages.js';
import { DownloadButton } from '@/components/download-button';
import { LazyImage } from '@/components/lazy';
import { Card, CardContent } from '@/components/ui/card';

import { formatLocalizedErrorMessage } from '../../creation/generation-errors';
import { RecentMusicCardMedia } from './RecentMusicCardMedia';
import { RecentVideoCardMedia } from './RecentVideoCardMedia';

export interface RecentCreationCardProps {
  item: CreationItem;
  copiedId: string | null;
  videoClickedId: string | null;
  audioClickedId: string | null;
  onCopyPrompt: (id: string, text: string) => void;
  onOpenLightbox: (item: CreationItem) => void;
  onPlayVideo: (id: string) => void;
  onPlayAudio: (id: string) => void;
  onRequestDelete?: (id: string) => void;
  allowDelete?: boolean;
}

export function RecentCreationCard({
  item,
  copiedId,
  videoClickedId,
  audioClickedId,
  onCopyPrompt,
  onOpenLightbox,
  onPlayVideo,
  onPlayAudio,
  onRequestDelete,
  allowDelete = true,
}: RecentCreationCardProps) {
  const isItemProcessing =
    item.status === 'processing' ||
    item.status === 'pending' ||
    (!item.status && !item.url);

  if (item.status === 'failed') {
    return (
      <div className="group border-border/75 bg-card hover:border-destructive/40 relative flex flex-col justify-between overflow-hidden rounded-2xl border shadow-2xs backdrop-blur-xs transition-all duration-300 hover:shadow-lg">
        {/* Media Preview Area */}
        <div
          data-slot="card-media"
          className="border-border/60 from-destructive/5 via-destructive/8 to-destructive/12 dark:from-destructive/10 dark:via-destructive/15 dark:to-destructive/20 relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden border-b bg-gradient-to-b px-4 py-3 text-center"
        >
          {/* Media Type / Status Badge (Top-Left) */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 z-10">
            <span className="border-destructive/25 bg-destructive/15 text-destructive flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-md">
              <CircleAlert className="size-2.5" />
              {m['stp.common.generation_failed']()}
            </span>
          </div>

          {/* Hover-to-Reveal Actions Bar (Top-Right Overlay) */}
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {/* Copy Prompt */}
            {onCopyPrompt && item.prompt && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyPrompt(item.id, item.prompt);
                }}
                className="border-border/60 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-full border shadow-xs backdrop-blur-md transition-all hover:scale-105"
                title={m['stp.common.copy_prompt']()}
              >
                {copiedId === item.id ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            )}

            {/* Delete Button */}
            {allowDelete && onRequestDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(item.id);
                }}
                className="border-border/60 bg-background/80 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive flex size-7 cursor-pointer items-center justify-center rounded-full border shadow-xs backdrop-blur-md transition-all hover:scale-105"
                title={m['stp.workspace.delete']()}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          {/* Center Error Content: Compact & Proportionate */}
          <div className="flex max-w-[88%] flex-col items-center justify-center gap-1.5">
            <div className="border-destructive/25 bg-destructive/15 text-destructive flex size-9 items-center justify-center rounded-full border shadow-xs">
              <CircleAlert className="size-4.5" />
            </div>
            <p className="text-foreground/90 text-xs font-semibold tracking-tight">
              {m['stp.common.generation_failed']()}
            </p>
            {item.errorCode && (
              <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                {formatLocalizedErrorMessage(item.errorCode)}
              </p>
            )}
          </div>
        </div>

        {/* Card Body: Prompt & Meta */}
        <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
          <div>
            <p
              className="text-foreground/90 group-hover:text-destructive line-clamp-2 text-xs leading-relaxed font-medium break-all transition-colors"
              title={item.prompt}
            >
              {item.prompt || m['stp.workspace.untitled_generation']()}
            </p>
          </div>

          <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="size-3" />
              <span>{formatDateTime(item.createdAt)}</span>
            </div>
            {allowDelete && onRequestDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(item.id);
                }}
                className="text-muted-foreground hover:text-destructive flex size-6 items-center justify-center rounded-full transition-colors group-hover:opacity-0"
                title={m['stp.workspace.delete']()}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isItemProcessing) {
    return (
      <Card className="border-border/70 bg-card/80 flex flex-col justify-between overflow-hidden rounded-2xl border shadow-xs">
        <div
          data-slot="card-media"
          className="dark:bg-muted/20 relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden bg-black/5"
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="text-primary size-6 animate-spin" />
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
              {m['stp.common.generating']()}...
            </span>
          </div>
          <div className="absolute top-2.5 left-2.5">
            <span className="flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-md">
              {item.mediaType === 'image' && <ImageIcon className="size-2.5" />}
              {item.mediaType === 'video' && <Film className="size-2.5" />}
              {item.mediaType === 'music' && <Music className="size-2.5" />}
              {item.mediaType}
            </span>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
          <div>
            <p
              className="text-foreground line-clamp-2 text-xs leading-snug font-medium break-all"
              title={item.prompt}
            >
              {item.prompt || m['stp.workspace.untitled_generation']()}
            </p>
          </div>

          <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="size-3 animate-pulse" />
              <span>{m['stp.common.generating']()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                In progress
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="group border-border/75 bg-card hover:border-primary/40 hover:shadow-primary/5 relative flex flex-col justify-between overflow-hidden rounded-2xl border shadow-2xs backdrop-blur-xs transition-all duration-300 hover:shadow-lg">
      {/* Media Preview Area */}
      <div
        data-slot="card-media"
        className={`relative aspect-video w-full overflow-hidden bg-black/5 dark:bg-black/20 ${
          item.mediaType === 'image' ? 'cursor-pointer' : ''
        }`}
        onClick={() => {
          if (item.mediaType === 'image' && item.url) {
            onOpenLightbox(item);
          }
        }}
      >
        {/* 1. Image Type */}
        {item.mediaType === 'image' && (
          <LazyImage
            src={item.url}
            alt={item.prompt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            wrapperClassName="h-full w-full"
          />
        )}

        {/* 2. Video Type – thumbnail cover with play/pause overlay */}
        {item.mediaType === 'video' && (
          <RecentVideoCardMedia
            item={item}
            isClicked={videoClickedId === item.id}
            onPlayClick={() => onPlayVideo(item.id)}
          />
        )}

        {/* 3. Music Type – click to load & play with dynamic soundwave cover */}
        {item.mediaType === 'music' && (
          <RecentMusicCardMedia
            item={item}
            isClicked={audioClickedId === item.id}
            onPlayClick={() => onPlayAudio(item.id)}
          />
        )}

        {/* Media Type Badge (Top-Left) */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-10">
          <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-md">
            {item.mediaType === 'image' && <ImageIcon className="size-2.5" />}
            {item.mediaType === 'video' && <Film className="size-2.5" />}
            {item.mediaType === 'music' && <Music className="size-2.5" />}
            {item.mediaType}
          </span>
        </div>

        {/* Hover-to-Reveal Actions Bar (Top-Right Overlay) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {/* Copy Prompt */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyPrompt(item.id, item.prompt);
            }}
            className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 hover:text-white"
            title={m['stp.common.copy_prompt']()}
          >
            {copiedId === item.id ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>

          {/* Fullscreen zoom for Image */}
          {item.mediaType === 'image' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox(item);
              }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 hover:text-white"
              title={m['stp.common.fullscreen']()}
            >
              <Maximize2 className="size-3.5" />
            </button>
          )}

          {/* Download Button */}
          <div onClick={(e) => e.stopPropagation()}>
            <DownloadButton
              item={item}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 hover:text-white"
              iconClassName="size-3.5 text-white/90"
              title={m['stp.workspace.download']()}
            />
          </div>

          {/* Delete Button */}
          {allowDelete && onRequestDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(item.id);
              }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-red-500/80 hover:text-white"
              title={m['stp.workspace.delete']()}
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Card Body: Prompt & Meta */}
      <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
        <div>
          <p
            className="text-foreground/90 group-hover:text-primary line-clamp-2 text-xs leading-relaxed font-medium break-all transition-colors"
            title={item.prompt}
          >
            {item.prompt || m['stp.workspace.untitled_generation']()}
          </p>
        </div>

        <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="size-3" />
            <span>{formatDateTime(item.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
