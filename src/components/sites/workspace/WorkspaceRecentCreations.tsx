'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import {
  CreationItem,
  getLocalCreations,
  inferCreationMode,
  pollPendingCreationTasks,
  removeLocalCreation,
  syncUserCreations,
} from '@/modules/creations/store';
import { copyToClipboard } from '@/lib/copy';
import { m } from '@/paraglide/messages.js';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { RecentCreationCard } from './creations/RecentCreationCard';
import {
  RecentCreationsEmpty,
  type TabType,
} from './creations/RecentCreationsEmpty';
import { RecentCreationsHeader } from './creations/RecentCreationsHeader';
import { RecentCreationsLightbox } from './creations/RecentCreationsLightbox';
import { RecentCreationsPagination } from './creations/RecentCreationsPagination';
import { RecentGeneratingCard } from './creations/RecentGeneratingCard';

export type { TabType };

export interface WorkspaceRecentCreationsProps {
  creations?: CreationItem[];
  onDelete?: (id: string) => void;
  allowDelete?: boolean;
  hideHeader?: boolean;
  filterMediaType?: 'image' | 'video' | 'music';
  filterMode?: string;
  isGenerating?: boolean;
  generatingPrompt?: string;
  limit?: number;
  isSettingsPage?: boolean;
  initialTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
}

/**
 * 工作台与个人中心通用的作品展示组件
 * 支持按类型筛选（视频/图片/音乐）、生成中实时卡片动画、大图 Lightbox 预览、提示词复制、分页以及删除作品
 */
export function WorkspaceRecentCreations({
  creations: propCreations,
  onDelete: propOnDelete,
  allowDelete = true,
  hideHeader = false,
  filterMediaType,
  filterMode,
  isGenerating = false,
  generatingPrompt = '',
  limit,
  isSettingsPage = false,
  initialTab = 'all',
  onTabChange,
  page: propPage = 1,
  onPageChange,
  pageSize = 12,
}: WorkspaceRecentCreationsProps) {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const [internalCreations, setInternalCreations] = useState<CreationItem[]>(
    []
  );
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<CreationItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoClickedId, setVideoClickedId] = useState<string | null>(null);
  const [audioClickedId, setAudioClickedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // If creations prop is not provided, self-manage from store and sync with database for authenticated user
  useEffect(() => {
    if (propCreations !== undefined) return;
    if (!user) {
      setInternalCreations([]);
      return;
    }
    setInternalCreations(getLocalCreations());
    pollPendingCreationTasks(filterMediaType);
    void syncUserCreations();
    const handleUpdate = () => {
      setInternalCreations(getLocalCreations());
      pollPendingCreationTasks(filterMediaType);
    };
    window.addEventListener(
      'nanobanana_joyflix_creations_updated',
      handleUpdate
    );
    return () => {
      window.removeEventListener(
        'nanobanana_joyflix_creations_updated',
        handleUpdate
      );
    };
  }, [propCreations, user, filterMediaType]);

  const creations = propCreations ?? (user ? internalCreations : []);
  const effectiveTab = filterMediaType ?? activeTab;

  const filteredCreations = creations.filter((item) => {
    const itemMode = item.mode || inferCreationMode(item);
    if (filterMode && itemMode !== filterMode) {
      return false;
    }
    if (effectiveTab === 'all') return true;
    if (effectiveTab === 'video') return item.mediaType === 'video';
    if (effectiveTab === 'image') return item.mediaType === 'image';
    if (effectiveTab === 'music') return item.mediaType === 'music';
    return true;
  });

  const total = filteredCreations.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const currentPage = Math.min(propPage, totalPages);

  const displayCreations =
    isSettingsPage || hideHeader
      ? filteredCreations.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize
        )
      : filteredCreations.slice(0, limit ?? 8);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setVideoClickedId(null);
    setAudioClickedId(null);
    onTabChange?.(tab);
  };

  const handleCopyPrompt = async (id: string, text: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    toast.success(m['stp.workspace.prompt_copied']());
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (propOnDelete) {
      propOnDelete(id);
    } else {
      removeLocalCreation(id);
      toast.success(m['stp.workspace.deleted_success']());
    }
  };

  return (
    <div
      id="recent-creations"
      data-section="recent-creations"
      className={isSettingsPage ? 'space-y-6' : 'space-y-4 pt-4'}
    >
      {/* Header & Tabs */}
      {!hideHeader && (
        <RecentCreationsHeader
          isSettingsPage={isSettingsPage}
          filterMediaType={filterMediaType}
          activeTab={activeTab}
          mounted={mounted}
          hasUser={Boolean(user)}
          onTabClick={handleTabClick}
        />
      )}

      {/* Creations Grid or Empty State */}
      {!isGenerating && displayCreations.length === 0 ? (
        <RecentCreationsEmpty
          isSettingsPage={isSettingsPage}
          filterMediaType={filterMediaType}
          activeTab={activeTab}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {/* Generating placeholder card (API in-flight, no processing item in list yet) */}
          {isGenerating &&
            !displayCreations.some(
              (c) =>
                c.status === 'processing' ||
                c.status === 'pending' ||
                (!c.status && !c.url)
            ) && (
              <RecentGeneratingCard
                generatingPrompt={generatingPrompt}
                filterMediaType={filterMediaType}
              />
            )}

          {/* Creation Cards */}
          {displayCreations.map((item) => (
            <RecentCreationCard
              key={item.id}
              item={item}
              copiedId={copiedId}
              videoClickedId={videoClickedId}
              audioClickedId={audioClickedId}
              onCopyPrompt={handleCopyPrompt}
              onOpenLightbox={setLightboxItem}
              onPlayVideo={setVideoClickedId}
              onPlayAudio={setAudioClickedId}
              onRequestDelete={allowDelete ? setDeletingId : undefined}
              allowDelete={allowDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls for Settings / Showcase Page */}
      {(isSettingsPage || hideHeader) && total > pageSize && (
        <RecentCreationsPagination
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title={m['stp.workspace.delete']()}
        description={m['stp.workspace.confirm_delete_desc']()}
        confirmText={m['stp.workspace.delete']()}
        cancelText={m['stp.common.cancel']()}
        variant="destructive"
        onConfirm={() => {
          if (deletingId) {
            handleDelete(deletingId);
            setDeletingId(null);
          }
        }}
      />

      {/* Lightbox Modal */}
      <RecentCreationsLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />
    </div>
  );
}
