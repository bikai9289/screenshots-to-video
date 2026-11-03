import { expect, test } from '@playwright/test';

test('real registration, session, paid access and cross-origin rejection', async ({
  page,
}) => {
  test.skip(
    process.env.STV_REAL_AUTH_TEST !== '1',
    'Run through test:auth:real with an isolated database.'
  );
  const base = process.env.STV_BASE_URL!;
  expect(['localhost', '127.0.0.1']).toContain(new URL(base).hostname);
  const email = `auth-${crypto.randomUUID()}@example.test`;
  const password = `A1!${crypto.randomUUID()}`;
  const api = page.request;
  const signup = await api.post('/api/auth/sign-up/email', {
    headers: { Origin: base },
    data: { name: 'Local verification', email, password },
  });
  expect(signup.status(), await signup.text()).toBe(200);
  const session = await api.get('/api/auth/get-session');
  expect((await session.json()).user.email).toBe(email);
  const account = await api.get('/api/screenshots/account');
  expect(account.status()).toBe(200);
  expect((await account.json()).data.remainingRenders).toBe(0);
  const freeUpload = await api.post('/api/screenshots/assets', {
    headers: { Origin: base },
    multipart: {
      files: {
        name: 'x.png',
        mimeType: 'image/png',
        buffer: Buffer.from('not an image'),
      },
    },
  });
  expect(freeUpload.status()).toBe(402);
  expect((await freeUpload.json()).data.errorKey).toBe('PAID_ACCESS_REQUIRED');
  await page.goto('/studio');
  await expect(page.locator('.studio-balance strong')).toHaveText('0');
  await expect(page.locator('.studio-generate')).toBeDisabled();
  const signout = await api.post('/api/auth/sign-out', {
    headers: { Origin: base },
    data: {},
  });
  expect(signout.status()).toBe(200);
  await expect
    .poll(async () => {
      const response = await api.get('/api/auth/get-session');
      return response.json();
    })
    .toBeNull();
  const hostile = await api.post('/api/auth/sign-in/email', {
    headers: { Origin: 'https://untrusted.example.test' },
    data: { email, password },
  });
  expect(hostile.status()).toBe(403);
  const login = await api.post('/api/auth/sign-in/email', {
    headers: { Origin: base },
    data: { email, password },
  });
  expect(login.status(), await login.text()).toBe(200);
  expect(
    (await (await api.get('/api/auth/get-session')).json()).user.email
  ).toBe(email);
});
