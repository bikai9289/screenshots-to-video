import type { SVGProps } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { BookOpen, Mail } from 'lucide-react';

import { openCookieSettings } from '@/lib/cookie-consent';
import { m } from '@/paraglide/messages.js';
import {
  SiteFooter,
  type FooterColumn,
  type FooterSocial,
} from '@/components/site-footer';

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function MailIcon(props: SVGProps<SVGSVGElement>) {
  return <Mail {...(props as any)} />;
}

function BlogIcon(props: SVGProps<SVGSVGElement>) {
  return <BookOpen {...(props as any)} />;
}

const rootRoute = getRouteApi('__root__');

export function Footer() {
  const cookieConsentEnabled =
    !!rootRoute.useLoaderData()?.cookieConsentEnabled;
  const columns: FooterColumn[] = [
    {
      title: m['landing.footer.product'](),
      links: [
        {
          label: 'AI Video Generator',
          href: '/ai-video-generator',
        },
        {
          label: 'AI Image Generator',
          href: '/ai-image-generator',
        },
        {
          label: 'Prompts Library',
          href: '/prompts',
        },
        {
          label: 'Showcases',
          href: '/showcases',
        },
      ],
    },
    {
      title: m['landing.footer.resources'](),
      links: [
        { label: m['landing.footer.blog'](), href: '/posts' },
        { label: m['landing.nav.pricing'](), href: '/pricing' },
      ],
    },
    {
      title: m['landing.footer.legal'](),
      links: [
        { label: m['landing.footer.privacy'](), href: '/privacy-policy' },
        { label: m['landing.footer.terms'](), href: '/terms-of-service' },
        ...(cookieConsentEnabled
          ? [
              {
                label: m['landing.footer.cookie_settings'](),
                onClick: openCookieSettings,
              },
            ]
          : []),
      ],
    },
  ];

  const socials: FooterSocial[] = [
    { icon: BlogIcon, href: '/posts', label: m['landing.footer.blog']() },
    { icon: MailIcon, href: '/contact', label: 'Support' },
  ];

  return (
    <SiteFooter
      tagline={m['landing.footer.tagline']()}
      columns={columns}
      socials={socials}
    />
  );
}
