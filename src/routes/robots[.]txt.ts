import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          'User-Agent: *',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /settings',
          'Disallow: /api/',
          'Disallow: /studio',
          'Disallow: /zh/studio',
          '',
          'User-Agent: Googlebot',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /settings',
          'Disallow: /api/',
          '',
          'User-Agent: Bingbot',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /settings',
          'Disallow: /api/',
          '',
          'User-Agent: GPTBot',
          'Allow: /',
          '',
          'User-Agent: ChatGPT-User',
          'Allow: /',
          '',
          'User-Agent: PerplexityBot',
          'Allow: /',
          '',
          'User-Agent: ClaudeBot',
          'Allow: /',
          '',
          `Sitemap: ${envConfigs.app_url}/sitemap.xml`,
          '',
        ].join('\n');
        return new Response(body, {
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    },
  },
});
