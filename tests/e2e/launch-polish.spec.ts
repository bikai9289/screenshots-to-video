import { expect, test } from '@playwright/test';

test('purchase specifications and provider policies are public in both languages', async ({
  page,
}) => {
  for (const locale of ['', '/zh']) {
    await page.goto(`${locale}/pricing`);
    await expect(page.locator('.purchase-details')).toContainText('720p MP4');
    await expect(page.locator('.purchase-details')).toContainText('20 MiB');
    await expect(page.locator('.purchase-details')).toContainText('16:9');
    await page.goto(`${locale}/privacy-policy`);
    await expect(
      page.locator('a[href="https://www.seeapi.com/docs/data-handling/"]')
    ).toBeVisible();
    await expect(
      page.locator('a[href="https://stripe.com/privacy"]')
    ).toBeVisible();
    await page.goto(`${locale}/contact`);
    // Direct email is optional (VITE_SUPPORT_EMAIL); anonymous support is
    // provided by the contact form even when no address is configured.
    await expect(page.locator('form')).toBeVisible();
  }
});

test('real generated sample plays and is clearly identified', async ({
  page,
}) => {
  await page.goto('/');
  const video = page.locator('#real-output video');
  await video.scrollIntoViewIfNeeded();
  await expect(page.locator('#real-output figcaption')).toContainText(
    'Test project, not customer work'
  );
  await page
    .getByRole('button', { name: 'Play generated video 10s', exact: true })
    .click();
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime)
    )
    .toBeGreaterThan(0);
  const metadata = await video.evaluate((element: HTMLVideoElement) => ({
    width: element.videoWidth,
    height: element.videoHeight,
    duration: element.duration,
  }));
  expect(metadata.width).toBe(1280);
  expect(metadata.height).toBe(720);
  expect(metadata.duration).toBeGreaterThan(10);
  expect(metadata.duration).toBeLessThan(10.2);
  await page.getByRole('button', { name: '15s', exact: true }).click();
  const longer = page.locator('#real-output video');
  await page
    .getByRole('button', { name: 'Play generated video 15s', exact: true })
    .click();
  await expect
    .poll(() =>
      longer.evaluate((element: HTMLVideoElement) => element.duration)
    )
    .toBeGreaterThan(15);
});

for (const width of [390, 768, 1440]) {
  test(`public additions fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/', '/pricing', '/contact', '/zh/pricing']) {
      await page.goto(path);
      // Header's ready state is set after hydration; don't capture an SSR node
      // while React may still replace it during the first client render.
      await expect(page.locator('.menu-toggle')).toBeEnabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
      if (path.includes('/pricing')) {
        await expect(page.locator('.pack')).toHaveCount(4);
        const columns = await page
          .locator('.pack-grid')
          .evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns.split(' ').length
          );
        expect(columns).toBe(width > 1100 ? 4 : width > 650 ? 2 : 1);
      }
      if (path === '/') {
        await page
          .locator('#real-output')
          .screenshot({ path: `test-results/real-output-${width}.png` });
      }
      if (path === '/pricing') {
        await page
          .locator('.purchase-details')
          .screenshot({ path: `test-results/specs-${width}.png` });
      }
    }
  });
}
