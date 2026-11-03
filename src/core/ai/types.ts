/**
 * AI Configs to use AI functions
 */
export interface AIConfigs {
  [key: string]: any;
}

/**
 * ai media type
 */
export enum AIMediaType {
  MUSIC = 'music',
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
  SPEECH = 'speech',
}

export interface AISong {
  id?: string;
  createTime?: Date;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  prompt: string;
  title: string;
  tags: string;
  style: string;
  model?: string;
  artist?: string;
  album?: string;
}

export interface AIImage {
  id?: string;
  createTime?: Date;
  imageType?: string;
  imageUrl?: string;
}

export interface AIVideo {
  id?: string;
  createTime?: Date;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
}

/**
 * AI generate params
 */
export interface AIGenerateParams {
  mediaType: AIMediaType;
  prompt: string;
  model?: string;
  options?: any;
  callbackUrl?: string;
  stream?: boolean;
  async?: boolean;
}

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * AI task info
 */
export interface AITaskInfo {
  songs?: AISong[];
  images?: AIImage[];
  videos?: AIVideo[];
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  createTime?: Date;
}

/**
 * AI task result
 */
export interface AITaskResult {
  taskStatus: AITaskStatus;
  taskId: string;
  taskInfo?: AITaskInfo;
  taskResult?: any;
}

const LEGACY_IMAGE_URL =
  'https://img-template-nano-banana.16781678.xyz/uploads/2025-12-09/1765215470859-wuqc1m.jpg';
const LEGACY_VIDEO_URL =
  'https://palixoss.16781678.xyz/uploads/ai/image/2026-09-05/26f56c79-d2f1-4680-984a-5920b8ecc754.mp4';

/** Replace known supplier/mock URLs that are no longer publicly reachable. */
export function normalizeLegacyMediaUrl(value: string): string {
  if (typeof value !== 'string') return (value as any) || '';
  const url = value.trim();
  if (
    url === 'https://oss.pixany.xyz/uploads/2026-05-08/1778247593756-bdtvb0.png'
  ) {
    return LEGACY_IMAGE_URL;
  }
  if (
    url === '/oss/palix-ai.mp4' ||
    /^https:\/\/pixanyoss\.16781678\.xyz\/showcase\/video[1-3]\.mp4$/.test(url)
  ) {
    return LEGACY_VIDEO_URL;
  }
  return url;
}

export interface AIFile {
  url: string;
  contentType: string;
  key: string;
  index?: number;
  type?: string;
}

/**
 * AI Provider provide AI functions
 */
export interface AIProvider {
  readonly name: string;
  configs: AIConfigs;
  generate({ params }: { params: AIGenerateParams }): Promise<AITaskResult>;
  query?({
    taskId,
    mediaType,
    model,
  }: {
    taskId: string;
    mediaType?: string;
    model?: string;
  }): Promise<AITaskResult>;
}

/**
 * Save files function type - can be injected by consumer
 */
export type SaveFilesFunction = (
  files: AIFile[]
) => Promise<AIFile[] | undefined>;

/**
 * Upload file function type - can be injected by consumer
 */
export interface UploadFileOptions {
  body: Buffer | Uint8Array;
  key: string;
  contentType: string;
}

export interface UploadFileResult {
  url: string;
}

export type UploadFileFunction = (
  options: UploadFileOptions
) => Promise<UploadFileResult>;

/**
 * UUID generator function type
 */
export type UuidFunction = () => string;

/**
 * 递归安全提取媒体 URL（图片/视频/音频），支持各类 AI 供应商返回的扁平或嵌套对象、数组格式
 */
export function extractMediaUrl(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:')
    ) {
      return normalizeLegacyMediaUrl(trimmed);
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractMediaUrl(parsed);
      } catch {}
    }
    return '';
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const u = extractMediaUrl(item);
      if (u) return u;
    }
    return '';
  }
  if (typeof val === 'object') {
    return (
      extractMediaUrl(val.imageUrl) ||
      extractMediaUrl(val.image_url) ||
      extractMediaUrl(val.videoUrl) ||
      extractMediaUrl(val.video_url) ||
      extractMediaUrl(val.audioUrl) ||
      extractMediaUrl(val.audio_url) ||
      extractMediaUrl(val.url) ||
      extractMediaUrl(val.images) ||
      extractMediaUrl(val.videos) ||
      extractMediaUrl(val.songs) ||
      extractMediaUrl(val.music) ||
      extractMediaUrl(val.audio) ||
      extractMediaUrl(val.output) ||
      extractMediaUrl(val.result) ||
      extractMediaUrl(val.data) ||
      extractMediaUrl(val.taskResult) ||
      extractMediaUrl(val.taskInfo) ||
      ''
    );
  }
  return '';
}

/** Extract an audio URL without accidentally selecting a song cover image. */
export function extractAudioUrl(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const url = extractMediaUrl(val);
    if (!url) return '';
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      return /(?:\.mp3|\.wav|\.m4a|\.aac|\.ogg|\.flac)(?:$|\?)/.test(
        pathname
      ) || pathname.includes('/audio/')
        ? url
        : '';
    } catch {
      return '';
    }
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const url = extractAudioUrl(item);
      if (url) return url;
    }
    return '';
  }
  if (typeof val !== 'object') return '';

  const direct =
    extractMediaUrl(val.audioUrl) ||
    extractMediaUrl(val.audio_url) ||
    extractAudioUrl(val.songs) ||
    extractAudioUrl(val.music) ||
    extractAudioUrl(val.audio);
  if (direct) return direct;

  for (const value of Object.values(val)) {
    const url = extractAudioUrl(value);
    if (url) return url;
  }
  return '';
}

/** Extract a video URL without accidentally selecting a preview cover image. */
export function extractVideoUrl(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const url = extractMediaUrl(val);
    if (!url) return '';
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      return /(?:\.mp4|\.mov|\.webm|\.mkv|\.avi)(?:$|\?)/.test(pathname) ||
        pathname.includes('/video/')
        ? url
        : '';
    } catch {
      return '';
    }
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const url = extractVideoUrl(item);
      if (url) return url;
    }
    return '';
  }
  if (typeof val !== 'object') return '';

  const direct =
    extractMediaUrl(val.videoUrl) ||
    extractMediaUrl(val.video_url) ||
    extractVideoUrl(val.videos) ||
    extractVideoUrl(val.video);
  if (direct) return direct;

  for (const value of Object.values(val)) {
    const url = extractVideoUrl(value);
    if (url) return url;
  }
  return '';
}

/**
 * 提取 AI 供应商返回数据中的原始任务 ID
 */
export function extractProviderTaskId(data: any): string | null {
  if (!data || typeof data !== 'object') return null;
  if (data.data && Array.isArray(data.data) && data.data[0]) {
    const item = data.data[0];
    if (item.task_id) return item.task_id;
    if (item.taskId) return item.taskId;
    if (item.id) return item.id;
  }
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    if (data.data.task_id) return data.data.task_id;
    if (data.data.taskId) return data.data.taskId;
    if (data.data.id) return data.data.id;
  }
  if (data.task_id) return data.task_id;
  if (data.taskId) return data.taskId;
  if (data.id) return data.id;
  return null;
}

/**
 * 统一归一化 AI 模型标识，确保 APIMart 与 KIE.AI 等各服务商标准接口均能兼容
 */
export function normalizeAIModel(
  model?: string,
  mediaType: 'image' | 'video' | 'music' = 'image'
): string {
  if (!model) {
    if (mediaType === 'video') return 'kling-3-0-turbo';
    if (mediaType === 'music') return 'suno-v5';
    return 'flux-2.0';
  }

  const modelMap: Record<string, string> = {
    // 图像模型
    'nano-banana-2': 'nano-banana-2',
    'nano-banana-pro': 'nano-banana-pro',
    'flux-2': 'flux-2.0',
    'gpt-image-2': 'gpt-image-2',
    'grok-imagine-2-0': 'grok-imagine-2.0',
    'imagen-4-0': 'imagen-4.0',
    'qwen-image-3-0': 'qwen-image-3.0',
    'seedream-5-0-pro': 'seedream-5.0-pro',

    // 视频模型
    'minimax-h3': 'MiniMax-H3',
    'wan-3-0': 'wan3.0-video',
    'wan-2-7': 'wan2.7',
    'seedance-2-5': 'seedance-2.5',
    'doubao-seedance-2-0': 'seedance-2.0',
    'kling-3-0-turbo': 'kling-3.0-turbo',
    'minimax-hailuo-2-3': 'MiniMax-Hailuo-2.3',
    viduq3: 'viduq3',
    'pixverse-v6': 'pixverse-v6',

    // 音乐模型
    'suno-v5': 'suno-v5',
    'suno-v4': 'suno-v4',
    'flow-music': 'flow-music',
  };

  return modelMap[model] || model;
}

/**
 * 净化面向用户的 AI 报错提示，隐藏内部供应商名称（如 APIMart / KIE）、请求 ID 与底层异常堆栈
 */
export function sanitizeUserErrorMessage(errMsg?: string): string {
  if (!errMsg) return 'Generation failed. Please try again.';

  let msg = errMsg;

  // 移除供应商前缀与状态码标识（例如 APIMart failed (503): / KIE failed (500): 等）
  msg = msg.replace(
    /^(?:APIMart|KIE|Replicate|OpenAI)\s+failed\s*(?:\(\d+\))?:\s*/i,
    ''
  );

  // 移除常见第三方请求标识后缀 (request id: xxx) / [Request ID: xxx]
  msg = msg.replace(/\s*\(request id:[^)]+\)/i, '');
  msg = msg.replace(/\s*\[Request ID:[^\]]+\]/i, '');

  msg = msg.trim();
  if (
    !msg ||
    msg.startsWith('{') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('fetch failed')
  ) {
    return 'The generation service is temporarily busy. Please wait a moment and try again.';
  }

  return msg;
}
