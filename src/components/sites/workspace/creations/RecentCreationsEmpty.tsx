'use client';

import React from 'react';
import { Plus, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export type TabType = 'all' | 'video' | 'image' | 'music';

export interface RecentCreationsEmptyProps {
  isSettingsPage?: boolean;
  filterMediaType?: 'image' | 'video' | 'music';
  activeTab: TabType;
}

export function RecentCreationsEmpty({
  isSettingsPage = false,
  filterMediaType,
  activeTab,
}: RecentCreationsEmptyProps) {
  const effectiveTab = filterMediaType ?? activeTab;

  const getCreateHref = (tab: TabType) => {
    switch (tab) {
      case 'video':
        return '/workspace/ai-video';
      case 'image':
        return '/workspace/ai-image';
      default:
        return '/workspace';
    }
  };

  const getCreateButtonText = (tab: TabType) => {
    if (isSettingsPage) {
      return m['settings.creations.create_now']();
    }
    switch (tab) {
      case 'video':
        return m['stp.workspace.create_video']();
      case 'image':
        return m['stp.workspace.create_image']();
      default:
        return m['stp.workspace.create_now']();
    }
  };

  return (
    <div className="border-border/70 bg-card/40 flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center sm:p-10 md:p-14">
      <div className="bg-muted text-muted-foreground border-border/70 mb-3 flex size-12 items-center justify-center rounded-full border">
        <Sparkles className="size-6" />
      </div>
      <h3 className="text-foreground text-sm font-semibold">
        {isSettingsPage
          ? m['settings.creations.empty']()
          : m['stp.workspace.no_creations_title']()}
      </h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-xs">
        {isSettingsPage ? '' : m['stp.workspace.no_creations_desc']()}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          href={getCreateHref(effectiveTab)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-xs transition-all hover:scale-[1.03] active:scale-100"
        >
          <Plus className="size-3.5" />
          {getCreateButtonText(effectiveTab)}
        </Link>
      </div>
    </div>
  );
}
