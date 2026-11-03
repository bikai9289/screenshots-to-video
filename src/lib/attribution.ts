export type VisitSource =
  | 'ai'
  | 'search'
  | 'campaign'
  | 'referral'
  | 'unknown'
  | 'test';
export interface VisitAttribution {
  path: string;
  source: VisitSource;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

const aiHosts = [
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'gemini.google.com',
  'perplexity.ai',
  'copilot.microsoft.com',
];
const searchHosts = [
  'google.com',
  'www.google.com',
  'bing.com',
  'www.bing.com',
  'duckduckgo.com',
  'www.duckduckgo.com',
];
const campaignValue = (value: string | null) =>
  value && /^[a-zA-Z0-9_-]{1,64}$/.test(value) ? value : '';

export function classifyVisit(
  href: string,
  referrer: string
): VisitAttribution {
  const url = new URL(href);
  let host = '';
  try {
    const referred = new URL(referrer);
    if (
      ['https:', 'http:'].includes(referred.protocol) &&
      referred.hostname !== url.hostname
    )
      host = referred.hostname.toLowerCase().slice(0, 150);
  } catch {
    /* Missing referrer is unknown, not evidence of AI traffic. */
  }
  const utmSource = campaignValue(url.searchParams.get('utm_source'));
  const utmMedium = campaignValue(url.searchParams.get('utm_medium'));
  const utmCampaign = campaignValue(url.searchParams.get('utm_campaign'));
  const source: VisitSource =
    utmSource === 'internal_test'
      ? 'test'
      : utmSource || utmMedium || utmCampaign
        ? 'campaign'
        : aiHosts.some((known) => host === known || host.endsWith(`.${known}`))
          ? 'ai'
          : searchHosts.includes(host)
            ? 'search'
            : host
              ? 'referral'
              : 'unknown';
  // Only allow known public entry paths; private work identifiers never enter attribution.
  const path = [
    '/',
    '/zh',
    '/studio',
    '/pricing',
    '/contact',
    '/zh/studio',
    '/zh/pricing',
    '/zh/contact',
  ].includes(url.pathname)
    ? url.pathname
    : '/other';
  return { path, source, referrer: host, utmSource, utmMedium, utmCampaign };
}
