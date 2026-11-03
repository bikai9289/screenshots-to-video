/// <reference types="vite/client" />
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  ScrollRestoration,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { createMiddleware, createServerFn } from '@tanstack/react-start';
import { ThemeProvider } from 'next-themes';

import { SessionProvider, type AuthSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { parseCookieConsent } from '@/lib/cookie-consent';
import { getQueryClient } from '@/lib/query-client';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { CookieConsent } from '@/blocks/cookie-consent';
import { Ads } from '@/components/analytics/ads';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { Plausible } from '@/components/analytics/plausible';
import { ProductAttribution } from '@/components/analytics/product-attribution';
import { CustomerService } from '@/components/customer-service';
import { GoogleOneTap } from '@/components/google-one-tap';
import { SandboxPreviewBridge } from '@/components/sandbox-preview-bridge';
import { TopBanner } from '@/components/top-banner';
import { Toaster } from '@/components/ui/sonner';

import '@fontsource-variable/inter';
import '@fontsource/libre-baskerville/400.css';
import '@fontsource/libre-baskerville/700.css';
import '@fontsource/libre-baskerville/400-italic.css';
import '@/styles/globals.css';

const authMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ request, next }) => {
    let session: AuthSession | null = null;
    try {
      if (request?.headers) {
        const { getAuth } = await import('@/core/auth');
        const auth = getAuth();
        const sessionRes = await auth.api.getSession({
          headers: request.headers,
        });
        if (sessionRes?.user) {
          session = {
            user: sessionRes.user,
            session: {
              ...sessionRes.session,
              expiresAt:
                sessionRes.session.expiresAt instanceof Date
                  ? sessionRes.session.expiresAt.toISOString()
                  : sessionRes.session.expiresAt,
            },
          };
        }
      }
    } catch (err) {
      console.error('Failed to get server session in root middleware:', err);
    }
    return next({
      context: { session },
    });
  }
);

// Analytics IDs & Auth Session live on the server / DB config. Fetched via a
// server function so drizzle/db code never reaches the client bundle.
const getAnalyticsConfigs = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const session = context.session ?? null;

    try {
      const { getAllConfigs } = await import('@/modules/config/service');
      const { getCookie } = await import('@tanstack/react-start/server');
      const configs = await getAllConfigs();
      const { safeEmbedSetting } = await import('@/lib/embed-ids');
      // Host allow-list (PLAUSIBLE_SCRIPT_HOSTS) is runtime server env. A
      // configured src that fails it turns Plausible off rather than falling
      // back to the plausible.io script.
      const rawPlausibleSrc = configs.plausible_src?.trim() || '';
      const plausibleSrc = safeEmbedSetting('plausible_src', rawPlausibleSrc);
      const plausibleOff = !!rawPlausibleSrc && !plausibleSrc;
      const cookieConsentEnabled = configs.cookie_consent_enabled === 'true';
      return {
        session,
        cookieConsentEnabled,
        // The visitor's saved choice, so SSR can render consented scripts.
        cookieConsent: cookieConsentEnabled
          ? parseCookieConsent(getCookie('cookie_consent'))
          : null,
        appName: configs.app_name?.trim() || envConfigs.app_name,
        appDescription:
          configs.app_description?.trim() ||
          envConfigs.app_description ||
          'AI Video & Image Generation Studio',
        gaId: configs.google_analytics_id?.trim() || '',
        plausibleDomain: plausibleOff
          ? ''
          : configs.plausible_domain?.trim() || '',
        plausibleSrc,
        adsenseCode: configs.adsense_code?.trim() || '',
        crispWebsiteId:
          configs.crisp_enabled === 'true'
            ? configs.crisp_website_id?.trim() || ''
            : '',
        tawkPropertyId:
          configs.tawk_enabled === 'true'
            ? configs.tawk_property_id?.trim() || ''
            : '',
        tawkWidgetId:
          configs.tawk_enabled === 'true'
            ? configs.tawk_widget_id?.trim() || ''
            : '',
      };
    } catch (error) {
      console.error('Failed to get analytics configs:', error);
      return {
        session,
        cookieConsentEnabled: false,
        cookieConsent: null,
        appName: envConfigs.app_name,
        appDescription:
          envConfigs.app_description ||
          'AI Video, Image & Music Generation Studio',
        gaId: '',
        plausibleDomain: '',
        plausibleSrc: '',
        adsenseCode: '',
        crispWebsiteId: '',
        tawkPropertyId: '',
        tawkWidgetId: '',
      };
    }
  });

export const Route = createRootRoute({
  loader: () => getAnalyticsConfigs(),
  head: ({ loaderData }) => {
    // head() runs on the SSR server AND again on the client during hydration.
    // On the client, app_url falls back to the localhost dev default when
    // VITE_APP_URL wasn't inlined into the client bundle at build — which would
    // emit a second, localhost set of hreflang links. Prefer the live origin
    // on the client so it always matches; the server uses the configured URL.
    const appUrl =
      (typeof window !== 'undefined' && window.location?.origin) ||
      envConfigs.app_url ||
      '';
    const appName = loaderData?.appName || envConfigs.app_name || 'App';
    const appDescription =
      loaderData?.appDescription ||
      envConfigs.app_description ||
      'AI Video, Image & Music Generation Studio';

    const canonicalUrl = `${appUrl}/`;
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${appUrl}/#website`,
          url: appUrl,
          name: appName,
          description: appDescription,
        },
        {
          '@type': 'Organization',
          '@id': `${appUrl}/#organization`,
          name: appName,
          url: appUrl,
          logo: `${appUrl}/logo.svg`,
          sameAs: [],
        },
        {
          '@type': 'SoftwareApplication',
          name: appName,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'All',
          description: appDescription,
          url: `${appUrl}/`,
        },
      ],
    };

    return {
      meta: [
        { charSet: 'utf-8' },
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1',
        },
        { title: appName },
        { name: 'description', content: appDescription },
        {
          name: 'keywords',
          content: `screenshots to video, product demo videos, product launch videos, ${appName}`,
        },
        {
          name: 'robots',
          content:
            'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        },
        {
          name: 'googlebot',
          content:
            'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
        },
        {
          name: 'bingbot',
          content:
            'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
        },
        { property: 'og:site_name', content: appName },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: appName },
        { property: 'og:description', content: appDescription },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:image', content: `${appUrl}/logo.png` },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: appName },
        { name: 'twitter:description', content: appDescription },
        { name: 'twitter:image', content: `${appUrl}/logo.png` },
      ],
      links: [
        { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
        { rel: 'shortcut icon', href: '/favicon.ico', type: 'image/x-icon' },
        { rel: 'apple-touch-icon', href: '/logo.png' },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootComponent() {
  const analytics = Route.useLoaderData();
  const consentEnabled = !!analytics?.cookieConsentEnabled;
  const consent = useCookieConsent(analytics?.cookieConsent ?? null);
  // With the banner on, ad scripts wait for an explicit "accept".
  const adsAllowed = !consentEnabled || consent === 'accepted';

  return (
    <QueryClientProvider client={getQueryClient()}>
      <SessionProvider initialSession={analytics?.session || null}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ScrollRestoration />
          <TopBanner />
          <Outlet />
          <ProductAttribution allowed={adsAllowed} />
          <SandboxPreviewBridge />
          <Toaster position="top-center" richColors />
          <GoogleOneTap />
          {analytics?.gaId ? (
            <GoogleAnalytics
              measurementId={analytics.gaId}
              consentMode={consentEnabled}
            />
          ) : null}
          {analytics?.plausibleDomain || analytics?.plausibleSrc ? (
            <Plausible
              domain={analytics.plausibleDomain}
              src={analytics.plausibleSrc || undefined}
            />
          ) : null}
          {analytics?.adsenseCode ? (
            <Ads code={analytics.adsenseCode} loadScript={adsAllowed} />
          ) : null}
          <CustomerService
            crispWebsiteId={analytics?.crispWebsiteId || undefined}
            tawkPropertyId={analytics?.tawkPropertyId || undefined}
            tawkWidgetId={analytics?.tawkWidgetId || undefined}
          />
          {consentEnabled ? (
            <CookieConsent initial={analytics?.cookieConsent ?? null} />
          ) : null}
        </ThemeProvider>
      </SessionProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">{m['common.not_found.message']()}</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        {m['common.not_found.back_home']()}
      </Link>
    </div>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">{m['common.error.title']()}</h1>
      <p className="text-muted-foreground">{m['common.error.message']()}</p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="bg-muted mt-2 max-w-lg overflow-auto rounded p-4 text-xs">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer text-sm underline underline-offset-4"
      >
        {m['common.error.retry']()}
      </button>
    </div>
  );
}
