import { describe, expect, it } from 'vitest';

import { getLocale, serverAsyncLocalStorage } from '@/paraglide/runtime.js';
import { paraglideMiddleware } from '@/paraglide/server.js';

import { initializeLocaleContext } from './server-context';

describe('eager server locale context', () => {
  it('is initialized before any request and never replaces an existing context', () => {
    const storage = serverAsyncLocalStorage;
    expect(storage).toBeDefined();
    initializeLocaleContext();
    expect(serverAsyncLocalStorage).toBe(storage);
  });
  it('keeps simultaneous cold bilingual requests isolated across awaits', async () => {
    const storage = serverAsyncLocalStorage;
    const paths = ['/zh/pricing', '/pricing', '/zh/contact', '/contact'];
    const result = await Promise.all(
      paths.map((path) =>
        paraglideMiddleware(
          new Request(`https://example.com${path}`),
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return Response.json({ locale: getLocale() });
          }
        ).then((response) => response.json())
      )
    );
    expect(result).toEqual([
      { locale: 'zh' },
      { locale: 'en' },
      { locale: 'zh' },
      { locale: 'en' },
    ]);
    expect(serverAsyncLocalStorage).toBe(storage);
  });
});
