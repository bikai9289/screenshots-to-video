import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { locales, localizeUrl } from '@/paraglide/runtime.js';

const paths = [
  '',
  '/pricing',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
];
const escape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const entries = paths.flatMap((path) =>
          locales.map((locale) => {
            const href = localizeUrl(new URL(path || '/', envConfigs.app_url), {
              locale,
            }).href;
            return (
              '<url><loc>' +
              escape(href) +
              '</loc>' +
              locales
                .map(
                  (language) =>
                    '<xhtml:link rel="alternate" hreflang="' +
                    language +
                    '" href="' +
                    escape(
                      localizeUrl(new URL(path || '/', envConfigs.app_url), {
                        locale: language,
                      }).href
                    ) +
                    '"/>'
                )
                .join('') +
              '</url>'
            );
          })
        );
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
            entries.join('') +
            '</urlset>',
          { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
        );
      },
    },
  },
});
