'use client';

import React from 'react';
import { Clock, Film, Image as ImageIcon, Loader2, Music } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Card, CardContent } from '@/components/ui/card';

export interface RecentGeneratingCardProps {
  generatingPrompt?: string;
  filterMediaType?: 'image' | 'video' | 'music';
}

export function RecentGeneratingCard({
  generatingPrompt = '',
  filterMediaType,
}: RecentGeneratingCardProps) {
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
            {filterMediaType === 'image' && <ImageIcon className="size-2.5" />}
            {filterMediaType === 'video' && <Film className="size-2.5" />}
            {filterMediaType === 'music' && <Music className="size-2.5" />}
            {filterMediaType || 'image'}
          </span>
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
        <div>
          <p
            className="text-foreground line-clamp-2 text-xs leading-snug font-medium break-all"
            title={generatingPrompt}
          >
            {generatingPrompt || m['stp.workspace.untitled_generation']()}
          </p>
        </div>
        <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="size-3 animate-pulse" />
            <span>{m['stp.common.generating']()}</span>
          </div>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
            In progress
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
