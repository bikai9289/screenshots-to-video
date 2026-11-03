import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { ScreenshotsHome } from '@/blocks/screenshots-to-video/home';

export const Route = createFileRoute('/')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['landing.screenshots.metaTitle']({}, { locale }),
      description: m['landing.screenshots.metaDescription']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const urlFor = (locale: (typeof locales)[number]) =>
      localizeUrl(`${envConfigs.app_url}/`, { locale }).href;
    return {
      meta: [
        { title: loaderData.title },
        { name: 'description', content: loaderData.description },
        { property: 'og:title', content: loaderData.title },
        { property: 'og:description', content: loaderData.description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: urlFor(loaderData.locale) },
      ],
      links: [
        { rel: 'canonical', href: urlFor(loaderData.locale) },
        ...locales.map((locale) => ({
          rel: 'alternate',
          hrefLang: locale,
          href: urlFor(locale),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
    };
  },
  component: ScreenshotsHome,
});
