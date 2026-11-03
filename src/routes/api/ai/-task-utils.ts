import { AITaskStatus } from '@/core/ai/types';

export const MAX_POLL_TASKS = 10;
export const POLL_LEASE_MS = 30_000;
export const inFlightTaskQueries = new Map<string, Promise<any>>();

export function parseTaskJson(value: unknown): any {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function getPublicTaskErrorCode(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as any).taskInfo?.userErrorCode === 'string'
  ) {
    return (value as any).taskInfo.userErrorCode;
  }
  if ((value as any)?.taskStatus === AITaskStatus.CANCELED) {
    return 'task_canceled';
  }
  let message = '';
  try {
    if (typeof value === 'string') {
      message = value;
    } else if (value instanceof Error) {
      message = value.message;
    } else if (typeof (value as any)?.message === 'string') {
      message = (value as any).message;
    } else {
      message = JSON.stringify(value);
    }
  } catch {}

  if (/copyright|copyright restrictions/i.test(message)) {
    return 'copyright_restricted';
  }
  if (
    /content safety|sensitive content|flagged as sensitive|policy\s*violation|moderation|safety system|content policy/i.test(
      message
    )
  ) {
    return 'content_safety_rejected';
  }
  if (
    /duration\s+must\s+be\s+between|total\s+duration.*(?:exceed|maximum)/i.test(
      message
    )
  ) {
    return 'reference_media_duration_invalid';
  }
  if (/too\s+many\s+input\s+images/i.test(message)) return 'too_many_images';
  if (/too\s+many\s+input\s+videos/i.test(message)) return 'too_many_videos';
  if (/too\s+many\s+input\s+audio/i.test(message)) return 'too_many_audios';
  if (/prompt\s+is\s+too\s+long/i.test(message)) return 'prompt_too_long';
  if (
    /(?:failed|unable)\s+to\s+(?:download|fetch|prepare).*(?:image|video|audio|reference)|(?:image|video|audio).*(?:format.*unsupported|file.*too large|unavailable|invalid)/i.test(
      message
    )
  ) {
    return 'reference_media_invalid';
  }
  if (
    /rate\s*limit|too\s+many\s+requests|queue\s+is\s+full|service\s+unavailable|overloaded|temporarily\s+busy/i.test(
      message
    )
  ) {
    return 'service_busy';
  }
  return 'generation_failed';
}

export function toPublicTaskResult(result: any) {
  if (
    result?.taskStatus !== AITaskStatus.FAILED &&
    result?.taskStatus !== AITaskStatus.CANCELED
  ) {
    return result;
  }
  return {
    taskStatus: result.taskStatus,
    id: result.id,
    taskId: result.taskId,
    mediaType: result.mediaType,
    taskInfo: {
      userErrorCode: getPublicTaskErrorCode(result),
    },
  };
}

export function toTaskResult(task: any, fallbackTaskId: string) {
  const taskResult = parseTaskJson(task.taskResult);
  const taskInfo = parseTaskJson(task.taskInfo);
  const taskStatus =
    task.status === 'success'
      ? AITaskStatus.SUCCESS
      : task.status === 'canceled'
        ? AITaskStatus.CANCELED
        : task.status === 'failed'
          ? AITaskStatus.FAILED
          : task.status === 'processing'
            ? AITaskStatus.PROCESSING
            : AITaskStatus.PENDING;

  if (
    taskStatus === AITaskStatus.FAILED ||
    taskStatus === AITaskStatus.CANCELED
  ) {
    return {
      taskStatus,
      id: task.id,
      taskId: task.taskId || fallbackTaskId,
      mediaType: task.mediaType,
      taskInfo: {
        userErrorCode: getPublicTaskErrorCode({ taskInfo, taskResult }),
      },
    };
  }

  return {
    ...taskResult,
    taskStatus,
    id: task.id,
    taskId: task.taskId || fallbackTaskId,
    mediaType: task.mediaType,
    taskInfo,
  };
}

export async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
