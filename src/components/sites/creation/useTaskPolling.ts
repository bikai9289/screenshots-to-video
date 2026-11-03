'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { extractAudioUrl, extractMediaUrl } from '@/core/ai';
import {
  claimForegroundPoller,
  getBroadcastChannel,
  getLocalCreations,
  getTaskLockName,
  pollPendingCreationTasks,
  releaseForegroundPoller,
  saveLocalCreation,
} from '@/modules/creations/store';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';

import { formatLocalizedErrorMessage } from './generation-errors';

/**
 * AI 异步任务轮询 Hook
 * 负责轮询获取云端视频、图像及音乐生成任务的执行进度与最终媒体 URL
 */
export function useTaskPolling() {
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollSessionRef = useRef(0);
  const currentPolledTaskIdRef = useRef<string | null>(null);
  const watchedTaskIdsRef = useRef(new Set<string>());
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleTaskProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ taskId?: string; res?: any }>)
        .detail;
      if (
        detail?.taskId &&
        detail.taskId === currentPolledTaskIdRef.current &&
        detail.res
      ) {
        setGeneratedResult(detail.res);
      }
    };
    window.addEventListener(
      'nanobanana_joyflix_creation_task_progress',
      handleTaskProgress
    );
    return () => {
      window.removeEventListener(
        'nanobanana_joyflix_creation_task_progress',
        handleTaskProgress
      );
    };
  }, []);

  useEffect(() => {
    const handleTaskCompleted = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          taskId?: string;
          status?: string;
          errorCode?: string;
        }>
      ).detail;
      if (!detail?.taskId) return;
      if (currentPolledTaskIdRef.current === detail.taskId) {
        setIsPolling(false);
      }
      watchedTaskIdsRef.current.delete(detail.taskId);
      if (detail?.status === 'success') {
        toast.success(m['stp.common.creation_completed']());
      } else if (detail?.status === 'failed') {
        toast.error(formatLocalizedErrorMessage(detail.errorCode));
      }
    };
    window.addEventListener(
      'nanobanana_joyflix_creation_task_completed',
      handleTaskCompleted
    );
    return () => {
      window.removeEventListener(
        'nanobanana_joyflix_creation_task_completed',
        handleTaskCompleted
      );
      watchedTaskIdsRef.current.clear();
    };
  }, []);

  const watchTask = useCallback((taskId: string) => {
    watchedTaskIdsRef.current.add(taskId);
  }, []);
  const clearWatchedTasks = useCallback(() => {
    watchedTaskIdsRef.current.clear();
  }, []);

  // 组件卸载时清理定时器，避免内存泄漏
  useEffect(() => {
    return () => {
      // Invalidate an in-flight request so it cannot schedule a new timer
      // after the component has unmounted.
      pollSessionRef.current += 1;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      if (currentPolledTaskIdRef.current) {
        releaseForegroundPoller(currentPolledTaskIdRef.current);
        currentPolledTaskIdRef.current = null;
        pollPendingCreationTasks();
      }
    };
  }, []);

  // 重置/取消当前进行中的轮询会话
  const resetPolling = () => {
    pollSessionRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    if (currentPolledTaskIdRef.current) {
      releaseForegroundPoller(currentPolledTaskIdRef.current);
      currentPolledTaskIdRef.current = null;
      pollPendingCreationTasks();
    }
    setIsPolling(false);
  };

  /**
   * 启动任务状态轮询（默认每 3 秒查询一次，上限 60 次）
   */
  const startPolling = (
    taskId: string,
    mediaType: 'image' | 'video' | 'music',
    pText: string,
    modelId: string,
    ratio: string,
    duration: string,
    onSuccess?: () => void,
    mode?: string
  ) => {
    const pollSession = ++pollSessionRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    if (
      currentPolledTaskIdRef.current &&
      currentPolledTaskIdRef.current !== taskId
    ) {
      releaseForegroundPoller(currentPolledTaskIdRef.current);
      pollPendingCreationTasks();
    }
    currentPolledTaskIdRef.current = taskId;
    setIsPolling(true);

    const executePolling = async () => {
      let attempts = 0;
      try {
        while (
          pollSession === pollSessionRef.current &&
          !abortController.signal.aborted &&
          isMountedRef.current &&
          currentPolledTaskIdRef.current === taskId
        ) {
          // 1. Check if task has reached terminal status
          const list = getLocalCreations();
          const existing = list.find((c) => c.id === taskId);
          if (
            existing &&
            (existing.status === 'success' || existing.status === 'failed')
          ) {
            break;
          }

          // 2. Refresh cross-tab heartbeat claim
          claimForegroundPoller(taskId);
          attempts++;
          if (attempts > 60) {
            pollPendingCreationTasks(mediaType);
            break;
          }

          // 3. Perform query
          try {
            const res: any = await apiGet(
              `/api/ai/task?taskId=${taskId}&mediaType=${mediaType}`
            );
            if (
              pollSession !== pollSessionRef.current ||
              abortController.signal.aborted ||
              !isMountedRef.current ||
              currentPolledTaskIdRef.current !== taskId
            ) {
              break;
            }

            if (res) {
              setGeneratedResult(res);
              // Broadcast progress so peer tabs update UI without polling
              getBroadcastChannel()?.postMessage({
                type: 'TASK_PROGRESS',
                taskId,
                res,
              });

              const mainUrl =
                mediaType === 'music'
                  ? extractAudioUrl(res)
                  : extractMediaUrl(res);

              if (res.taskStatus === 'success') {
                if (!mainUrl) {
                  saveLocalCreation({
                    id: taskId,
                    mediaType,
                    mode,
                    prompt: pText,
                    model: modelId,
                    url: '',
                    status: 'failed',
                    aspectRatio: ratio,
                    duration,
                  });
                  toast.error(m['stp.common.generation_failed']());
                  break;
                }
                saveLocalCreation({
                  id: taskId,
                  mediaType,
                  mode,
                  prompt: pText,
                  model: modelId,
                  url: mainUrl,
                  aspectRatio: ratio,
                  duration,
                });
                onSuccess?.();
                toast.success(m['stp.common.creation_completed']());
                break;
              } else if (
                res.taskStatus === 'failed' ||
                res.taskStatus === 'canceled'
              ) {
                saveLocalCreation({
                  id: taskId,
                  mediaType,
                  mode,
                  prompt: pText,
                  model: modelId,
                  url: '',
                  status: 'failed',
                  errorCode: res.taskInfo?.userErrorCode,
                  aspectRatio: ratio,
                  duration,
                });
                toast.error(
                  formatLocalizedErrorMessage(res.taskInfo?.userErrorCode)
                );
                break;
              }
            }
          } catch {
            // Transient query failure; retry next iteration
          }

          // 4. Wait 3 seconds inside the loop before next poll attempt
          await new Promise<void>((resolve) => {
            const timer = setTimeout(() => {
              abortController.signal.removeEventListener('abort', onAbort);
              resolve();
            }, 3000);
            pollingRef.current = timer;
            const onAbort = () => {
              clearTimeout(timer);
              resolve();
            };
            abortController.signal.addEventListener('abort', onAbort, {
              once: true,
            });
          });
        }
      } finally {
        releaseForegroundPoller(taskId);
        if (pollingRef.current) {
          clearTimeout(pollingRef.current);
          pollingRef.current = null;
        }
        if (currentPolledTaskIdRef.current === taskId) {
          currentPolledTaskIdRef.current = null;
          setIsPolling(false);
        }
      }
    };

    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      void navigator.locks
        .request(
          getTaskLockName(taskId),
          { signal: abortController.signal },
          async (lock) => {
            if (
              !lock ||
              pollSession !== pollSessionRef.current ||
              abortController.signal.aborted ||
              !isMountedRef.current
            ) {
              return;
            }
            await executePolling();
          }
        )
        .catch(() => {});
    } else {
      void executePolling();
    }
  };

  return {
    generatedResult,
    setGeneratedResult,
    isPolling,
    watchTask,
    clearWatchedTasks,
    startPolling,
    resetPolling,
  };
}
