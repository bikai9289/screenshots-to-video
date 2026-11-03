export interface ModelConfig {
  id: string;
  name: string;
  icon: string;
  credits: number;
  badge?: string;
  description?: string;
  type: 'image' | 'video' | 'music';
  supportsImageToImage?: boolean;
  maxImages?: number;
  supportsFirstLastFrame?: boolean;
  supportedResolutions?: string[];
  supportedDurations?: string[];
  defaultResolution?: string;
  defaultDuration?: string;
  referenceMediaDuration?: {
    min: number;
    max: number;
    total: number;
  };
}

export const AI_MODELS: Record<string, ModelConfig> = {
  // Image Models
  'nano-banana-2': {
    id: 'nano-banana-2',
    name: 'Nano Banana 2',
    icon: '/oss/model/icon/nano-banana-80.webp',
    credits: 8,
    badge: 'Popular',
    type: 'image',
    supportsImageToImage: true,
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '1K',
    description:
      'Fast, high-fidelity daily generation with extraordinary aesthetic coherence.',
  },
  'nano-banana-pro': {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    icon: '/oss/model/icon/nano-banana-80.webp',
    credits: 12,
    badge: 'Pro',
    type: 'image',
    supportsImageToImage: true,
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '1K',
    description:
      'Professional-grade ultra-HD creation with precise reasoning and exceptional fidelity.',
  },
  'gpt-image-2': {
    id: 'gpt-image-2',
    name: 'GPT Image 2',
    icon: '/oss/model/icon/gpt-image-80.webp',
    credits: 10,
    badge: 'Pro',
    type: 'image',
    supportsImageToImage: true,
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '1K',
    description:
      'Superior reasoning and complex prompt decomposition with accurate spatial layout.',
  },
  'qwen-image-3-0': {
    id: 'qwen-image-3-0',
    name: 'Qwen Image 3.0',
    icon: '/models/qwen.svg',
    credits: 6,
    badge: 'Multilingual',
    type: 'image',
    supportsImageToImage: true,
    supportedResolutions: ['1K', '2K'],
    defaultResolution: '1K',
    description:
      'Deep semantic understanding across multicultural design styles and typography.',
  },
  'seedream-5-0-pro': {
    id: 'seedream-5-0-pro',
    name: 'Seedream 5.0 Pro',
    icon: '/oss/model/icon/bytedance-80.webp',
    credits: 8,
    badge: 'Commercial',
    type: 'image',
    supportsImageToImage: true,
    supportedResolutions: ['1K', '2K'],
    defaultResolution: '1K',
    description:
      'High-definition commercial graphics and clean subject isolation.',
  },

  // Video Models
  'seedance-2-5': {
    id: 'seedance-2-5',
    name: 'Seedance 2.5',
    icon: '/oss/model/icon/bytedance-80.webp',
    credits: 20,
    badge: 'Dynamic',
    type: 'video',
    supportsFirstLastFrame: true,
    maxImages: 2,
    supportedDurations: ['5s', '10s'],
    supportedResolutions: ['480P', '720P', '1080P'],
    defaultResolution: '720P',
    referenceMediaDuration: { min: 2, max: 30, total: 30 },
    description:
      'High-motion action sequences and expressive character animation.',
  },
  'wan-3-0': {
    id: 'wan-3-0',
    name: 'Wan 3.0',
    icon: '/oss/model/icon/wan-80.webp',
    credits: 20,
    badge: 'Popular',
    type: 'video',
    supportsFirstLastFrame: true,
    maxImages: 2,
    supportedDurations: ['5s'],
    supportedResolutions: ['720P', '1080P'],
    defaultResolution: '720P',
    description:
      'Next-gen video synthesis with fluid temporal consistency and fine detail.',
  },
  'kling-3-0-turbo': {
    id: 'kling-3-0-turbo',
    name: 'Kling 3.0 Turbo',
    icon: '/models/kling.svg',
    credits: 18,
    badge: 'Fast',
    type: 'video',
    maxImages: 1,
    supportedDurations: ['5s', '10s'],
    supportedResolutions: ['720P', '1080P'],
    defaultResolution: '720P',
    description:
      'Ultra-fast and fluid realistic video rendering with intricate motions.',
  },
  'minimax-h3': {
    id: 'minimax-h3',
    name: 'MiniMax H3',
    icon: '/models/hailuo.svg',
    credits: 20,
    badge: 'New',
    type: 'video',
    supportsFirstLastFrame: true,
    maxImages: 2,
    supportedDurations: ['5s', '10s'],
    supportedResolutions: ['768P', '2K'],
    defaultResolution: '768P',
    defaultDuration: '5s',
    referenceMediaDuration: { min: 2, max: 15, total: 15 },
    description:
      'Next-generation omni-modal video model with cinematic realism and stereo audio.',
  },
  'minimax-hailuo-2-3': {
    id: 'minimax-hailuo-2-3',
    name: 'Hailuo 2.3',
    icon: '/models/hailuo.svg',
    credits: 16,
    badge: 'Smooth',
    type: 'video',
    maxImages: 1,
    supportedDurations: ['6s'],
    supportedResolutions: ['720P', '1080P'],
    defaultResolution: '720P',
    defaultDuration: '6s',
    description:
      'Smooth lifelike motions, vivid facial expressions, and natural camera pans.',
  },
  'wan-2-7': {
    id: 'wan-2-7',
    name: 'Wan 2.7',
    icon: '/oss/model/icon/wan-80.webp',
    credits: 18,
    type: 'video',
    supportsFirstLastFrame: true,
    maxImages: 2,
    supportedDurations: ['5s'],
    supportedResolutions: ['720P', '1080P'],
    defaultResolution: '720P',
    description: 'High-stability cinematic generative video model.',
  },
  'doubao-seedance-2-0': {
    id: 'doubao-seedance-2-0',
    name: 'Seedance 2.0',
    icon: '/oss/model/icon/bytedance-80.webp',
    credits: 16,
    type: 'video',
    supportsFirstLastFrame: true,
    maxImages: 2,
    supportedDurations: ['5s', '10s'],
    supportedResolutions: ['480P', '720P', '1080P'],
    defaultResolution: '720P',
    description: 'Stable character preservation and motion coherence.',
  },

  // Music Models
  'suno-v5': {
    id: 'suno-v5',
    name: 'Suno v5 Audio',
    icon: '/oss/model/icon/suno-80.webp',
    credits: 16,
    badge: 'Popular',
    type: 'music',
    description:
      'Generates full structured songs with high-fidelity vocals, lyrics, and melodies.',
  },
  'suno-v4': {
    id: 'suno-v4',
    name: 'Suno v4 Studio',
    icon: '/oss/model/icon/suno-80.webp',
    credits: 12,
    badge: 'Fast',
    type: 'music',
    description:
      'High-speed generation of rich vocals, instrumentals, and custom musical themes.',
  },
  'flow-music': {
    id: 'flow-music',
    name: 'Flow Music',
    icon: '/models/flow-music.svg',
    credits: 10,
    badge: 'New',
    type: 'music',
    description:
      'Modern beatmaker with adaptable melody loops and chord progressions.',
  },
  'udio-v2': {
    id: 'udio-v2',
    name: 'Udio v2 Studio',
    icon: '/models/udio.svg',
    credits: 12,
    badge: 'Studio',
    type: 'music',
    description: 'Pristine audio mastering and multi-genre instrumental depth.',
  },
  'musicgen-pro': {
    id: 'musicgen-pro',
    name: 'MusicGen Pro',
    icon: '/models/musicgen.svg',
    credits: 8,
    type: 'music',
    description:
      'Lightweight instrumental background music and ambient soundtracks.',
  },
};

export const IMAGE_MODELS_LIST: ModelConfig[] = [
  AI_MODELS['gpt-image-2'],
  AI_MODELS['nano-banana-2'],
  AI_MODELS['nano-banana-pro'],
  AI_MODELS['qwen-image-3-0'],
  AI_MODELS['seedream-5-0-pro'],
];

export const IMAGE_TO_IMAGE_MODELS_LIST: ModelConfig[] = [
  AI_MODELS['gpt-image-2'],
  AI_MODELS['nano-banana-2'],
  AI_MODELS['nano-banana-pro'],
  AI_MODELS['qwen-image-3-0'],
  AI_MODELS['seedream-5-0-pro'],
];

export const APIMART_IMAGE_MODELS_LIST: ModelConfig[] = [
  AI_MODELS['gpt-image-2'],
  AI_MODELS['qwen-image-3-0'],
  AI_MODELS['seedream-5-0-pro'],
];

export function getImageModelsList(
  mode?: string,
  provider?: string
): ModelConfig[] {
  if (provider === 'apimart') {
    return APIMART_IMAGE_MODELS_LIST;
  }
  if (mode === 'png-maker' || mode === 'image-to-image') {
    return IMAGE_TO_IMAGE_MODELS_LIST;
  }
  return IMAGE_MODELS_LIST;
}

export const VIDEO_MODELS_LIST: ModelConfig[] = [
  AI_MODELS['seedance-2-5'],
  AI_MODELS['wan-3-0'],
  AI_MODELS['minimax-h3'],
  AI_MODELS['kling-3-0-turbo'],
  AI_MODELS['minimax-hailuo-2-3'],
  AI_MODELS['wan-2-7'],
  AI_MODELS['doubao-seedance-2-0'],
];

export function getVideoModelsList(provider?: string): ModelConfig[] {
  return VIDEO_MODELS_LIST;
}

export const KIE_MUSIC_MODELS_LIST: ModelConfig[] = [
  AI_MODELS['suno-v5'],
  AI_MODELS['suno-v4'],
];

export const APIMART_MUSIC_MODELS_LIST: ModelConfig[] = [
  AI_MODELS['flow-music'],
  AI_MODELS['suno-v5'],
];

export const MUSIC_MODELS_LIST: ModelConfig[] = KIE_MUSIC_MODELS_LIST;

export function getMusicModelsList(provider?: string): ModelConfig[] {
  if (provider === 'apimart') {
    return APIMART_MUSIC_MODELS_LIST;
  }
  return KIE_MUSIC_MODELS_LIST;
}

export const TAB_MODELS: Record<'image' | 'video' | 'music', ModelConfig[]> = {
  image: IMAGE_MODELS_LIST,
  video: VIDEO_MODELS_LIST,
  music: MUSIC_MODELS_LIST,
};

export function calculateCredits(
  modelId: string,
  type: 'image' | 'video' | 'music',
  params?: {
    duration?: string;
    resolution?: string;
  }
): number {
  if (type === 'image') {
    const model = AI_MODELS[modelId];
    const base = model ? model.credits : 6;
    const res = params?.resolution?.toUpperCase();
    let resolutionMultiplier = 1;
    if (res === '2K') resolutionMultiplier = 1.5;
    else if (res === '4K') resolutionMultiplier = 2;
    return Math.round(base * resolutionMultiplier);
  }

  if (type === 'video') {
    const perFiveSecondsAt720p: Record<string, number> = {
      'seedance-2-5': 90,
      'doubao-seedance-2-0': 85,
      'wan-3-0': 26,
      'kling-3-0-turbo': 35,
      'minimax-h3': 30,
      'minimax-hailuo-2-3': 30,
      'wan-2-7': 21,
    };
    const base = perFiveSecondsAt720p[modelId] ?? 45;
    const res = params?.resolution?.toUpperCase();
    const resolutionMultiplier =
      res === '480P'
        ? 0.5
        : res === '1080P'
          ? 2
          : res === '2K'
            ? 1.7
            : res === '4K'
              ? 3.5
              : 1;
    const duration = Math.max(
      1,
      parseInt(String(params?.duration || '5'), 10) || 5
    );
    return Math.ceil((base * resolutionMultiplier * duration) / 5);
  }

  if (type === 'music') {
    const model = AI_MODELS[modelId];
    return model ? model.credits : 12;
  }

  return 6;
}

const DEFAULT_VIDEO_RESOLUTIONS = ['720P', '1080P'];
const DEFAULT_IMAGE_RESOLUTIONS = ['1K', '2K'];
const EMPTY_STRING_ARRAY: string[] = [];

export function getModelSupportedResolutions(
  modelId?: string,
  provider?: string
): string[] {
  if (!modelId) return EMPTY_STRING_ARRAY;
  const model = AI_MODELS[modelId];
  if (!model) return EMPTY_STRING_ARRAY;
  if (provider === 'kie' && model.type === 'video') {
    if (modelId === 'wan-3-0') return ['480P'];
    if (modelId === 'minimax-h3') return ['768P', '1080P'];
    if (modelId === 'minimax-hailuo-2-3') return ['768P'];
    return ['480p', '720p', '1080p'];
  }
  if (provider === 'apimart') {
    switch (modelId) {
      case 'seedance-2-5':
        return ['480p', '720p', '1080p'];
      case 'wan-3-0':
        return ['480P', '720P', '1080P'];
      case 'kling-3-0-turbo':
        return ['720p', '1080p'];
      case 'minimax-h3':
        return ['768P', '2K'];
      case 'minimax-hailuo-2-3':
        return ['768p', '1080p'];
      case 'wan-2-7':
        return ['720P', '1080P'];
      case 'doubao-seedance-2-0':
        return ['480p', '720p', '1080p', '4k'];
      case 'seedream-5-0-pro':
        return ['1K', '1.5K', '2K'];
    }
  }
  if (model.supportedResolutions) return model.supportedResolutions;
  if (model.type === 'video') return DEFAULT_VIDEO_RESOLUTIONS;
  if (model.type === 'image') return DEFAULT_IMAGE_RESOLUTIONS;
  return EMPTY_STRING_ARRAY;
}

export function getModelSupportedDurations(
  modelId?: string,
  provider?: string,
  resolution?: string
): string[] {
  if (!modelId) return ['5s', '10s'];
  const model = AI_MODELS[modelId];
  if (!model || model.type !== 'video') return [];
  if (provider === 'apimart') {
    const range = (start: number, end: number) =>
      Array.from(
        { length: end - start + 1 },
        (_, index) => `${start + index}s`
      );
    switch (modelId) {
      case 'seedance-2-5':
        return range(4, 30);
      case 'wan-3-0':
        return range(2, 30);
      case 'kling-3-0-turbo':
        return range(3, 15);
      case 'minimax-h3':
      case 'doubao-seedance-2-0':
        return range(4, 15);
      case 'minimax-hailuo-2-3':
        return resolution?.toLowerCase() === '1080p' ? ['6s'] : ['6s', '10s'];
      case 'wan-2-7':
        return range(2, 15);
    }
  }
  return model.supportedDurations ?? ['5s', '10s'];
}

export function supportsModelAspectRatio(
  modelId?: string,
  provider?: string,
  hasImageInput = false
): boolean {
  if (provider !== 'apimart' || !modelId) return true;
  if (modelId === 'minimax-hailuo-2-3') return false;
  if (!hasImageInput) return true;
  return ![
    'seedance-2-5',
    'doubao-seedance-2-0',
    'kling-3-0-turbo',
    'minimax-h3',
    'wan-2-7',
  ].includes(modelId);
}

export function getModelMaxPromptLength(
  modelId?: string,
  provider?: string,
  mode?: string
): number | undefined {
  if (!modelId) return undefined;
  const modelType = AI_MODELS[modelId]?.type;
  const fallback =
    modelType === 'video' ? 3000 : modelType === 'music' ? 3000 : 5000;

  if (!provider) return fallback;

  if (provider === 'kie') {
    const limits: Record<string, number> = {
      'nano-banana-2': 20000,
      'nano-banana-pro': 5000,
      'gpt-image-2': 20000,
      'gpt-image-2-5-flare': 20000,
      'gpt-image-2-5-sunburst': 20000,
      'gpt-image-2-5-flare-text-to-image': 20000,
      'gpt-image-2-5-flare-image-to-image': 20000,
      'gpt-image-2-5-sunburst-text-to-image': 20000,
      'gpt-image-2-5-sunburst-image-to-image': 20000,
      'qwen-image-3-0': 5000,
      'seedream-5-0-pro': 5000,
      'seedance-2-5': 30000,
      'wan-3-0': 20000,
      'kling-3-0-turbo': 2500,
      'minimax-h3': 7000,
      'wan-2-7': 5000,
      'doubao-seedance-2-0': 20000,
      'suno-v5': 3000,
      'suno-v4': 3000,
    };
    if (modelId === 'minimax-hailuo-2-3') {
      return mode === 'image-to-video' ? 5000 : 1500;
    }
    return limits[modelId] ?? fallback;
  }

  if (provider === 'apimart') {
    const limits: Record<string, number> = {
      'wan-3-0': 20000,
      'kling-3-0-turbo': 3072,
      'minimax-h3': 7000,
      'minimax-hailuo-2-3': 2000,
      'wan-2-7': 5000,
      'doubao-seedance-2-0': 4000,
      'suno-v5': 3000,
    };
    return limits[modelId] ?? fallback;
  }

  return fallback;
}

export function getModelMaxImages(
  modelId?: string,
  type?: 'image' | 'video' | 'music'
): number {
  if (modelId && AI_MODELS[modelId]?.maxImages !== undefined) {
    return AI_MODELS[modelId].maxImages!;
  }
  if (type === 'video') return 2;
  if (type === 'music') return 0;
  return 3;
}

export const PNG_MAKER_FIXED_PROMPT = `请精准移除图片主体之外的所有背景。
要求：
* 完整保留原图片主体，不改变主体的形状、比例、颜色、材质和细节
* 精确识别主体边缘，尤其处理好头发、毛发、透明区域、细小物体和复杂轮廓
* 不要裁切主体，不要遗漏主体边缘
* 去除原有背景、阴影、杂物和无关元素
* 主体边缘自然、平滑、干净，不出现白边、黑边、锯齿、毛边或背景残留
* 不对主体进行美化、重绘、变形或风格化
* 保持原始主体的真实质感和细节
* 输出透明背景 PNG
* 主体位置和尺寸尽量保持与原图一致
* 背景必须是 Alpha 透明通道
* 不要生成白色背景
* 不要生成灰白棋盘格
* 不要把棋盘格作为图片实际内容
* 棋盘格仅用于表示“透明区域”，最终导出的 PNG 中该区域应为完全透明
* 主体之外的所有区域均设置为透明
* 保留主体完整、边缘干净自然
* 导出 PNG，并确保文件包含透明 Alpha 通道
核心要求：只移除背景，不修改主体。`;
