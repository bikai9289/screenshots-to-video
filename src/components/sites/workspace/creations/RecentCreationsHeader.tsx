'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export type TabType = 'all' | 'video' | 'image' | 'music';

export interface RecentCreationsHeaderProps {
  isSettingsPage?: boolean;
  filterMediaType?: 'image' | 'video' | 'music';
  activeTab: TabType;
  mounted: boolean;
  hasUser: boolean;
  onTabClick: (tab: TabType) => void;
}

export function RecentCreationsHeader({
  isSettingsPage = false,
  filterMediaType,
  activeTab,
  mounted,
  hasUser,
  onTabClick,
}: RecentCreationsHeaderProps) {
  const currentTabParam = filterMediaType || activeTab;

  if (isSettingsPage) {
    return (
      <>
        {/* Settings Page Header */}
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
            {m['settings.creations.title']()}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {m['settings.creations.description']()}
          </p>
        </div>

        {/* Settings Page Tab Bar */}
        <div className="border-border/80 flex items-center gap-2 border-b pb-px">
          {[
            { key: 'all', label: m['settings.creations.tab_all']() },
            { key: 'video', label: m['settings.creations.tab_videos']() },
            { key: 'image', label: m['settings.creations.tab_images']() },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabClick(tab.key as TabType)}
              className={`relative cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        {filterMediaType && <Sparkles className="text-primary size-4" />}
        <div>
          <h2 className="text-foreground text-lg font-bold tracking-tight md:text-xl">
            {m['stp.workspace.recent_creations']()}
          </h2>
          {!filterMediaType && (
            <p className="text-muted-foreground text-xs">
              {m['stp.workspace.recent_creations_desc']()}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!filterMediaType && (
          <div className="border-border/80 bg-muted/40 flex items-center rounded-xl border p-0.5">
            {[
              { key: 'all', label: m['stp.workspace.tab_all']() },
              { key: 'image', label: m['stp.workspace.tab_images']() },
              { key: 'video', label: m['stp.workspace.tab_videos']() },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabClick(tab.key as TabType)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3 ${
                  activeTab === tab.key
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {mounted && hasUser && (
          <Link
            href={
              currentTabParam === 'all'
                ? '/settings/creations'
                : `/settings/creations?tab=${currentTabParam}`
            }
            className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
          >
            {m['stp.workspace.view_all']()} &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
