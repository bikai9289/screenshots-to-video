import { AwsClient } from 'aws4fetch';

import { StudioError } from '@/lib/screenshots-contract';

export function screenshotStorageReady(config: Record<string, string>) {
  return !!(
    config.screenshots_bucket &&
    config.r2_access_key &&
    config.r2_secret_key &&
    (config.r2_endpoint || config.r2_account_id)
  );
}

export class ScreenshotStorage {
  private client: AwsClient;
  private endpoint: string;
  private bucket: string;
  constructor(config: Record<string, string>) {
    if (!screenshotStorageReady(config))
      throw new StudioError('SERVICE_UNAVAILABLE');
    this.client = new AwsClient({
      accessKeyId: config.r2_access_key,
      secretAccessKey: config.r2_secret_key,
      region: 'auto',
      service: 's3',
    });
    const endpoint = new URL(
      config.r2_endpoint ||
        `https://${config.r2_account_id}.r2.cloudflarestorage.com`
    );
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search
    )
      throw new StudioError('SERVICE_UNAVAILABLE');
    this.endpoint = endpoint.href.replace(/\/$/, '');
    this.bucket = config.screenshots_bucket;
  }
  private url(key: string) {
    return `${this.endpoint}/${encodeURIComponent(this.bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  async put(key: string, body: Uint8Array, mimeType: string) {
    const response = await this.client.fetch(this.url(key), {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: body as BodyInit,
    });
    if (!response.ok) throw new StudioError('SERVICE_UNAVAILABLE');
  }
  async signedGet(key: string) {
    const url = new URL(this.url(key));
    url.searchParams.set('X-Amz-Expires', '3600');
    return (
      await this.client.sign(url, { method: 'GET', aws: { signQuery: true } })
    ).url;
  }
  async remove(key: string) {
    const response = await this.client.fetch(this.url(key), {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 404)
      throw new StudioError('SERVICE_UNAVAILABLE');
  }
}
