import { expect, test } from '@playwright/test';

test('scenario pages are crawlable, localized and linked by sitemap', async ({
  request,
}) => {
  const paths = [
    '/screenshot-to-demo-video',
    '/screenshot-to-app-store-preview-video',
    '/feature-announcement-video',
  ];
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of paths) {
    for (const prefix of ['', '/zh']) {
      const url = prefix + path;
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toMatch(/<h1>[^<]+<\/h1>/);
      expect(html).not.toContain('landing.useCases.');
      expect(html).not.toContain('????');
      expect(html).toContain('rel="canonical"');
      expect(html).toContain(`screenshotstovideo.com${url}`);
      expect(html).toMatch(/hreflang="zh"/i);
      expect(html).toContain('orbit-10s-20261104.mp4');
      expect(html).toContain('href="' + prefix + '/pricing"');
      expect(sitemap).toContain(`screenshotstovideo.com${url}`);
    }
  }
  const appHtml = await (await request.get(paths[1])).text();
  expect(appHtml).toContain('not a guaranteed App Store-ready preview');
  expect(appHtml).toContain('developer.apple.com');
});

test('credit prices and attributed privacy facts are present without JavaScript', async ({
  request,
}) => {
  const html = (await (await request.get('/pricing')).text()).replace(
    /<!--.*?-->/g,
    ''
  );
  for (const amount of ['3.90', '9.90', '19.90', '29.90'])
    expect(html).toContain('$' + amount);
  expect(html).toContain('SeeAPI states');
  expect(html).not.toContain('rounded average');
  expect(html).toContain('10 video credits');
  expect(html).toContain('no scheduled automatic expiry');
});

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
    ['/', 'A task reserves 1, 2 or 3 video credits'],
    ['/zh', '任务分别预留 1、2、3 个视频额度'],
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('5 MiB');
    expect(body).toContain('20 MiB');
    expect(body).toContain(failure);
  }
});
