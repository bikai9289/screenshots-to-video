import {
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
  ApimartProvider,
  extractProviderTaskId,
  FalProvider,
  KieProvider,
  ReplicateProvider,
} from '@/core/ai';
import { getAllConfigs } from '@/modules/config/service';

import { buildMockQueryResult } from './mock';

export * from './mock';

export interface GenerateMediaParams {
  mediaType: 'image' | 'video' | 'music' | 'text';
  prompt: string;
  model?: string;
  options?: Record<string, any>;
  imageUrl?: string;
  imageUrls?: string[];
  callbackUrl?: string;
}

/**
 * Get active AI Provider based on configured API keys in Settings.
 * Priority: APIMart > KIE > Fal > Replicate
 */
export async function getAIProvider(
  providerName?: string
): Promise<AIProvider | null> {
  const configs = await getAllConfigs();

  if (
    (!providerName || providerName === 'apimart') &&
    configs.apimart_api_key?.trim()
  ) {
    return new ApimartProvider({
      apiKey: configs.apimart_api_key.trim(),
      baseUrl: configs.apimart_base_url?.trim(),
    });
  }

  if (
    (!providerName || providerName === 'kie') &&
    configs.kie_api_key?.trim()
  ) {
    return new KieProvider({
      apiKey: configs.kie_api_key.trim(),
      baseUrl: configs.kie_base_url?.trim(),
    });
  }

  if (
    (!providerName || providerName === 'fal') &&
    configs.fal_api_key?.trim()
  ) {
    return new FalProvider({
      apiKey: configs.fal_api_key.trim(),
    });
  }

  if (
    (!providerName || providerName === 'replicate') &&
    configs.replicate_api_token?.trim()
  ) {
    return new ReplicateProvider({
      apiToken: configs.replicate_api_token.trim(),
    });
  }

  return null;
}

export async function getActiveAIProvider(): Promise<AIProvider | null> {
  return getAIProvider();
}

export async function generateMedia(
  params: GenerateMediaParams,
  provider?: AIProvider
): Promise<AITaskResult> {
  const activeProvider = provider || (await getActiveAIProvider());

  if (!activeProvider) {
    throw new Error(
      'No AI Provider configured. Please configure APIMart (https://apimart.ai/) or KIE (https://kie.ai/) in Admin Settings -> AI.'
    );
  }

  let mediaType = AIMediaType.IMAGE;
  if (params.mediaType === 'video') mediaType = AIMediaType.VIDEO;
  if (params.mediaType === 'music') mediaType = AIMediaType.MUSIC;

  const options = { ...params.options };
  const imgs =
    params.imageUrls && params.imageUrls.length > 0
      ? params.imageUrls
      : params.imageUrl
        ? [params.imageUrl]
        : [];

  if (imgs.length > 0) {
    options.image_url = imgs[0];
    options.image_urls = imgs;
    options.image_input = imgs;
  }

  return await activeProvider.generate({
    params: {
      mediaType,
      prompt: params.prompt,
      model: params.model,
      options,
      callbackUrl: params.callbackUrl,
    },
  });
}

export async function queryAITask(
  taskId: string,
  mediaType?: string,
  model?: string,
  providerName?: string,
  existingTask?: any
): Promise<AITaskResult> {
  const isMock = taskId.startsWith('mock_') || providerName === 'mock';

  if (isMock) {
    return buildMockQueryResult({
      taskId,
      mediaType,
      prompt: existingTask?.prompt,
      taskInfo: existingTask?.taskInfo,
    });
  }

  const provider = await getAIProvider(
    providerName && providerName !== 'ai' ? providerName : undefined
  );
  if (!provider) {
    throw new Error('No AI Provider configured');
  }

  let vendorTaskId = taskId;
  if (existingTask?.taskResult) {
    try {
      const parsed =
        typeof existingTask.taskResult === 'string'
          ? JSON.parse(existingTask.taskResult)
          : existingTask.taskResult;
      const extracted =
        extractProviderTaskId(parsed.taskResult) ||
        extractProviderTaskId(parsed);
      if (extracted) {
        vendorTaskId = extracted;
      }
    } catch {}
  }

  if (typeof provider.query === 'function') {
    return await provider.query({ taskId: vendorTaskId, mediaType, model });
  }

  return {
    taskStatus: AITaskStatus.SUCCESS,
    taskId,
  };
}
