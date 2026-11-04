import { expect, test } from '@playwright/test';

test('payment history distinguishes retryable attempts and checks the owned order', async ({
  page,
}) => {
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
  await page.route('**/api/user/info*', (route) =>
    route.fulfill({ json: { code: 0, data: { needsInvite: false } } })
  );
  let checked = false;
  await page.route('**/api/user/orders?*', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          items: [
            {
              id: 'order1',
              orderNo: 'ORD-one',
              status: checked ? 'paid' : 'created',
              paymentState: checked ? 'paid' : 'retryable',
              amount: 990,
              currency: 'usd',
              paymentProvider: 'stripe',
              productName: 'Single',
              createdAt: '2026-11-04T00:00:00Z',
              lastAttemptCode: 'insufficient_funds',
            },
          ],
          total: 1,
        },
      },
    })
  );
  await page.route('**/api/user/orders/check', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ orderNo: 'ORD-one' });
    checked = true;
    await route.fulfill({
      json: {
        code: 0,
        data: { orderNo: 'ORD-one', status: 'paid', paymentState: 'paid' },
      },
    });
  });
  await page.goto('/settings/payments');
  await expect(
    page.getByText('Payment can be retried', { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText('The last payment attempt failed.', { exact: false })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Check payment', exact: true })
    .click();
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Check payment', exact: true })
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('body')).toBeVisible();
});

test('payment status queries require authentication', async ({ request }) => {
  const response = await request.post('/api/user/orders/check', {
    data: { orderNo: 'ORD-one' },
  });
  expect(response.status()).toBe(401);
});
