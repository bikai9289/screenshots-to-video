import { expect, test } from '@playwright/test';

test('signed-in visitors see My videos instead of Log in', async ({ page }) => {
  await page.route('**/api/auth/get-session*', (route) =>
    route.fulfill({
      json: {
        user: {
          id: 'member',
          name: 'Demo member',
          email: 'member@example.test',
          emailVerified: true,
        },
        session: {
          id: 'test-session',
          userId: 'member',
          token: 'test-only-session',
          expiresAt: '2099-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    })
  );
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'My videos', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Log in', exact: true })
  ).toHaveCount(0);
});

test('login and supported durations are discoverable before entering Studio', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Log in', exact: true })
  ).toHaveAttribute('href', '/sign-in?callbackUrl=%2Fstudio');
  await expect(page.locator('.duration-note')).toContainText(
    '5, 10 or 15 seconds'
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: 'Log in', exact: true })
  ).toBeVisible();
});

test('contact form handles errors, retry, confirmation and one stable request key', async ({
  page,
}) => {
  const bodies: Array<Record<string, string>> = [];
  await page.route('**/api/contact', async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill(
      bodies.length === 1
        ? { status: 503, json: { code: 4705, message: 'Temporary failure' } }
        : {
            json: {
              code: 0,
              message: 'ok',
              data: { reference: 'contact-test-reference' },
            },
          }
    );
  });
  await page.goto('/contact');
  await page.getByLabel('Your name', { exact: true }).fill('Demo visitor');
  await page
    .getByLabel('Email address', { exact: true })
    .fill('visitor@example.test');
  await page
    .getByLabel('What can we help with?', { exact: true })
    .fill('Video duration question');
  await page
    .getByLabel('Your message', { exact: true })
    .fill('Can I make a fifteen-second product video?');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'Your message has been saved'
  );
  expect(bodies).toHaveLength(2);
  expect(bodies[0].requestId).toBe(bodies[1].requestId);
  await page.getByRole('button', { name: 'Send another message' }).click();
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('');
});

test('Chinese contact fields and narrow layouts remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/contact');
  await expect(page.getByLabel('你的称呼', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '发送留言', exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/contact-mobile.png',
    fullPage: true,
  });
});
