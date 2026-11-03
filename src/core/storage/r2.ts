import type {
  StorageConfigs,
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
} from '.';

/**
 * R2 storage provider configs
 * @docs https://developers.cloudflare.com/r2/
 */
export interface R2Configs extends StorageConfigs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  uploadPath?: string;
  region?: string;
  endpoint?: string;
  publicDomain?: string;
}

/**
 * R2 storage provider implementation
 * @website https://www.cloudflare.com/products/r2/
 */
export class R2Provider implements StorageProvider {
  readonly name = 'r2';
  configs: R2Configs;

  constructor(configs: R2Configs) {
    this.configs = configs;
  }

  private getUploadPath() {
    let uploadPath = this.configs.uploadPath || 'uploads';
    if (uploadPath.startsWith('/')) {
      uploadPath = uploadPath.slice(1);
    }
    if (uploadPath.endsWith('/')) {
      uploadPath = uploadPath.slice(0, -1);
    }
    return uploadPath;
  }

  private getEndpoint() {
    let endpoint =
      this.configs.endpoint ||
      `https://${this.configs.accountId}.r2.cloudflarestorage.com`;
    return endpoint.replace(/\/+$/, '');
  }

  getPublicUrl = (options: { key: string; bucket?: string }) => {
    const uploadBucket = options.bucket || this.configs.bucket;
    const uploadPath = this.getUploadPath();
    const cleanKey = options.key.startsWith('/')
      ? options.key.slice(1)
      : options.key;
    const url = `${this.getEndpoint()}/${uploadBucket}/${uploadPath}/${cleanKey}`;
    if (this.configs.publicDomain) {
      const cleanDomain = this.configs.publicDomain.replace(/\/+$/, '');
      return `${cleanDomain}/${uploadPath}/${cleanKey}`;
    }
    return url;
  };

  exists = async (options: { key: string; bucket?: string }) => {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) return false;
      const uploadPath = this.getUploadPath();
      const cleanKey = options.key.startsWith('/')
        ? options.key.slice(1)
        : options.key;
      const url = `${this.getEndpoint()}/${uploadBucket}/${uploadPath}/${cleanKey}`;

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const response = await client.fetch(
        new Request(url, {
          method: 'HEAD',
        })
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      const uploadPath = this.getUploadPath();
      const cleanKey = options.key.startsWith('/')
        ? options.key.slice(1)
        : options.key;

      // R2 endpoint format: https://<accountId>.r2.cloudflarestorage.com/<bucket>/<uploadPath>/<key>
      const url = `${this.getEndpoint()}/${uploadBucket}/${uploadPath}/${cleanKey}`;

      const { AwsClient } = await import('aws4fetch');

      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      let response: Response | null = null;
      let lastError: any = null;

      // Retry up to 2 times
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const request = new Request(url, {
            method: 'PUT',
            headers,
            body: bodyArray as any,
          });
          response = await client.fetch(request);
          if (response && response.ok) break;
        } catch (err: any) {
          lastError = err;
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      if (!response || !response.ok) {
        const errMsg =
          lastError?.cause?.message ||
          lastError?.message ||
          (response
            ? `HTTP ${response.status} ${response.statusText}`
            : 'Upload failed');
        return {
          success: false,
          error: `R2 Upload failed: ${errMsg}`,
          provider: this.name,
        };
      }

      const publicUrl =
        this.getPublicUrl({ key: cleanKey, bucket: uploadBucket }) || url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        uploadPath: uploadPath,
        key: cleanKey,
        filename: cleanKey.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error: any) {
      const msg = error?.cause?.message || error?.message || 'Unknown error';
      return {
        success: false,
        error: `R2 error: ${msg}`,
        provider: this.name,
      };
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
          provider: this.name,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No body in response',
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      return this.uploadFile({
        body,
        key: options.key,
        bucket: options.bucket,
        contentType: options.contentType,
        disposition: options.disposition,
      });
    } catch (error: any) {
      const msg = error?.cause?.message || error?.message || 'Unknown error';
      return {
        success: false,
        error: `R2 download/upload error: ${msg}`,
        provider: this.name,
      };
    }
  }
}

/**
 * Create R2 provider with configs
 */
export function createR2Provider(configs: R2Configs): R2Provider {
  return new R2Provider(configs);
}
