import { expect, test } from '@playwright/test';

test('pricing has independent localized search metadata in initial HTML', async ({
  request,
}) => {
  for (const [path, title, heading] of [
    [
      '/pricing',
      'Screenshots to Video Pricing | Packs from $9.90',
      'A plan for your next launch.',
    ],
    [
      '/zh/pricing',
      '截图转视频价格 | 一次性套餐低至 $9.90',
      '为下一次发布，选个合适的方案。',
    ],
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`<h1>${heading}</h1>`);
    expect(html).not.toContain('Purchasing is not available right now');
  }
});

test('pricing distinguishes loading, available and unavailable purchases', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let available = true;
  await page.route('**/api/config/public', async (route) => {
    await gate;
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          screenshots_purchase_available: String(available),
        },
      },
    });
  });
  await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status')).toContainText(
    'Checking purchase availability'
  );
  await expect(page.locator('.pack button').first()).toBeDisabled();
  release();
  await expect(page.locator('.pack button').first()).toBeEnabled();
  await expect(page.getByRole('status')).toHaveCount(0);
  available = false;
  await page.reload();
  await expect(page.getByRole('status')).toContainText(
    'Purchasing is not available right now'
  );
  await expect(page.locator('.pack button').first()).toBeDisabled();
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute(
    'href',
    '/contact'
  );
});

test('pricing config errors show a recovery action rather than a closed shop', async ({
  page,
}) => {
  await page.route('**/api/config/public', (route) =>
    route.fulfill({
      status: 503,
      json: { code: 1, message: 'Unavailable' },
    })
  );
  await page.goto('/pricing');
  await expect(page.getByRole('status')).toContainText(
    'Could not check purchase availability'
  );
  await expect(
    page.getByRole('button', { name: 'Try again', exact: true })
  ).toBeVisible();
  await expect(page.locator('.pack button').first()).toBeDisabled();
  await page.unroute('**/api/config/public');
  await page.route('**/api/config/public', (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: { screenshots_purchase_available: 'true' },
      },
    })
  );
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.pack button').first()).toBeEnabled();
});

test('concurrent bilingual requests keep their requested locale', async ({
  request,
}) => {
  for (let round = 0; round < 3; round++) {
    await Promise.all(
      ['/', '/zh', '/pricing', '/zh/pricing', '/contact', '/zh/contact'].map(
        async (path) => {
          const locale = path.startsWith('/zh') ? 'zh' : 'en';
          const response = await request.get(path, {
            maxRedirects: 0,
            headers: {
              Cookie: `PARAGLIDE_LOCALE=${locale === 'zh' ? 'en' : 'zh'}`,
              'Sec-Fetch-Dest': 'document',
            },
          });
          expect(response.status(), path).toBe(200);
          expect(await response.text()).toContain(`lang="${locale}"`);
        }
      )
    );
  }
});
