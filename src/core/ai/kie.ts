import { fetchWithTimeout } from './fetch';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AISong,
  AITaskResult,
  AITaskStatus,
  AIVideo,
  extractMediaUrl,
  normalizeAIModel,
  SaveFilesFunction,
  UuidFunction,
} from './types';

const defaultUuid: UuidFunction = () => crypto.randomUUID();

function normalizeKieImageModel(model: string, imageToImage: boolean): string {
  const suffix = imageToImage ? 'image-to-image' : 'text-to-image';
  if (model === 'gpt-image-2') return `gpt-image-2-${suffix}`;
  if (model === 'qwen-image-3-0') return `qwen3/${suffix}`;
  if (model === 'seedream-5-0-pro') return `seedream/5-pro-${suffix}`;
  if (model === 'nano-banana-2') return 'nano-banana-2-lite';
  if (model === 'nano-banana-pro') {
    return imageToImage ? 'google/nano-banana-edit' : 'google/nano-banana';
  }
  return normalizeAIModel(model, 'image');
}

function isKieSeedreamImageModel(model: string): boolean {
  return (
    model === 'seedream-5-0-pro' ||
    model === 'seedream-5.0-pro' ||
    model === 'seedream/5-pro-text-to-image' ||
    model === 'seedream/5-pro-image-to-image'
  );
}

/** KIE Seedream uses quality basic/high (not resolution 1K/2K). */
function normalizeKieSeedreamQuality(value: unknown): 'basic' | 'high' {
  const r = String(value || '')
    .trim()
    .toLowerCase();
  if (r === 'high' || r === '2k' || r === '1.5k') return 'high';
  return 'basic';
}

function normalizeKieVideoModel(model: string, imageToVideo: boolean): string {
  if (model === 'seedance-2-5') return 'bytedance/seedance-2-5';
  if (model === 'doubao-seedance-2-0') return 'bytedance/seedance-2';
  if (model === 'wan-3-0') return 'wan/3-0-video';
  if (model === 'wan-2-7') {
    return imageToVideo ? 'wan/2-7-image-to-video' : 'wan/2-7-text-to-video';
  }
  if (model === 'kling-3-0-turbo') {
    return imageToVideo
      ? 'kling/v3-turbo-image-to-video'
      : 'kling/v3-turbo-text-to-video';
  }
  if (model === 'minimax-h3') {
    return imageToVideo
      ? 'minimax-h3/image-to-video'
      : 'minimax-h3/text-to-video';
  }
  if (model === 'minimax-hailuo-2-3') {
    return imageToVideo
      ? 'hailuo/2-3-image-to-video-pro'
      : 'hailuo/02-text-to-video-pro';
  }
  return normalizeAIModel(model, 'video');
}

function normalizeKieVideoResolution(model: string, value: unknown): string {
  const requested = String(value || '').trim();
  if (model === 'wan-3-0') return '480P';
  if (model === 'minimax-h3') {
    return ['768P', '2K'].includes(requested.toUpperCase())
      ? requested.toUpperCase()
      : '768P';
  }
  if (model === 'minimax-hailuo-2-3') return '768P';
  if (model === 'kling-3-0-turbo') {
    return ['720p', '1080p'].includes(requested.toLowerCase())
      ? requested.toLowerCase()
      : '720p';
  }
  if (model === 'wan-2-7') {
    return ['720p', '1080p'].includes(requested.toLowerCase())
      ? requested.toLowerCase()
      : '720p';
  }
  const normalized = requested.toLowerCase();
  return ['480p', '720p', '1080p'].includes(normalized) ? normalized : '720p';
}

function normalizeKieVideoAspectRatio(model: string, value: unknown): string {
  const requested = String(value || '').trim();
  if (requested && requested !== 'Auto' && requested !== 'landscape') {
    return requested;
  }
  if (model === 'wan-3-0') return 'adaptive';
  return '16:9';
}

/**
 * Kie configs
 * @docs https://kie.ai/
 */
export interface KieConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
  customStorage?: boolean;
  saveFiles?: SaveFilesFunction;
  uuid?: UuidFunction;
}

/**
 * Kie provider
 * @docs https://kie.ai/
 */
export class KieProvider implements AIProvider {
  readonly name = 'kie';
  configs: KieConfigs;

  private baseUrl = 'https://api.kie.ai/api/v1';

  constructor(configs: KieConfigs) {
    this.configs = configs;
    this.baseUrl = (configs.baseUrl || this.baseUrl).replace(/\/+$/, '');
  }

  private getUuid(): string {
    return (this.configs.uuid || defaultUuid)();
  }

  private async trySaveFiles(files: AIFile[]): Promise<AIFile[] | undefined> {
    if (!this.configs.saveFiles) return undefined;
    try {
      return await this.configs.saveFiles(files);
    } catch (error) {
      console.error('save files failed:', error);
      return undefined;
    }
  }

  async generateMusic({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/generate`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    let kieModel = 'V5';
    if (params.model === 'suno-v4' || params.model === 'V4') {
      kieModel = 'V4';
    } else if (params.model === 'suno-v3.5' || params.model === 'V3_5') {
      kieModel = 'V3_5';
    } else {
      kieModel = 'V5';
    }

    let payload: any = {
      prompt: params.prompt,
      model: kieModel,
      callBackUrl: params.callbackUrl,
      instrumental: Boolean(params.options?.instrumental),
    };

    if (params.options && params.options.customMode) {
      payload.customMode = true;
      payload.title = params.options.title;
      payload.style = params.options.style;
      payload.instrumental = Boolean(params.options.instrumental);
      if (!params.options.instrumental) {
        payload.prompt = params.options.lyrics;
      }
    } else {
      payload.customMode = false;
      payload.prompt = params.prompt;
      payload.instrumental = Boolean(params.options?.instrumental);
    }

    const resp = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate music failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate music failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateImage({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/createTask`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    if (!params.model) {
      throw new Error('model is required');
    }

    const inputImages =
      params.options?.image_input || params.options?.image_urls;
    if (
      !params.prompt &&
      (!Array.isArray(inputImages) || inputImages.length === 0)
    ) {
      throw new Error('prompt is required');
    }

    let payload: any = {
      model: normalizeKieImageModel(
        params.model,
        Array.isArray(inputImages) && inputImages.length > 0
      ),
      callBackUrl: params.callbackUrl,
      input: {
        prompt: params.prompt,
      },
    };

    if (params.options) {
      const options = params.options;
      const inputImages =
        options.image_input ||
        options.image_urls ||
        (options.image_url ? [options.image_url] : undefined);
      if (inputImages && Array.isArray(inputImages)) {
        payload.input.image_input = inputImages;
      }
      if (options.aspect_ratio && options.aspect_ratio !== 'Auto') {
        payload.input.aspect_ratio = options.aspect_ratio;
      }
      if (options.output_format) {
        payload.input.output_format = options.output_format;
      }
      if (isKieSeedreamImageModel(params.model)) {
        payload.input.quality = normalizeKieSeedreamQuality(
          options.quality ?? options.resolution
        );
      } else if (options.resolution) {
        payload.input.resolution = String(options.resolution);
      }
    }

    if (isKieSeedreamImageModel(params.model)) {
      if (!payload.input.aspect_ratio) {
        payload.input.aspect_ratio = '1:1';
      }
      if (!payload.input.quality) {
        payload.input.quality = 'basic';
      }
    }

    const resp = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate image failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate image failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateVideo({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/createTask`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    if (!params.model) {
      throw new Error('model is required');
    }

    const inputImages =
      (Array.isArray(params.options?.image_input) &&
        params.options.image_input.length > 0 &&
        params.options.image_input) ||
      (Array.isArray(params.options?.image_urls) &&
        params.options.image_urls.length > 0 &&
        params.options.image_urls) ||
      (params.options?.image_url ? [params.options.image_url] : []);

    const isSeedance25 = params.model === 'seedance-2-5';
    const isDoubaoSeedance = params.model === 'doubao-seedance-2-0';
    const isWan30 = params.model === 'wan-3-0';
    const isWan27 = params.model === 'wan-2-7';
    const isMinimaxH3 = params.model === 'minimax-h3';
    const isKling30Turbo = params.model === 'kling-3-0-turbo';
    const isHailuo23 = params.model === 'minimax-hailuo-2-3';
    const hasInputImages = Array.isArray(inputImages) && inputImages.length > 0;
    const isHailuoText = isHailuo23 && !hasInputImages;
    let payload: any = {
      model: normalizeKieVideoModel(params.model, hasInputImages),
      callBackUrl: params.callbackUrl,
      input: {},
    };

    if (!isWan27 && !isHailuo23 && !(isKling30Turbo && hasInputImages)) {
      payload.input.aspect_ratio = normalizeKieVideoAspectRatio(
        params.model,
        params.options?.aspect_ratio
      );
    }

    if (params.prompt) {
      payload.input.prompt = params.prompt;
    }

    if (params.options) {
      const options = params.options;
      const inputImages =
        (Array.isArray(options.image_input) &&
          options.image_input.length > 0 &&
          options.image_input) ||
        (Array.isArray(options.image_urls) &&
          options.image_urls.length > 0 &&
          options.image_urls) ||
        (options.image_url ? [options.image_url] : undefined);
      if (inputImages && Array.isArray(inputImages)) {
        if (isMinimaxH3 || isDoubaoSeedance) {
          if (inputImages[0]) payload.input.first_frame_url = inputImages[0];
          if (inputImages[1]) payload.input.last_frame_url = inputImages[1];
        } else if (isWan27) {
          if (inputImages[0]) payload.input.first_frame_url = inputImages[0];
          if (inputImages[1]) payload.input.last_frame_url = inputImages[1];
        } else if (isHailuo23) {
          if (inputImages[0]) payload.input.image_url = inputImages[0];
        } else if (isKling30Turbo) {
          payload.input.image_urls = inputImages;
        } else {
          // Seedance 2.5 and Wan 3.0 text endpoints do not define image input.
        }
      }
      if (options.aspect_ratio) {
        if (!isWan27 && !isHailuo23 && !(isKling30Turbo && hasInputImages)) {
          payload.input.aspect_ratio = normalizeKieVideoAspectRatio(
            params.model,
            options.aspect_ratio
          );
        }
      }
      if (options.duration && !isHailuoText) {
        const duration = parseInt(String(options.duration), 10);
        if (Number.isFinite(duration)) {
          if (isKling30Turbo || isHailuo23) {
            payload.input.duration = String(
              Math.min(15, Math.max(isHailuo23 ? 6 : 3, duration))
            );
          } else if (isWan27) {
            payload.input.duration = Math.min(15, Math.max(5, duration));
          } else {
            payload.input.duration = Math.min(15, Math.max(4, duration));
          }
        }
      }
      if (options.resolution) {
        if (!isHailuoText) {
          payload.input.resolution = normalizeKieVideoResolution(
            params.model,
            options.resolution
          );
        }
      }
    }
    if (isSeedance25 || isDoubaoSeedance || isWan30 || isMinimaxH3) {
      if (!payload.input.duration) payload.input.duration = 5;
    } else if (isKling30Turbo) {
      if (!payload.input.duration) payload.input.duration = '5';
    } else if (isWan27) {
      if (!payload.input.duration) payload.input.duration = 5;
    } else if (isHailuo23 && !hasInputImages) {
      payload.input.prompt_optimizer = true;
    }
    if (isHailuo23 && hasInputImages && !payload.input.duration) {
      payload.input.duration = '6';
    }
    if (isSeedance25 || isDoubaoSeedance) {
      payload.input.generate_audio = Boolean(
        params.options?.generate_audio ?? false
      );
    }
    if (isWan30) {
      payload.input.audio = Boolean(params.options?.audio ?? true);
    }

    const resp = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate video failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate video failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (
      ![AIMediaType.MUSIC, AIMediaType.IMAGE, AIMediaType.VIDEO].includes(
        params.mediaType
      )
    ) {
      throw new Error(`mediaType not supported: ${params.mediaType}`);
    }

    if (params.mediaType === AIMediaType.MUSIC) {
      return this.generateMusic({ params });
    } else if (params.mediaType === AIMediaType.IMAGE) {
      return this.generateImage({ params });
    } else if (params.mediaType === AIMediaType.VIDEO) {
      return this.generateVideo({ params });
    }

    throw new Error(`mediaType not supported: ${params.mediaType}`);
  }

  async queryImage({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetchWithTimeout(apiUrl, { method: 'GET', headers });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(msg);
    }

    if (!data || !data.state) {
      throw new Error(`query failed`);
    }

    let images: AIImage[] | undefined = undefined;

    if (data.resultJson) {
      try {
        const resultJson =
          typeof data.resultJson === 'string'
            ? JSON.parse(data.resultJson)
            : data.resultJson;
        const resultUrls =
          resultJson.resultUrls ||
          resultJson.images ||
          resultJson.result ||
          resultJson.output;
        if (Array.isArray(resultUrls)) {
          images = resultUrls.map((image: any) => ({
            id: '',
            createTime: new Date(data.createTime || Date.now()),
            imageUrl:
              typeof image === 'string'
                ? image
                : image?.url || image?.imageUrl || '',
          }));
        }
      } catch {}
    }

    if (!images || images.length === 0) {
      const fallbackUrl = extractMediaUrl(data);
      if (fallbackUrl) {
        images = [
          {
            id: '',
            createTime: new Date(data.createTime || Date.now()),
            imageUrl: fallbackUrl,
          },
        ];
      }
    }

    const taskStatus = this.mapImageStatus(data.state);

    if (
      taskStatus === AITaskStatus.SUCCESS &&
      images &&
      images.length > 0 &&
      this.configs.customStorage
    ) {
      const filesToSave: AIFile[] = [];
      images.forEach((image, index) => {
        if (image.imageUrl) {
          filesToSave.push({
            url: image.imageUrl,
            contentType: 'image/png',
            key: `kie/image/${this.getUuid()}.png`,
            index: index,
            type: 'image',
          });
        }
      });

      if (filesToSave.length > 0) {
        const uploadedFiles = await this.trySaveFiles(filesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && images && file.index !== undefined) {
              const image = images[file.index];
              if (image) {
                image.imageUrl = file.url;
              }
            }
          });
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images,
        status: data.state,
        errorCode: data.failCode,
        errorMessage: data.failMsg,
        createTime: new Date(data.createTime || Date.now()),
      },
      taskResult: data,
    };
  }

  async queryVideo({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetchWithTimeout(apiUrl, { method: 'GET', headers });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(msg);
    }

    if (!data || !data.state) {
      throw new Error(`query failed`);
    }

    let videos: AIVideo[] | undefined = undefined;

    if (data.resultJson) {
      try {
        const resultJson =
          typeof data.resultJson === 'string'
            ? JSON.parse(data.resultJson)
            : data.resultJson;
        const resultUrls =
          resultJson.resultUrls ||
          resultJson.videos ||
          resultJson.result ||
          resultJson.output;
        if (Array.isArray(resultUrls)) {
          videos = resultUrls.map((video: any) => ({
            id: '',
            createTime: new Date(data.createTime || Date.now()),
            videoUrl:
              typeof video === 'string'
                ? video
                : video?.url || video?.videoUrl || '',
          }));
        }
      } catch {}
    }

    if (!videos || videos.length === 0) {
      const fallbackUrl = extractMediaUrl(data);
      if (fallbackUrl) {
        videos = [
          {
            id: '',
            createTime: new Date(data.createTime || Date.now()),
            videoUrl: fallbackUrl,
          },
        ];
      }
    }

    const taskStatus = this.mapImageStatus(data.state);

    if (
      taskStatus === AITaskStatus.SUCCESS &&
      videos &&
      videos.length > 0 &&
      this.configs.customStorage
    ) {
      const filesToSave: AIFile[] = [];
      videos.forEach((video, index) => {
        if (video.videoUrl) {
          filesToSave.push({
            url: video.videoUrl,
            contentType: 'video/mp4',
            key: `kie/video/${this.getUuid()}.mp4`,
            index: index,
            type: 'video',
          });
        }
      });

      if (filesToSave.length > 0) {
        const uploadedFiles = await this.trySaveFiles(filesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && videos && file.index !== undefined) {
              const video = videos[file.index];
              if (video) {
                video.videoUrl = file.url;
              }
            }
          });
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        videos,
        status: data.state,
        errorCode: data.failCode,
        errorMessage: data.failMsg,
        createTime: new Date(data.createTime || Date.now()),
      },
      taskResult: data,
    };
  }

  async query({
    taskId,
    mediaType,
  }: {
    taskId: string;
    mediaType?: AIMediaType;
  }): Promise<AITaskResult> {
    if (mediaType === AIMediaType.IMAGE) {
      return this.queryImage({ taskId });
    }

    if (mediaType === AIMediaType.VIDEO) {
      return this.queryVideo({ taskId });
    }

    const apiUrl = `${this.baseUrl}/generate/record-info?taskId=${taskId}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetchWithTimeout(apiUrl, { method: 'GET', headers });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(msg);
    }

    if (!data || !data.status) {
      throw new Error(`query failed`);
    }

    const songs: AISong[] = data?.response?.sunoData?.map((song: any) => ({
      id: song.id,
      createTime: new Date(song.createTime),
      audioUrl: song.audioUrl,
      imageUrl: song.imageUrl,
      duration: song.duration,
      prompt: song.prompt,
      title: song.title,
      tags: song.tags,
      style: song.style,
      model: song.modelName,
      artist: song.artist,
      album: song.album,
    }));

    const taskStatus = this.mapStatus(data.status);

    if (
      taskStatus === AITaskStatus.SUCCESS &&
      songs &&
      songs.length > 0 &&
      this.configs.customStorage
    ) {
      const audioFilesToSave: AIFile[] = [];
      const imageFilesToSave: AIFile[] = [];

      songs.forEach((song, index) => {
        if (song.audioUrl) {
          audioFilesToSave.push({
            url: song.audioUrl,
            contentType: 'audio/mpeg',
            key: `kie/audio/${this.getUuid()}.mp3`,
            index: index,
            type: 'audio',
          });
        }
        if (song.imageUrl) {
          imageFilesToSave.push({
            url: song.imageUrl,
            contentType: 'image/png',
            key: `kie/image/${this.getUuid()}.png`,
            index: index,
            type: 'image',
          });
        }
      });

      if (audioFilesToSave.length > 0) {
        const uploadedFiles = await this.trySaveFiles(audioFilesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && songs && file.index !== undefined) {
              const song = songs[file.index];
              song.audioUrl = file.url;
            }
          });
        }
      }

      if (imageFilesToSave.length > 0) {
        const uploadedFiles = await this.trySaveFiles(imageFilesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && songs && file.index !== undefined) {
              const song = songs[file.index];
              song.imageUrl = file.url;
            }
          });
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        songs,
        status: data.status,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        createTime: new Date(data.createTime),
      },
      taskResult: data,
    };
  }

  private mapImageStatus(status: string): AITaskStatus {
    switch (String(status).toLowerCase()) {
      case 'waiting':
        return AITaskStatus.PENDING;
      case 'queuing':
        return AITaskStatus.PENDING;
      case 'generating':
        return AITaskStatus.PROCESSING;
      case 'success':
        return AITaskStatus.SUCCESS;
      case 'fail':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }

  private mapStatus(status: string): AITaskStatus {
    switch (String(status).toUpperCase()) {
      case 'PENDING':
        return AITaskStatus.PENDING;
      case 'TEXT_SUCCESS':
        return AITaskStatus.PROCESSING;
      case 'FIRST_SUCCESS':
        return AITaskStatus.PROCESSING;
      case 'SUCCESS':
        return AITaskStatus.SUCCESS;
      case 'CREATE_TASK_FAILED':
      case 'GENERATE_AUDIO_FAILED':
      case 'CALLBACK_EXCEPTION':
      case 'SENSITIVE_WORD_ERROR':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }
}
