import { describe, expect, it } from 'vitest';

import { getLocale } from '@/paraglide/runtime.js';
import { paraglideMiddleware } from '@/paraglide/server.js';

describe('cold server locale isolation', () => {
  it('keeps the first concurrent requests in their own locale context', async () => {
    const results = await Promise.all(
      ['/zh', '/'].map((path) =>
        paraglideMiddleware(
          new Request(`https://example.com${path}`),
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return Response.json({ locale: getLocale() });
          }
        ).then((response) => response.json())
      )
    );
    expect(results).toEqual([{ locale: 'zh' }, { locale: 'en' }]);
  });
});
