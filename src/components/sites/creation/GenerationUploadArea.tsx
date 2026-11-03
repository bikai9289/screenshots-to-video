'use client';

import React, { useRef, useState } from 'react';
import { Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface UploadingItem {
  id: string;
  localUrl: string;
  slotIndex?: number;
}

export interface GenerationUploadAreaProps {
  images: string[];
  uploadingItems?: UploadingItem[];
  maxImages?: number;
  disabled?: boolean;
  isFirstLastFrameMode?: boolean;
  isImageRequired?: boolean;
  onUploadClick?: (e: React.MouseEvent<HTMLElement>) => void;
  onFilesSelected: (files: File[]) => void;
  onReplaceFile: (index: number, file: File) => void;
  onRemoveImage: (index: number) => void;
}

interface UploadSlotCardProps {
  badgeText?: string;
  labelText: string;
  subLabelText?: string;
  url?: string;
  uploadingItem?: UploadingItem;
  disabled?: boolean;
  isGlobalUploading?: boolean;
  onFileSelected: (file: File) => void;
  onRemove?: () => void;
  onTriggerClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

function UploadSlotCard({
  badgeText,
  labelText,
  subLabelText,
  url,
  uploadingItem,
  disabled = false,
  isGlobalUploading = false,
  onFileSelected,
  onRemove,
  onTriggerClick,
}: UploadSlotCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled || isGlobalUploading || uploadingItem) return;
    if (onTriggerClick) {
      onTriggerClick(e);
      if (e.isDefaultPrevented()) return;
    }
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
    e.target.value = '';
  };

  // 1. 上传中状态：展示本地预览图与加载动画
  if (uploadingItem) {
    return (
      <div
        className="border-primary/50 bg-muted/40 relative flex h-24 w-28 cursor-wait overflow-hidden rounded-2xl border-2 border-dashed transition-all"
        title={m['stp.common.image_uploading_wait']()}
      >
        {uploadingItem.localUrl && (
          <img
            src={uploadingItem.localUrl}
            alt="Uploading preview"
            className="absolute inset-0 h-full w-full object-cover opacity-40 blur-xs"
          />
        )}
        {badgeText && (
          <span className="absolute top-1.5 left-1.5 z-10 rounded-md border border-white/10 bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-xs">
            {badgeText}
          </span>
        )}
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-1.5 p-1 text-center select-none">
          <Loader2 className="text-primary size-5 animate-spin" />
          <span className="text-foreground text-[10px] font-semibold">
            {m['stp.common.uploading']()}
          </span>
        </div>
      </div>
    );
  }

  // 2. 已上传图片状态：展示图片、替换浮层与删除按钮
  if (url) {
    return (
      <div
        onClick={handleCardClick}
        className="border-border/80 bg-muted/40 group hover:border-primary/60 relative flex h-24 w-28 cursor-pointer overflow-hidden rounded-2xl border-2 shadow-2xs transition-all hover:shadow-md"
        title={m['stp.common.click_to_replace']()}
      >
        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <img
          src={url}
          alt={badgeText || labelText}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {badgeText && (
          <span className="absolute top-1.5 left-1.5 z-10 rounded-md border border-white/10 bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-xs">
            {badgeText}
          </span>
        )}

        {/* Hover 更换遮罩 */}
        <div className="backdrop-blur-2xs absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <RefreshCw className="size-4 text-white" />
          <span className="text-center text-[10px] font-semibold text-white">
            {m['stp.common.click_to_replace']()}
          </span>
        </div>

        {/* 删除按钮 */}
        {onRemove && (
          <button
            type="button"
            disabled={disabled || isGlobalUploading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="hover:bg-destructive absolute top-1.5 right-1.5 z-20 flex size-6 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/75 text-white shadow-md transition-all hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
            title={m['stp.common.remove_image']()}
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>
    );
  }

  // 3. 空白待上传状态：虚线卡片
  return (
    <div
      onClick={handleCardClick}
      className="border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-primary/50 dark:hover:border-primary/60 group relative flex h-24 w-28 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed shadow-2xs transition-all dark:border-white/20 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
    >
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="text-muted-foreground m-auto flex flex-col items-center justify-center gap-1 p-1 text-center select-none">
        <Upload className="text-muted-foreground/80 group-hover:text-primary size-4 shrink-0 transition-transform group-hover:scale-110 dark:text-white/70" />
        <div className="flex flex-col items-center leading-tight">
          <span className="text-foreground/90 group-hover:text-primary text-[11px] font-semibold tracking-tight transition-colors dark:text-white">
            {labelText}
          </span>
          {subLabelText && (
            <span className="text-muted-foreground/70 mt-0.5 scale-90 transform-gpu text-[9px] whitespace-nowrap dark:text-white/50">
              {subLabelText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function GenerationUploadArea({
  images = [],
  uploadingItems = [],
  maxImages = 3,
  disabled = false,
  isFirstLastFrameMode = false,
  isImageRequired = false,
  onUploadClick,
  onFilesSelected,
  onReplaceFile,
  onRemoveImage,
}: GenerationUploadAreaProps) {
  const [pendingRemovalIndex, setPendingRemovalIndex] = useState<number | null>(
    null
  );

  const totalCount = images.length + uploadingItems.length;
  const canUploadMore = totalCount < maxImages;
  const isUploading = uploadingItems.length > 0;

  const handleAddMultipleFilesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = Math.max(0, maxImages - totalCount);
    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
    onFilesSelected(filesToProcess);
    e.target.value = '';
  };

  // 1. 首尾帧固定插槽模式
  if (isFirstLastFrameMode) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {[0, 1].map((slotIndex) => {
              const url = images[slotIndex];
              const slotUploadingItem = uploadingItems.find(
                (item) => item.slotIndex === slotIndex
              );
              const isFirst = slotIndex === 0;
              const badgeText = isFirst
                ? m['stp.common.first_frame_badge']()
                : m['stp.common.last_frame_badge']();
              const labelText = isFirst
                ? isImageRequired
                  ? m['stp.common.first_frame']()
                  : m['stp.common.first_frame_optional']()
                : m['stp.common.last_frame']();

              return (
                <UploadSlotCard
                  key={`slot-${slotIndex}`}
                  badgeText={badgeText}
                  labelText={labelText}
                  subLabelText={m['stp.common.max_size_5mb']()}
                  url={url}
                  uploadingItem={slotUploadingItem}
                  disabled={disabled}
                  isGlobalUploading={isUploading}
                  onFileSelected={(file) => onReplaceFile(slotIndex, file)}
                  onRemove={
                    url ? () => setPendingRemovalIndex(slotIndex) : undefined
                  }
                  onTriggerClick={onUploadClick}
                />
              );
            })}
          </div>
        </div>
        <ConfirmDialog
          open={pendingRemovalIndex !== null}
          onOpenChange={(open) => !open && setPendingRemovalIndex(null)}
          title={m['stp.common.remove_image']()}
          description={m['stp.common.confirm_remove_image']()}
          confirmText={m['stp.common.remove_image']()}
          cancelText={m['stp.common.cancel']()}
          variant="destructive"
          onConfirm={() => {
            if (pendingRemovalIndex !== null) {
              onRemoveImage(pendingRemovalIndex);
              setPendingRemovalIndex(null);
            }
          }}
        />
      </>
    );
  }

  // 2. 普通多图 / 单图模式
  const appendedUploadingItems = uploadingItems.filter(
    (it) => it.slotIndex === undefined || it.slotIndex >= images.length
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* 渲染已有图片（以及其原地替换中的状态） */}
          {images.map((url, index) => {
            const replacingItem = uploadingItems.find(
              (it) => it.slotIndex === index
            );
            return (
              <UploadSlotCard
                key={`img-${index}-${url}`}
                labelText={m['stp.common.upload']()}
                url={url}
                uploadingItem={replacingItem}
                disabled={disabled}
                isGlobalUploading={isUploading}
                onFileSelected={(file) => onReplaceFile(index, file)}
                onRemove={() => setPendingRemovalIndex(index)}
                onTriggerClick={onUploadClick}
              />
            );
          })}

          {/* 渲染新添加的上传中占位卡片 */}
          {appendedUploadingItems.map((item) => (
            <UploadSlotCard
              key={item.id}
              labelText={m['stp.common.upload']()}
              uploadingItem={item}
              disabled={disabled}
              isGlobalUploading={isUploading}
              onFileSelected={() => {}}
            />
          ))}

          {/* 上传触发按钮（仅在未达上限时展示） */}
          {canUploadMore && (
            <label
              onClick={disabled ? (e) => e.preventDefault() : onUploadClick}
              className="border-border bg-muted/30 hover:bg-muted/60 hover:border-foreground/40 group relative flex h-24 w-28 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all"
            >
              <input
                type="file"
                accept="image/*"
                multiple={maxImages > 1}
                disabled={disabled}
                onChange={handleAddMultipleFilesChange}
                className="hidden"
              />
              <div className="text-muted-foreground m-auto flex flex-col items-center justify-center gap-1 p-1 text-center select-none">
                <Upload className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:scale-110" />
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-foreground/90 text-[11px] font-semibold tracking-tight">
                    {m['stp.common.upload']()}
                  </span>
                  <span className="text-muted-foreground/75 mt-0.5 scale-90 transform-gpu text-[9px] whitespace-nowrap">
                    {m['stp.common.max_size_5mb']()}
                  </span>
                  {maxImages > 1 && (
                    <span className="text-muted-foreground/70 mt-0.5 scale-90 transform-gpu font-mono text-[9px] leading-none">
                      {images.length}/{maxImages}
                    </span>
                  )}
                </div>
              </div>
            </label>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={pendingRemovalIndex !== null}
        onOpenChange={(open) => !open && setPendingRemovalIndex(null)}
        title={m['stp.common.remove_image']()}
        description={m['stp.common.confirm_remove_image']()}
        confirmText={m['stp.common.remove_image']()}
        cancelText={m['stp.common.cancel']()}
        variant="destructive"
        onConfirm={() => {
          if (pendingRemovalIndex !== null) {
            onRemoveImage(pendingRemovalIndex);
            setPendingRemovalIndex(null);
          }
        }}
      />
    </>
  );
}
