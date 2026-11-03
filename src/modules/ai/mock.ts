import { AITaskResult, AITaskStatus } from '@/core/ai/types';

export const MOCK_QUERY_REQUIRED_POLLS = 8;
export const MOCK_IMAGE_URL =
  'https://palixoss.16781678.xyz/uploads/ai/image/2026-09-05/cb303ae1-05fe-4af8-8597-43d1d9b40b93.png';
export const MOCK_VIDEO_URL = 'https://pixanyoss.16781678.xyz/palix-ai.mp4';
export const MOCK_AUDIO_URL = 'https://pixanyoss.16781678.xyz/test.mp3';

export function getMockRequiredPolls(mediaType: string = 'image'): number {
  if (mediaType === 'video') return 10;
  if (mediaType === 'music') return 8;
  return 7;
}

function parseTaskInfo(taskInfo: any) {
  if (!taskInfo) {
    return {};
  }

  if (typeof taskInfo === 'string') {
    try {
      return JSON.parse(taskInfo);
    } catch {
      return {};
    }
  }

  if (typeof taskInfo === 'object') {
    return taskInfo;
  }

  return {};
}

export function createMockGenerateResult(
  taskId: string,
  mediaType: string = 'image'
): AITaskResult {
  const requiredPolls = getMockRequiredPolls(mediaType);
  return {
    taskStatus: AITaskStatus.PENDING,
    taskId: `mock_${taskId}`,
    taskInfo: {
      status: 'pending',
      mockQueryCount: 0,
      mockQueryRequiredPolls: requiredPolls,
      output: [],
      images: [],
      videos: [],
      songs: [],
    } as any,
    taskResult: {
      mock: true,
      mediaType,
      pollCount: 0,
      requiredPolls,
    },
  };
}

export function buildMockQueryResult(task: {
  taskId: string;
  mediaType?: string;
  prompt?: string;
  taskInfo?: any;
}): AITaskResult {
  const currentTaskInfo = parseTaskInfo(task.taskInfo);
  const mediaType = task.mediaType || 'image';
  const requiredPolls = Math.max(
    1,
    Number(
      currentTaskInfo?.mockQueryRequiredPolls || getMockRequiredPolls(mediaType)
    )
  );
  const pollCount = Math.min(
    requiredPolls,
    Math.max(0, Number(currentTaskInfo?.mockQueryCount || 0)) + 1
  );

  if (pollCount >= requiredPolls) {
    let images: any[] = [];
    let videos: any[] = [];
    let songs: any[] = [];
    let output: string[] = [];

    if (mediaType === 'video') {
      output = [MOCK_VIDEO_URL];
      videos = [
        {
          videoUrl: MOCK_VIDEO_URL,
          thumbnailUrl:
            'https://img-template-nano-banana.16781678.xyz/uploads/2025-12-09/1765215470859-wuqc1m.jpg',
          duration: 5,
          createTime: new Date(),
        },
      ];
    } else if (mediaType === 'music') {
      output = [MOCK_AUDIO_URL];
      songs = [
        {
          audioUrl: MOCK_AUDIO_URL,
          imageUrl: 'https://pixanyoss.16781678.xyz/display/home/ai-audio.webp',
          duration: 30,
          prompt: task.prompt || '',
          title: 'Mock AI Audio',
          tags: 'mock, ai, music',
          style: 'Electronic',
          createTime: new Date(),
        },
      ];
    } else {
      output = [MOCK_IMAGE_URL];
      images = [
        {
          imageUrl: MOCK_IMAGE_URL,
          createTime: new Date(),
        },
      ];
    }

    return {
      taskId: task.taskId,
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: {
        ...currentTaskInfo,
        status: 'completed',
        mockQueryCount: pollCount,
        mockQueryRequiredPolls: requiredPolls,
        output,
        images,
        videos,
        songs,
      } as any,
      taskResult: {
        mock: true,
        mediaType,
        pollCount,
        requiredPolls,
        ...(images.length ? { images: [{ url: MOCK_IMAGE_URL }] } : {}),
        ...(videos.length ? { videos: [{ url: MOCK_VIDEO_URL }] } : {}),
        ...(songs.length ? { songs: [{ url: MOCK_AUDIO_URL }] } : {}),
      },
    };
  }

  const providerStatus =
    pollCount < requiredPolls - 2 ? 'pending' : 'processing';

  return {
    taskId: task.taskId,
    taskStatus:
      providerStatus === 'pending'
        ? AITaskStatus.PENDING
        : AITaskStatus.PROCESSING,
    taskInfo: {
      ...currentTaskInfo,
      status: providerStatus,
      mockQueryCount: pollCount,
      mockQueryRequiredPolls: requiredPolls,
      output: [],
      images: [],
      videos: [],
      songs: [],
    } as any,
    taskResult: {
      mock: true,
      mediaType,
      pollCount,
      requiredPolls,
    },
  };
}
