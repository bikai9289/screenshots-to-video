import { afterEach, describe, expect, it, vi } from 'vitest';

import { SeeAPIClient, SeeAPIError } from './seeapi';

afterEach(() => vi.unstubAllGlobals());
describe('SeeAPI asynchronous generation contract', () => {
  it('sends a stable idempotency key and documented model-specific input', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            generation: { id: 'task_123', status: 'processing' },
          }),
          { status: 202 }
        )
      );
    vi.stubGlobal('fetch', transport);
    const client = new SeeAPIClient('test-secret');
    const result = await client.create('project_1', {
      images: ['https://assets.example.test/a.png'],
      prompt: 'Show the chart',
      duration: 5,
      aspectRatio: '16:9',
    });
    expect(result).toEqual({
      id: 'task_123',
      status: 'processing',
      videoUrl: null,
    });
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe('https://api.seeapi.com/v1/generations');
    expect(init.headers['Idempotency-Key']).toBe('project_1');
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'seedance-2-fast',
      endpoint: 'reference-to-video',
      provider: 'seeapi',
      input: {
        reference_images: ['https://assets.example.test/a.png'],
        duration_seconds: 5,
        aspect_ratio: '16:9',
        resolution: '720p',
        generate_audio: false,
      },
    });
  });
  it('selects only a validated HTTPS video asset from successful results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            generation: {
              id: 'task_123',
              status: 'succeeded',
              result: {
                assets: [
                  { type: 'image', url: 'https://cdn.example.test/image.png' },
                  { type: 'video', url: 'https://cdn.example.test/video.mp4' },
                ],
              },
            },
          })
        )
      )
    );
    expect(await new SeeAPIClient('key').query('task_123')).toEqual({
      id: 'task_123',
      status: 'succeeded',
      videoUrl: 'https://cdn.example.test/video.mp4',
    });
  });
  it('never turns a lookup failure or malformed result into a refundable task failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              generation: {
                id: 'task_1',
                status: 'succeeded',
                result: { assets: [] },
              },
            })
          )
        )
    );
    await expect(new SeeAPIClient('key').query('task_1')).rejects.toThrow(
      SeeAPIError
    );
  });
  it('does not expose provider messages; uses manual redirect (Workers-compatible)', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        new Response('secret internal account detail', { status: 401 })
      );
    vi.stubGlobal('fetch', transport);
    await expect(new SeeAPIClient('key').query('task_1')).rejects.toMatchObject(
      { message: 'SEEAPI_HTTP_401', status: 401 }
    );
    expect(transport.mock.calls[0][1].redirect).toBe('manual');
  });
  it('rejects unexpected task identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              generation: { id: 'task_other', status: 'failed' },
            })
          )
        )
    );
    await expect(new SeeAPIClient('key').query('task_1')).rejects.toThrow(
      'SEEAPI_INVALID_RESPONSE'
    );
  });
});
