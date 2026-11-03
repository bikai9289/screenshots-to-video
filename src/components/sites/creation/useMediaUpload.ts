'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ensureClientUser } from '@/core/auth/client';
import {
  isUploadUnauthorized,
  resolveUploadImageErrorMessage,
} from '@/lib/upload-image-error';
import { m } from '@/paraglide/messages.js';

import { type UploadingItem } from './GenerationUploadArea';

interface UseMediaUploadProps {
  maxImages: number;
  user: any;
  onRequireAuth: () => void;
}

/**
 * 创作媒体上传控制 Hook
 * 处理多图选择、上传进度占位展示、文件类型与大小校验、图片替换与删除，并拦截未登录访客
 */
export function useMediaUpload({
  maxImages,
  user,
  onRequireAuth,
}: UseMediaUploadProps) {
  // 已上传成功的远程图片 URL 列表
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  // 上传中的临时占位数据（包含本地 Blob 预览 URL）
  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([]);

  const isUploadingImage = uploadingItems.length > 0;

  // 超出最大图数自动截断保护
  useEffect(() => {
    if (imageUrls.length <= maxImages) return;
    setImageUrls((prev) => prev.slice(0, maxImages));
    toast.info(m['stp.common.image_limit_reached']({ max: maxImages }));
  }, [imageUrls.length, maxImages]);

  // 点击上传区域时的访客权限检查
  const handleUploadClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!user) {
      e.preventDefault();
      onRequireAuth();
    }
  };

  /**
   * 处理选择的图片文件并执行并发上传
   */
  const handleFilesSelected = async (files: File[]) => {
    if (!files.length) return;
    const authedUser = await ensureClientUser(user);
    if (!authedUser) {
      onRequireAuth();
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(m['stp.common.image_size_limit_exceeded']());
    }

    const validFiles = files.filter((f) => f.size <= MAX_FILE_SIZE);
    if (!validFiles.length) return;

    const currentTotal = imageUrls.length + uploadingItems.length;
    const availableSlots = Math.max(0, maxImages - currentTotal);
    const filesToProcess = validFiles.slice(0, availableSlots);
    if (filesToProcess.length < validFiles.length) {
      toast.info(m['stp.common.image_limit_reached']({ max: maxImages }));
    }
    if (!filesToProcess.length) return;

    const newUploading: UploadingItem[] = filesToProcess.map((file, i) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      localUrl: URL.createObjectURL(file),
      slotIndex: imageUrls.length + i,
    }));

    setUploadingItems((prev) => [...prev, ...newUploading]);

    try {
      const formData = new FormData();
      filesToProcess.forEach((file) => formData.append('files', file));
      const res = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      const urls = data?.data?.urls || data?.urls;
      if (!res.ok || data?.code === -1 || !Array.isArray(urls)) {
        if (isUploadUnauthorized(data?.message, res.status)) {
          onRequireAuth();
          return;
        }
        throw new Error(resolveUploadImageErrorMessage(data?.message));
      }
      setImageUrls((prev) => [...prev, ...urls].slice(0, maxImages));
    } catch (err: any) {
      if (
        err?.message?.toLowerCase().includes('unauthorized') ||
        err?.message?.includes('未登录')
      ) {
        onRequireAuth();
      } else {
        toast.error(
          resolveUploadImageErrorMessage(err?.message) ||
            m['stp.common.image_upload_failed']()
        );
      }
    } finally {
      newUploading.forEach((item) => URL.revokeObjectURL(item.localUrl));
      setUploadingItems((prev) =>
        prev.filter((item) => !newUploading.some((next) => next.id === item.id))
      );
    }
  };

  const handleReplaceFile = async (index: number, file: File) => {
    if (!file) return;
    const authedUser = await ensureClientUser(user);
    if (!authedUser) {
      onRequireAuth();
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(m['stp.common.image_size_limit_exceeded']());
      return;
    }

    const replaceId = `replace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const localUrl = URL.createObjectURL(file);
    const uploadingItem: UploadingItem = {
      id: replaceId,
      localUrl,
      slotIndex: index,
    };

    setUploadingItems((prev) => [...prev, uploadingItem]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      const remoteUrl = data?.data?.urls?.[0] || data?.urls?.[0];
      if (res.ok && data?.code !== -1 && remoteUrl) {
        setImageUrls((prev) => {
          const next = [...prev];
          while (next.length <= index) {
            next.push('');
          }
          next[index] = remoteUrl;
          return next;
        });
      } else {
        if (isUploadUnauthorized(data?.message, res.status)) {
          onRequireAuth();
          return;
        }
        toast.error(
          resolveUploadImageErrorMessage(data?.message) ||
            m['stp.common.image_replace_failed']()
        );
      }
    } catch (err: any) {
      if (
        err?.message?.toLowerCase().includes('unauthorized') ||
        err?.message?.includes('未登录')
      ) {
        onRequireAuth();
      } else {
        toast.error(
          resolveUploadImageErrorMessage(err?.message) ||
            m['stp.common.image_replace_failed']()
        );
      }
    } finally {
      if (localUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localUrl);
      }
      setUploadingItems((prev) => prev.filter((it) => it.id !== replaceId));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => {
      const next = [...prev];
      if (index < next.length) {
        next[index] = '';
      }
      if (next.every((item) => !item)) {
        return [];
      }
      return next;
    });
  };

  const clearImages = () => {
    setImageUrls([]);
    setUploadingItems([]);
  };

  return {
    imageUrls,
    setImageUrls,
    clearImages,
    imagePreview: imageUrls[0] || '',
    images: imageUrls,
    uploadingItems,
    isUploadingImage,
    handleUploadClick,
    handleFilesSelected,
    handleReplaceFile,
    handleRemoveImage,
  };
}
