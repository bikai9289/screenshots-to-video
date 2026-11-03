import { createFileRoute } from '@tanstack/react-router';

import { publicPageLinks } from '@/lib/public-page-head';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { ScreenshotsContact } from '@/blocks/screenshots-to-video/contact';

export const Route = createFileRoute('/contact')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['landing.screenshots.contactTitle']({}, { locale }),
      description: m['landing.screenshots.contactDescription']({}, { locale }),
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: 'description', content: loaderData.description },
        ]
      : [],
    links: loaderData ? publicPageLinks('/contact', loaderData.locale) : [],
  }),
  component: ScreenshotsContact,
});
