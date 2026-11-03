import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { publicPageLinks } from '@/lib/public-page-head';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { ScreenshotsPricing } from '@/blocks/screenshots-to-video/pricing';

export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['landing.screenshots.pricingTitle']({}, { locale }),
      description: m['landing.screenshots.pricingDescription']({}, { locale }),
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: 'description', content: loaderData.description },
          {
            name: 'keywords',
            content: `${envConfigs.app_name} pricing, screenshots to video, paid video packs`,
          },
          { property: 'og:type', content: 'website' },
          { property: 'og:title', content: loaderData.title },
          { property: 'og:description', content: loaderData.description },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:title', content: loaderData.title },
          { name: 'twitter:description', content: loaderData.description },
        ]
      : [],
    links: loaderData ? publicPageLinks('/pricing', loaderData.locale) : [],
  }),
  component: PricingPage,
});

function PricingPage() {
  return <ScreenshotsPricing />;
}
