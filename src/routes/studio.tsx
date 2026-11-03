import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { ScreenshotsStudio } from '@/blocks/screenshots-to-video/studio';

export const Route = createFileRoute('/studio')({
  loader: () => {
    const locale = getLocale();
    return { title: m['landing.screenshots.studioTitle']({}, { locale }) };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title ?? 'Screenshots to Video' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ScreenshotsStudio,
});
