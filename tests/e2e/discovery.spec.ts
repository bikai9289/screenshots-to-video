import { expect, test } from '@playwright/test';

test('discovery files expose current public facts and a genuinely expanded version', async ({
  request,
}) => {
  const shortResponse = await request.get('/llms.txt');
  const fullResponse = await request.get('/llms-full.txt');
  expect(shortResponse.status()).toBe(200);
  expect(fullResponse.status()).toBe(200);
  expect(shortResponse.headers()['content-type']).toContain('text/plain');
  const short = await shortResponse.text();
  const full = await fullResponse.text();
  expect(short).toContain('USD 9.90');
  expect(short).toContain('5, 10 or 15 seconds');
  expect(short).toContain('Anonymous enquiry form');
  expect(full.length).toBeGreaterThan(short.length);
  expect(full).toContain('orbit-10s-20261104.mp4');
  expect(full).toContain('orbit-15s-20261104.mp4');
});

test('search bots have explicit public access and localized private boundaries', async ({
  request,
}) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('User-agent: OAI-SearchBot');
  expect(body).toContain('User-agent: Claude-SearchBot');
  expect(body).toContain('Disallow: /zh/settings');
  expect(body).toContain('Disallow: /zh/admin');
});

test('both homepages explain real limits and failure handling in initial HTML', async ({
  request,
}) => {
  for (const [path, failure] of [
    ['/', 'A task reserves one paid render.'],
    ['/zh', '任务受理时会预留一次制作次数。'],
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('5 MiB');
    expect(body).toContain('20 MiB');
    expect(body).toContain(failure);
  }
});
