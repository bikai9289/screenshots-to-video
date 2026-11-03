'use client';

import React from 'react';
import { createFileRoute } from '@tanstack/react-router';

import {
  TabType,
  WorkspaceRecentCreations,
} from '@/components/sites/workspace/WorkspaceRecentCreations';

interface CreationsSearch {
  tab?: string;
  type?: string;
  page?: number;
}

function normalizeTab(raw?: string | null): TabType {
  if (!raw) return 'all';
  const lower = raw.toLowerCase().trim();
  if (lower === 'video' || lower === 'videos') return 'video';
  if (lower === 'image' || lower === 'images') return 'image';
  return 'all';
}

export const Route = createFileRoute('/settings/creations')({
  validateSearch: (search: Record<string, unknown>): CreationsSearch => ({
    tab: (search.tab as string) || (search.type as string) || undefined,
    type: (search.type as string) || undefined,
    page: search.page ? Number(search.page) : undefined,
  }),
  component: SettingsCreationsPage,
});

/**
 * 个人中心 - 历史创作资产管理页面 (/settings/creations)
 * 复用 WorkspaceRecentCreations 组件，统一全站作品卡片展示与管理
 */
function SettingsCreationsPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const activeTab: TabType = normalizeTab(search.tab || search.type);
  const page = Math.max(1, Number(search.page) || 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <WorkspaceRecentCreations
        isSettingsPage
        initialTab={activeTab}
        page={page}
        onTabChange={(nextTab) => {
          navigate({
            search: (prev) => ({
              ...prev,
              tab: nextTab === 'all' ? undefined : nextTab,
              type: undefined,
              page: undefined,
            }),
            replace: true,
          });
        }}
        onPageChange={(nextPage) => {
          navigate({
            search: (prev) => ({
              ...prev,
              page: nextPage <= 1 ? undefined : nextPage,
            }),
            replace: true,
          });
        }}
      />
    </div>
  );
}
