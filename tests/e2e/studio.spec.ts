import { expect, test, type Page } from '@playwright/test';

async function account(page: Page, balance = 3) {
  await page.route('**/api/auth/get-session**', (route) =>
    route.fulfill({
      json: {
        session: {
          id: 'session-ui',
          userId: 'ui-user',
          token: 'test-only-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
        user: {
          id: 'ui-user',
          email: 'ui@example.test',
          name: 'UI Test',
          emailVerified: true,
        },
      },
    })
  );
  await page.route('**/api/screenshots/account', (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          remainingCredits: balance,
          legacyRenders: 0,
          serviceAvailable: true,
          tasks: [],
        },
      },
    })
  );
}

test('studio keeps a local draft, accepts supported screenshots, and exposes real settings', async ({
  page,
}) => {
  await account(page);
  await page.goto('/studio');
  await expect(page.locator('input[type=file]')).toBeEnabled();
  await page
    .locator('input[type=file]')
    .setInputFiles('public/imgs/screenshots-to-video/orbit-dashboard.png');
  await expect(page.locator('.studio-screens li')).toHaveCount(1);
  await page
    .getByLabel('Your direction', { exact: true })
    .fill('Zoom into the monthly chart.');
  await page
    .getByRole('combobox', { name: 'Duration', exact: true })
    .selectOption('10');
  await page.getByRole('radio', { name: '9:16', exact: true }).check();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('keyval-store');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const draft = await new Promise<any>((resolve, reject) => {
          const request = database
            .transaction('keyval')
            .objectStore('keyval')
            .get('stv:draft:ui-user');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        database.close();
        return draft?.settings;
      })
    )
    .toEqual({
      prompt: 'Zoom into the monthly chart.',
      duration: 10,
      aspectRatio: '9:16',
    });
  await page.reload();
  await expect(page.getByLabel('Your direction', { exact: true })).toHaveValue(
    'Zoom into the monthly chart.'
  );
  await expect(page.locator('.studio-screens li')).toHaveCount(1);
  await expect(
    page.getByRole('combobox', { name: 'Duration', exact: true })
  ).toHaveValue('10');
  await expect(
    page.getByRole('radio', { name: '9:16', exact: true })
  ).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  ).toBe(false);
  await page.screenshot({
    path: 'test-results/studio-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Clear draft', exact: true }).click();
  await expect(page.locator('.studio-screens li')).toHaveCount(0);
});

test('lost create responses recover with the same idempotency key after reload', async ({
  page,
}) => {
  await account(page);
  let originalKey = '';
  let attempts = 0;
  await page.route('**/api/screenshots/assets', (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: { assets: [{ id: 'asset-ui-test' }] },
      },
    })
  );
  await page.route('**/api/screenshots/tasks/', async (route) => {
    const request = route.request().postDataJSON();
    attempts++;
    if (attempts === 1) {
      originalKey = request.idempotencyKey;
      await route.abort('failed');
      return;
    }
    expect(request.idempotencyKey).toBe(originalKey);
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          id: 'a'.repeat(64),
          status: 'processing',
          duration: 5,
          aspectRatio: '16:9',
          createdAt: new Date().toISOString(),
          errorCode: null,
          videoUrl: null,
        },
      },
    });
  });
  await page.route('**/api/screenshots/tasks/' + 'a'.repeat(64), (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          id: 'a'.repeat(64),
          status: 'processing',
          duration: 5,
          aspectRatio: '16:9',
          createdAt: new Date().toISOString(),
          errorCode: null,
          videoUrl: null,
        },
      },
    })
  );
  await page.goto('/studio');
  await page
    .locator('input[type=file]')
    .setInputFiles('public/imgs/screenshots-to-video/orbit-dashboard.png');
  await expect(page.locator('.studio-screens li')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Generate video', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.reload();
  await expect(page.locator('.studio-generate')).toHaveText('Check status');
  await page.locator('.studio-generate').click();
  await expect(page.locator('.studio-task-result')).toContainText(
    'Creating your video'
  );
  expect(attempts).toBe(2);
});

test('real unauthenticated screenshot API refuses access', async ({
  request,
}) => {
  const response = await request.get('/api/screenshots/account');
  expect(response.status()).toBe(401);
  expect((await response.json()).data.errorKey).toBe('UNAUTHORIZED');
});

test('a one-credit account can select only 5 seconds', async ({ page }) => {
  await account(page, 1);
  await page.goto('/studio');
  const duration = page.getByRole('combobox', {
    name: 'Duration',
    exact: true,
  });
  await expect(duration.locator('option[value="5"]')).toHaveJSProperty(
    'disabled',
    false
  );
  await expect(duration.locator('option[value="10"]')).toHaveJSProperty(
    'disabled',
    true
  );
  await expect(duration.locator('option[value="15"]')).toHaveJSProperty(
    'disabled',
    true
  );
  await expect(page.locator('.studio-balance')).toContainText(
    'Available video credits'
  );
  await expect(page.locator('.studio-charge')).toContainText(
    'Video credits reserved for this generation: 1'
  );
});

test('a legacy render keeps all supported durations available', async ({
  page,
}) => {
  await account(page, 0);
  await page.unroute('**/api/screenshots/account');
  await page.route('**/api/screenshots/account', (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          remainingCredits: 0,
          legacyRenders: 1,
          remainingRenders: 1,
          serviceAvailable: true,
          tasks: [],
        },
      },
    })
  );
  await page.goto('/studio');
  const duration = page.getByRole('combobox', {
    name: 'Duration',
    exact: true,
  });
  await expect(duration.locator('option[value="15"]')).toHaveJSProperty(
    'disabled',
    false
  );
  await duration.selectOption('15');
  await expect(page.locator('.studio-charge')).toContainText(
    'one legacy render'
  );
});

test('template generation is retired and public generator links lead to Studio', async ({
  request,
}) => {
  const old = await request.post('/api/ai/generate', {
    data: { mediaType: 'video' },
  });
  expect(old.status()).toBe(410);
  const redirect = await request.get('/ai-video-generator', {
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers().location).toContain('/studio');
});
