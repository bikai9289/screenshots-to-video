import {
  extractAudioUrl,
  extractMediaUrl,
  extractVideoUrl,
  normalizeLegacyMediaUrl,
} from '@/core/ai';
import { apiDelete, apiGet } from '@/lib/api-client';

/**
 * 作品数据持久化与状态同步模块
 * 管理客户端 localStorage 缓存、服务端生成任务数据同步与事件广播
 */
export interface CreationItem {
  id: string;
  mediaType: 'image' | 'video' | 'music';
  mode?: string;
  prompt: string;
  model?: string;
  url: string;
  thumbnailUrl?: string;
  aspectRatio?: string;
  duration?: string;
  resolution?: string;
  visibility?: 'public' | 'private';
  status?: 'pending' | 'processing' | 'success' | 'failed';
  errorCode?: string;
  createdAt: number; // 时间戳 (毫秒)
}

const STORAGE_KEY = 'nanobanana_joyflix_user_creations';
const EXPIRY_DAYS = 14; // 本地缓存最长保留 14 天
export const activePollerSet = new Set<string>();
const missingTaskPollCounts = new Map<string, number>();
const MISSING_TASK_RETRY_LIMIT = 3;

const CHANNEL_NAME = 'nanobanana_joyflix_creation_channel';
let creationBroadcastChannel: BroadcastChannel | null = null;
const crossTabActivePollerMap = new Map<string, number>();

export const getTaskLockName = (taskId: string) =>
  `nanobanana_joyflix_task_poll_${taskId}`;

export async function getActiveHeldTaskLocks(): Promise<Set<string>> {
  if (
    typeof navigator !== 'undefined' &&
    'locks' in navigator &&
    typeof navigator.locks.query === 'function'
  ) {
    try {
      const state = await navigator.locks.query();
      const held = new Set<string>();
      for (const lock of state.held || []) {
        if (
          lock.name &&
          lock.name.startsWith('nanobanana_joyflix_task_poll_')
        ) {
          held.add(lock.name.slice('nanobanana_joyflix_task_poll_'.length));
        }
      }
      return held;
    } catch {
      return new Set();
    }
  }
  return new Set();
}

/**
 * 递归获取一组任务的专属锁（使用 ifAvailable: true 非阻塞尝试），
 * 仅对成功锁定（未被前台占用）的任务执行回调，并在整个请求与状态落库期间持续持有锁。
 */
export async function withAcquiredTaskLocks<T>(
  taskIds: string[],
  fn: (lockedIds: string[]) => Promise<T>,
  lockedIds: string[] = [],
  index: number = 0
): Promise<T> {
  if (
    typeof navigator === 'undefined' ||
    !('locks' in navigator) ||
    index >= taskIds.length
  ) {
    return fn(lockedIds);
  }
  const currentId = taskIds[index];
  return navigator.locks.request(
    getTaskLockName(currentId),
    { ifAvailable: true },
    async (lock) => {
      if (lock) {
        return withAcquiredTaskLocks(
          taskIds,
          fn,
          [...lockedIds, currentId],
          index + 1
        );
      } else {
        return withAcquiredTaskLocks(taskIds, fn, lockedIds, index + 1);
      }
    }
  );
}

export function getBroadcastChannel(): BroadcastChannel | null {
  if (
    typeof window === 'undefined' ||
    typeof BroadcastChannel === 'undefined'
  ) {
    return null;
  }
  if (!creationBroadcastChannel) {
    try {
      creationBroadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      creationBroadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'POLLER_CLAIM' && typeof data.taskId === 'string') {
          crossTabActivePollerMap.set(data.taskId, Date.now());
        } else if (
          data.type === 'POLLER_RELEASE' &&
          typeof data.taskId === 'string'
        ) {
          crossTabActivePollerMap.delete(data.taskId);
        } else if (data.type === 'POLLER_DISCOVERY_PING') {
          for (const tid of activePollerSet) {
            getBroadcastChannel()?.postMessage({
              type: 'POLLER_CLAIM',
              taskId: tid,
            });
          }
        } else if (data.type === 'CREATIONS_UPDATED') {
          window.dispatchEvent(
            new Event('nanobanana_joyflix_creations_updated')
          );
        } else if (data.type === 'TASK_COMPLETED' && data.taskId) {
          crossTabActivePollerMap.delete(data.taskId);
          window.dispatchEvent(
            new CustomEvent('nanobanana_joyflix_creation_task_completed', {
              detail: {
                taskId: data.taskId,
                status: data.status,
                errorCode: data.errorCode,
              },
            })
          );
          window.dispatchEvent(
            new Event('nanobanana_joyflix_creations_updated')
          );
        } else if (data.type === 'TASK_PROGRESS' && data.taskId && data.res) {
          window.dispatchEvent(
            new CustomEvent('nanobanana_joyflix_creation_task_progress', {
              detail: { taskId: data.taskId, res: data.res },
            })
          );
        }
      };
      creationBroadcastChannel.postMessage({ type: 'POLLER_DISCOVERY_PING' });
    } catch {
      creationBroadcastChannel = null;
    }
  }
  return creationBroadcastChannel;
}

export function claimForegroundPoller(taskId: string) {
  activePollerSet.add(taskId);
  crossTabActivePollerMap.set(taskId, Date.now());
  getBroadcastChannel()?.postMessage({ type: 'POLLER_CLAIM', taskId });
}

export function releaseForegroundPoller(taskId: string) {
  activePollerSet.delete(taskId);
  crossTabActivePollerMap.delete(taskId);
  getBroadcastChannel()?.postMessage({ type: 'POLLER_RELEASE', taskId });
}

export function isTaskForegroundPolled(taskId: string): boolean {
  if (activePollerSet.has(taskId)) return true;
  const claimTime = crossTabActivePollerMap.get(taskId);
  if (!claimTime) return false;
  if (Date.now() - claimTime > 10000) {
    crossTabActivePollerMap.delete(taskId);
    return false;
  }
  return true;
}

/**
 * 校验作品数据格式合法性
 */
function isValidCreation(item: unknown): item is CreationItem {
  if (!item || typeof item !== 'object') return false;
  const creation = item as CreationItem;
  if (!['image', 'video', 'music'].includes(creation.mediaType)) return false;
  if (!Number.isFinite(creation.createdAt)) return false;
  if (
    creation.status === 'pending' ||
    creation.status === 'processing' ||
    creation.status === 'failed'
  ) {
    return typeof creation.prompt === 'string';
  }
  if (typeof creation.url !== 'string' || !creation.url) return false;
  try {
    const url = new URL(creation.url, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

let globalPollerTimer: ReturnType<typeof setTimeout> | null = null;
let isPollingInProgress = false;
let pollStartQueued = false;
let batchPollOffset = 0;
const MAX_BATCH_POLL_TASKS = 4;

/**
 * 统一合并轮询后台生成中的任务，排除当前前台正在独立轮询的任务。
 * A single global poller handles every media type so concurrent generators
 * cannot cancel one another's scheduled batch.
 */
export function pollPendingCreationTasks(
  _scopedMediaType?: 'image' | 'video' | 'music'
) {
  if (typeof window === 'undefined') return;

  const list = getLocalCreations();
  const hasPending = list.some(
    (item) => item.status === 'pending' || item.status === 'processing'
  );

  if (!hasPending) {
    if (globalPollerTimer) {
      clearTimeout(globalPollerTimer);
      globalPollerTimer = null;
    }
    return;
  }

  if (globalPollerTimer || isPollingInProgress || pollStartQueued) return;

  pollStartQueued = true;
  const runBatchPoll = async () => {
    globalPollerTimer = null;
    pollStartQueued = false;

    const executeBatch = async () => {
      const currentList = getLocalCreations();
      const hasAnyPending = currentList.some(
        (item) => item.status === 'pending' || item.status === 'processing'
      );
      if (!hasAnyPending) {
        batchPollOffset = 0;
        if (globalPollerTimer) {
          clearTimeout(globalPollerTimer);
          globalPollerTimer = null;
        }
        isPollingInProgress = false;
        return;
      }

      const heldLocks = await getActiveHeldTaskLocks();
      const nowTime = Date.now();
      const twentyMinutesAgo = nowTime - 20 * 60 * 1000;
      const pendingItems = currentList.filter((item) => {
        const isPending =
          item.status === 'pending' || item.status === 'processing';
        if (!isPending) return false;
        if (item.createdAt && item.createdAt < twentyMinutesAgo) {
          saveLocalCreation({
            ...item,
            status: 'failed',
          });
          return false;
        }
        if (isTaskForegroundPolled(item.id)) return false;
        if (heldLocks.has(item.id)) return false;
        return true;
      });

      if (pendingItems.length === 0) {
        // All pending tasks are currently held by other tabs or foreground.
        // Keep the timer alive so this tab can take over if the holder closes.
        isPollingInProgress = false;
        if (!globalPollerTimer) {
          globalPollerTimer = setTimeout(runBatchPoll, 3000);
        }
        return;
      }

      isPollingInProgress = true;
      try {
        const candidateItems = Array.from(
          { length: Math.min(MAX_BATCH_POLL_TASKS, pendingItems.length) },
          (_, index) =>
            pendingItems[(batchPollOffset + index) % pendingItems.length]
        );
        batchPollOffset =
          (batchPollOffset + candidateItems.length) % pendingItems.length;

        const candidateIds = candidateItems.map((item) => item.id);

        await withAcquiredTaskLocks(candidateIds, async (lockedIds) => {
          const effectiveIds =
            typeof navigator !== 'undefined' && 'locks' in navigator
              ? lockedIds
              : candidateIds;

          if (effectiveIds.length === 0) {
            return;
          }

          const batchItems = candidateItems.filter((item) =>
            effectiveIds.includes(item.id)
          );
          const taskIds = batchItems.map((item) => item.id).join(',');
          const res: any = await apiGet(
            `/api/ai/task?taskIds=${encodeURIComponent(taskIds)}&batchOffset=${batchPollOffset}`
          );

          const taskList: any[] = Array.isArray(res?.tasks)
            ? res.tasks
            : res
              ? [res]
              : [];

          // 仅在连续多次未返回后清理失效任务，避免短暂接口异常误删正在生成的任务
          const returnedIds = new Set(
            taskList.flatMap((task) => [task?.id, task?.taskId]).filter(Boolean)
          );
          for (const item of batchItems) {
            if (returnedIds.has(item.id)) {
              missingTaskPollCounts.delete(item.id);
              continue;
            }
            const missedCount = (missingTaskPollCounts.get(item.id) || 0) + 1;
            if (missedCount >= MISSING_TASK_RETRY_LIMIT) {
              missingTaskPollCounts.delete(item.id);
              removeLocalCreationOnly(item.id);
            } else {
              missingTaskPollCounts.set(item.id, missedCount);
            }
          }

          for (const t of taskList) {
            const item = batchItems.find(
              (p) => p.id === t.taskId || p.id === t.id
            );
            if (!item) continue;

            if (t.taskStatus === 'success') {
              const mainUrl =
                item.mediaType === 'music'
                  ? extractAudioUrl(t)
                  : item.mediaType === 'video'
                    ? extractVideoUrl(t) || extractMediaUrl(t)
                    : extractMediaUrl(t);
              if (mainUrl) {
                saveLocalCreation({
                  ...item,
                  url: mainUrl,
                  status: 'success',
                });
                window.dispatchEvent(
                  new CustomEvent(
                    'nanobanana_joyflix_creation_task_completed',
                    {
                      detail: { taskId: item.id, status: 'success' },
                    }
                  )
                );
                getBroadcastChannel()?.postMessage({
                  type: 'TASK_COMPLETED',
                  taskId: item.id,
                  status: 'success',
                });
              } else {
                const errorCode =
                  t.taskInfo?.userErrorCode || 'generation_failed';
                saveLocalCreation({
                  ...item,
                  url: '',
                  status: 'failed',
                  errorCode,
                });
                window.dispatchEvent(
                  new CustomEvent(
                    'nanobanana_joyflix_creation_task_completed',
                    {
                      detail: { taskId: item.id, status: 'failed', errorCode },
                    }
                  )
                );
                getBroadcastChannel()?.postMessage({
                  type: 'TASK_COMPLETED',
                  taskId: item.id,
                  status: 'failed',
                  errorCode,
                });
              }
            } else if (
              t.taskStatus === 'failed' ||
              t.taskStatus === 'canceled'
            ) {
              const errorCode = t.taskInfo?.userErrorCode;
              saveLocalCreation({
                ...item,
                status: 'failed',
                errorCode,
              });
              window.dispatchEvent(
                new CustomEvent('nanobanana_joyflix_creation_task_completed', {
                  detail: { taskId: item.id, status: 'failed', errorCode },
                })
              );
              getBroadcastChannel()?.postMessage({
                type: 'TASK_COMPLETED',
                taskId: item.id,
                status: 'failed',
                errorCode,
              });
            }
          }
        });
      } catch (e) {
        console.warn('Batch poll error:', e);
      } finally {
        isPollingInProgress = false;
        const latestList = getLocalCreations();
        const hasAnyPending = latestList.some(
          (item) => item.status === 'pending' || item.status === 'processing'
        );

        if (hasAnyPending) {
          globalPollerTimer = setTimeout(runBatchPoll, 3000);
        } else {
          if (globalPollerTimer) {
            clearTimeout(globalPollerTimer);
            globalPollerTimer = null;
          }
        }
      }
    };

    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      await navigator.locks.request(
        'nanobanana_joyflix_batch_poller_lock',
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            isPollingInProgress = false;
            // Another tab is currently running the batch poll.
            // Ensure this tab has a timer to take over if the leader tab is closed.
            const currentList = getLocalCreations();
            const hasAnyPending = currentList.some(
              (item) =>
                item.status === 'pending' || item.status === 'processing'
            );
            if (hasAnyPending && !globalPollerTimer) {
              globalPollerTimer = setTimeout(
                runBatchPoll,
                3000 + Math.floor(Math.random() * 500)
              );
            }
            return;
          }
          await executeBatch();
        }
      );
    } else {
      await executeBatch();
    }
  };

  // Let foreground polling register its task before starting the background
  // batch poll (saveLocalCreation broadcasts synchronously).
  queueMicrotask(() => void runBatchPoll());
}

/**
 * 根据作品属性推断对应的创作模式 (text-to-image / image-to-image / png-maker 等)
 */
export function inferCreationMode(item: Partial<CreationItem>): string {
  if (item.mode) return item.mode;
  if (item.mediaType === 'video') return 'text-to-video';
  if (item.mediaType === 'music') return 'text-to-music';
  if (
    item.prompt?.includes('移除图片主体之外的所有背景') ||
    item.prompt?.toLowerCase().includes('png')
  ) {
    return 'png-maker';
  }
  return 'text-to-image';
}

/**
 * 获取本地缓存的所有作品列表（自动过滤过期数据）
 */
export function getLocalCreations(): CreationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: CreationItem[] = JSON.parse(raw);
    const fourteenDaysAgo = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    // Filter out items older than 14 days and normalize mode
    const valid = list
      .filter(
        (item) => isValidCreation(item) && item.createdAt >= fourteenDaysAgo
      )
      .map((item) => ({
        ...item,
        url: item.url ? normalizeLegacyMediaUrl(item.url) : item.url,
        thumbnailUrl: item.thumbnailUrl
          ? normalizeLegacyMediaUrl(item.thumbnailUrl)
          : item.thumbnailUrl,
        mode: item.mode || inferCreationMode(item),
      }));
    if (JSON.stringify(valid) !== JSON.stringify(list)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

let syncPromise: Promise<CreationItem[]> | null = null;
let lastSyncTime = 0;

/**
 * 从服务端 API 同步当前登录用户的云端历史生成作品，并合并到本地缓存（带请求去重与防抖缓存）
 */
export async function syncUserCreations(
  force = false
): Promise<CreationItem[]> {
  if (typeof window === 'undefined') return [];
  if (syncPromise) return syncPromise;

  const now = Date.now();
  if (!force && now - lastSyncTime < 5000) {
    return getLocalCreations();
  }

  syncPromise = (async () => {
    try {
      const res: any = await apiGet('/api/ai/creations');
      lastSyncTime = Date.now();
      const items =
        res?.items || res?.data || (Array.isArray(res) ? res : null);
      if (items && Array.isArray(items)) {
        const local = getLocalCreations();
        const map = new Map<string, CreationItem>();
        // 写入服务端作品
        items.forEach((item: CreationItem) => {
          if (isValidCreation(item)) map.set(item.id, item);
        });
        // 仅保留本地新创建但仍在处理中的临时任务，以及最近 2 分钟内创建的本地新作品（避免服务端生成落库并发延迟导致新任务被覆盖抹除）
        const twoMinutesAgo = now - 2 * 60 * 1000;
        local.forEach((item) => {
          if (
            !map.has(item.id) &&
            isValidCreation(item) &&
            (item.status === 'pending' ||
              item.status === 'processing' ||
              item.createdAt >= twoMinutesAgo)
          ) {
            map.set(item.id, item);
          }
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => b.createdAt - a.createdAt
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event('nanobanana_joyflix_creations_updated'));

        // 对本地超过 20 分钟仍 processing 的任务，静默触发一次 poll，
        // 让服务端超时逻辑（task.ts）立即判断并标记失败/退还积分，
        // 无需等待用户下次手动触发轮询
        const twentyMinutesAgo = now - 20 * 60 * 1000;
        merged.forEach((item) => {
          if (
            (item.status === 'processing' || item.status === 'pending') &&
            item.createdAt < twentyMinutesAgo &&
            !item.id.startsWith('mock_')
          ) {
            void apiGet(`/api/ai/task?taskId=${encodeURIComponent(item.id)}`)
              .then((res: any) => {
                if (res?.taskStatus === 'failed' || res?.status === 'failed') {
                  const current = getLocalCreations();
                  const idx = current.findIndex((c) => c.id === item.id);
                  if (idx !== -1) {
                    current[idx] = { ...current[idx], status: 'failed' };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
                    window.dispatchEvent(
                      new Event('nanobanana_joyflix_creations_updated')
                    );
                  }
                }
              })
              .catch(() => {});
          }
        });

        return merged;
      }
    } catch (e) {
      console.error('Failed to sync creations with server', e);
    } finally {
      syncPromise = null;
    }
    return getLocalCreations();
  })();

  return syncPromise;
}

/**
 * 缓存新生成的作品并广播更新事件
 */
export function saveLocalCreation(
  item: Omit<CreationItem, 'createdAt'> & { createdAt?: number }
) {
  if (typeof window === 'undefined') return;
  if (!isValidCreation({ ...item, createdAt: item.createdAt || Date.now() }))
    return;
  try {
    const list = getLocalCreations();
    const existingIndex = list.findIndex((i) => i.id === item.id);
    let updated: CreationItem[];
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const existingIsTerminal =
        existing.status === 'success' || existing.status === 'failed';
      const incomingIsTerminal =
        item.status === 'success' || item.status === 'failed';
      if (
        existingIsTerminal &&
        (!incomingIsTerminal || existing.status === 'success')
      ) {
        return;
      }
      const updatedItem: CreationItem = {
        ...existing,
        ...item,
        createdAt: item.createdAt || existing.createdAt,
      };
      updated = [...list];
      updated[existingIndex] = updatedItem;
    } else {
      const newItem: CreationItem = {
        ...item,
        createdAt: item.createdAt || Date.now(),
      };
      updated = [newItem, ...list];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nanobanana_joyflix_creations_updated'));
    getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });
  } catch (e) {
    console.error('Failed to save creation to storage', e);
  }
}

/**
 * 仅从本地缓存移除指定条目（不发起服务端删除请求），用于清理临时乐观占位 ID
 */
export function removeLocalCreationOnly(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalCreations();
    const updated = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nanobanana_joyflix_creations_updated'));
    getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });
  } catch (e) {
    console.error('Failed to remove local creation', e);
  }
}

/**
 * 删除指定作品（同时发起服务端删除请求）
 */
export function removeLocalCreation(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalCreations();
    const updated = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nanobanana_joyflix_creations_updated'));
    getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });

    // 异步同步到后端数据库
    void apiDelete(`/api/ai/task?taskId=${encodeURIComponent(id)}`).catch(
      () => {
        // 忽略游客或已删除错误
      }
    );
  } catch (e) {
    console.error('Failed to delete creation', e);
  }
}

/**
 * 用户退出登录时清理本地缓存作品数据
 */
export function clearLocalCreations() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('nanobanana_joyflix_creations_updated'));
    getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });
  } catch (e) {
    console.error('Failed to clear local creations', e);
  }
}

export function formatDateTime(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
