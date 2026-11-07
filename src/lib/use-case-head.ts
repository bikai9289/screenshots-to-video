import { tDynamic } from '@/core/i18n/dynamic';
import type { ScreenshotUseCase } from '@/config/screenshot-use-cases';
import { getLocale } from '@/paraglide/runtime.js';

import { publicPageLinks } from './public-page-head';

export function useCaseRouteOptions(id: ScreenshotUseCase, path: string) {
  return {
    loader: () => ({
      locale: getLocale(),
      title: tDynamic(`landing.useCases.${id}.metaTitle`),
      description: tDynamic(`landing.useCases.${id}.description`),
    }),
    head: ({
      loaderData,
    }: {
      loaderData?: {
        locale: ReturnType<typeof getLocale>;
        title: string;
        description: string;
      };
    }) =>
      loaderData
        ? {
            meta: [
              { title: loaderData.title },
              { name: 'description', content: loaderData.description },
              { property: 'og:title', content: loaderData.title },
              { property: 'og:description', content: loaderData.description },
              { property: 'og:type', content: 'website' },
              { name: 'twitter:title', content: loaderData.title },
              { name: 'twitter:description', content: loaderData.description },
              {
                property: 'og:url',
                content: publicPageLinks(path, loaderData.locale)[0].href,
              },
            ],
            links: publicPageLinks(path, loaderData.locale),
          }
        : {},
  };
}
