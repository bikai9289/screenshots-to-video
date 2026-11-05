import { expect, test } from '@playwright/test';

test('anonymous AI attribution survives navigation and is reported once after login', async ({
  page,
  context,
}) => {
  let signedIn = false;
  const events: { kind: string; detail: Record<string, string> }[] = [];
  await page.route('**/api/auth/get-session*', (route) =>
    route.fulfill({
      json: signedIn
        ? {
            user: {
              id: 'attribution-member',
              name: 'Test member',
              email: 'member@example.test',
              emailVerified: true,
            },
            session: {
              id: 'attribution-session',
              userId: 'attribution-member',
              token: 'test-only-session',
              expiresAt: '2099-01-01T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          }
        : null,
    })
  );
  await page.route('**/api/events', (route) => {
    events.push(route.request().postDataJSON());
    return route.fulfill({ json: { code: 0, message: 'ok', data: null } });
  });
  await page.goto('/contact?utm_source=chatgpt.com&utm_medium=referral');
  await expect(page.getByLabel('Your name', { exact: true })).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('stv:first-touch') ?? 'null')?.value
            .source
      )
    )
    .toBe('ai');
  expect(events).toEqual([]);
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === 'utm_source')?.value).toBe(
    'chatgpt.com'
  );

  signedIn = true;
  await page.goto('/pricing');
  await expect
    .poll(
      () => events.filter((event) => event.kind === 'visit_attributed').length
    )
    .toBe(1);
  expect(
    events.find((event) => event.kind === 'visit_attributed')?.detail
  ).toMatchObject({
    source: 'ai',
    utmSource: 'chatgpt.com',
    utmMedium: 'referral',
    firstSource: 'ai',
    path: '/contact',
  });
  await page.goto('/contact');
  await expect(page.getByLabel('Your name', { exact: true })).toBeEnabled();
  expect(
    events.filter((event) => event.kind === 'visit_attributed')
  ).toHaveLength(1);
});
