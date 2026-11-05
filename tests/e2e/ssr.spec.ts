import { expect, test } from '@playwright/test';

test('public metadata and footer links work without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const base = process.env.STV_BASE_URL || 'http://127.0.0.1:3000';
  for (const path of [
    '/',
    '/pricing',
    '/contact',
    '/privacy-policy',
    '/terms-of-service',
    '/privacy',
    '/terms',
  ]) {
    for (const prefix of ['', '/zh']) {
      const current = prefix + (path === '/' ? '' : path) || '/';
      await page.goto(base + current);
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href');
      await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        'content',
        canonical!
      );
      const footer = page.locator('footer');
      // Static legal pages use a minimal article shell without a footer.
      if (!(await footer.count())) continue;
      await expect(
        footer.locator('a[href="' + prefix + '/privacy-policy"]')
      ).toHaveCount(1);
      await expect(
        footer.locator('a[href="' + prefix + '/terms-of-service"]')
      ).toHaveCount(1);
      const language = footer.getByRole('link', {
        name: prefix ? 'English' : '中文',
        exact: true,
      });
      const target = (prefix ? '' : '/zh') + (path === '/' ? '' : path) || '/';
      await expect(language).toHaveAttribute('href', target);
      await language.click();
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        prefix ? 'en' : 'zh'
      );
      expect(new URL(page.url()).pathname).toBe(target);
    }
  }
  await context.close();
});

test('hydrated language links retain path, query and fragment', async ({
  page,
}) => {
  await page.goto('/pricing?source=footer#packs');
  // The SSR link cannot know a fragment, which browsers never send to servers.
  // Wait for hydration before testing the client-side fragment preservation.
  await expect(
    page.getByRole('button', { name: 'Choose this pack', exact: true }).first()
  ).toBeEnabled();
  await page
    .locator('footer')
    .getByRole('link', { name: '中文', exact: true })
    .click();
  await expect(page).toHaveURL(/\/zh\/pricing\?source=footer#packs$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
  await expect(
    page.getByRole('button', { name: '选择此方案', exact: true }).first()
  ).toBeEnabled();
  await page
    .locator('footer')
    .getByRole('link', { name: 'English', exact: true })
    .click();
  await expect(page).toHaveURL(/\/pricing\?source=footer#packs$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('homepage can be read without JavaScript and has unique metadata', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const base = process.env.STV_BASE_URL || 'http://127.0.0.1:3000';
  for (const locale of ['', '/zh']) {
    await page.goto(base + locale);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('details')).toHaveCount(11);
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      locale ? 'zh' : 'en'
    );
  }
  await context.close();
});

test('homepage hydrates without React mismatches', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.play-control')).toBeEnabled();
  await page.getByRole('tab', { name: 'Feature update' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('One feature.');
  expect(errors).toEqual([]);
});
