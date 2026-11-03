import { expect, test } from '@playwright/test';

test('public content and FAQ answers exist in the initial HTML in both languages', async ({
  request,
}) => {
  for (const [path, title, question, answer] of [
    [
      '/',
      'Screenshots to video.',
      'Is there a free plan?',
      'No. Video generation requires paid access',
    ],
    ['/zh', '截图，变成视频。', '有免费套餐吗？', '没有。生成视频需要付费'],
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(title);
    expect(html).toContain(question);
    expect(html).toContain(answer);
    expect(html.match(/<details/g)?.length).toBe(11);
    expect(html).not.toContain('"price":"0"');
    expect(html).not.toContain('user-scalable=no');
  }
});

for (const width of [360, 390, 768, 1440, 1920]) {
  test(`homepage is readable without overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('.stv-site h1')).toContainText(
      'Screenshots to video.'
    );
    await expect(page.locator('.product-shot img')).toHaveJSProperty(
      'complete',
      true
    );
    const result = await page.locator('.stv-site').evaluate((root) => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      small: [...root.querySelectorAll('*')]
        .filter(
          (element) =>
            !element.children.length &&
            element.textContent?.trim() &&
            element.getBoundingClientRect().width > 0 &&
            parseFloat(getComputedStyle(element).fontSize) < 14
        )
        .map((element) => element.textContent),
      media: [...root.querySelectorAll('img')]
        .filter((img) => img.getBoundingClientRect().top < innerHeight)
        .every((img) => img.complete && img.naturalWidth > 0),
    }));
    expect(result.overflow).toBe(false);
    expect(result.small).toEqual([]);
    expect(result.media).toBe(true);
    expect(errors).toEqual([]);
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `test-results/home-${width}.png`,
        fullPage: true,
      });
  });
}

test('tabs, keyboard navigation, FAQ and playback work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Feature update' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('One feature.');
  await page.getByRole('tab', { name: 'Feature update' }).press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Social teaser' })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Stop the scroll.');
  await page.getByText('Is there a free plan?', { exact: true }).click();
  await expect(page.locator('details').nth(1)).toHaveAttribute('open', '');
  await page.locator('.play-control').click();
  const paused = await page.locator('.scrubber').inputValue();
  await page.waitForTimeout(200);
  expect(await page.locator('.scrubber').inputValue()).toBe(paused);
  await page.getByRole('button', { name: 'Expand demo', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('mobile menu and reduced motion preference work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.play-control')).toHaveAttribute(
    'aria-label',
    'Play demo'
  );
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Examples', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});
