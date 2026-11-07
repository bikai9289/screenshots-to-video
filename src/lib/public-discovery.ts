import { screenshotUseCases } from '@/config/screenshot-use-cases';
import {
  screenshotLimits,
  screenshotPacks,
} from '@/config/screenshots-product';

export function productDiscovery(
  appUrl: string,
  full = false,
  supportEmail = ''
) {
  const origin = new URL(appUrl).origin;
  const url = (path: string) => new URL(path, origin).href;
  const prices = screenshotPacks.map(
    (pack) =>
      `USD ${(pack.priceInCents / 100).toFixed(2)} for ${pack.credits} video ${pack.credits === 1 ? 'credit' : 'credits'}`
  );
  const lines = [
    '# Screenshots to Video',
    '',
    '> Screenshots to Video turns product screenshots into short AI-generated product demo and launch videos. No screen recording is required.',
    '',
    '## Product facts',
    '',
    '- Output: 720p MP4, 5, 10 or 15 seconds, with 16:9, 9:16 or 1:1 framing. Generated audio is disabled.',
    `- Input: up to ${screenshotLimits.maxFiles} PNG, JPEG or WebP screenshots; ${screenshotLimits.maxFileBytes / 1024 / 1024} MiB per file, ${screenshotLimits.maxTotalBytes / 1024 / 1024} MiB total. SVG is not accepted.`,
    `- One-time packs: ${prices.join('; ')}. No subscription and no free generation.`,
    '- A 5-second video uses 1 credit, 10 seconds uses 2 credits, and 15 seconds uses 3 credits. Confirmed system failures return reserved credits; an uncertain timeout is not treated as failure. Completed videos with unwanted style or UI changes do not include a free redo.',
    '- Video generation requires an account and paid video credits or legacy render rights. Examples and the public contact form do not require an account. Earlier render packs retain their original rights.',
    '',
    '## Public pages',
    '',
    `- [Home](${url('/')}): Workflow, public examples and FAQ.`,
    `- [Pricing](${url('/pricing')}): Pack prices, output specifications and purchase conditions.`,
    ...screenshotUseCases.map(
      ({ id, path }) =>
        `- [${id === 'app' ? 'App promotional video (not guaranteed App Store-ready)' : id === 'demo' ? 'Product demo video' : 'Feature announcement video'}](${url(path)}): Scenario-specific workflow and limitations.`
    ),
    `- [Contact](${url('/contact')}): Anonymous enquiry form, email and account support.`,
    `- [Privacy](${url('/privacy-policy')}): Screenshots, provider processing and support data.`,
    `- [Terms](${url('/terms-of-service')}): Usage, reservations and refunds.`,
    `- [Chinese home](${url('/zh')}): Chinese product information.`,
    `- [Detailed product facts](${url('/llms-full.txt')}): Expanded capabilities and limitations.`,
    '',
    '## Limitations',
    '',
    'AI generation may change interface text, layout details and motion. Exact pixel preservation is not guaranteed. Review each result before publishing.',
    'The homepage contains both illustrative motion previews and actual generated videos. Orbit is a fictional sample product; these are not customer testimonials.',
    'These facts describe the product, not current provider availability or verified real-payment readiness. Check the live purchase flow before purchasing.',
    'Private screenshots, tasks, account settings and admin pages are not public reference material.',
    '',
  ];
  if (full)
    lines.push(
      '## When this product fits',
      '',
      'Use it for short product launch clips and feature announcements made from existing screenshots. Select the order, duration and frame in Studio, then submit a paid generation.',
      'If exact typing, dragging, click paths or pixel-perfect UI evidence is essential, a screen recording or a deterministic editor may be a better fit.',
      '',
      '## Generation and billing',
      '',
      'A task reserves its required credits when accepted. Confirmed failures release the reservation. A temporary submission or status-query error keeps the original task available for checking; it does not automatically reverse a pack payment. Recovery reuses the same provider idempotency key; it does not start a fresh paid generation.',
      'Changing settings and creating another successful video uses credits again. Downloading an existing available result does not use credits. Unused video credits do not have an application expiry. Legacy render packs remain separate and keep their original per-video rules.',
      '',
      '## Public generation examples',
      '',
      `- [View source and output together](${url('/#real-output')}): Compare the fictional Orbit dashboard with the original 10- and 15-second outputs.`,
      '- [10-second generated MP4](https://media.screenshotstovideo.com/demos/orbit-10s-20261104.mp4)',
      '- [15-second generated MP4](https://media.screenshotstovideo.com/demos/orbit-15s-20261104.mp4)',
      '',
      '## Storage and support',
      '',
      'Input screenshots expire for new tasks after 24 hours. Provider-held data and generated file retention follow the provider policy; download important results. Application expiry is not proof that all copies have been physically deleted.',
      `The [public contact form](${url('/contact')}) accepts enquiries without registration and saves them to the support inbox. It returns a reference after saving; email delivery is separate from storage.`,
      ...(supportEmail ? [`Public support email: ${supportEmail}.`] : []),
      'Read the privacy policy before submitting private or personal information. Do not send passwords or payment card details through contact messages.',
      ''
    );
  return lines.join('\n');
}

export function publicRobots(appUrl: string) {
  const privatePaths = [
    '/admin',
    '/zh/admin',
    '/settings',
    '/zh/settings',
    '/api/',
    '/zh/api/',
  ];
  const groups = [
    ['*', [...privatePaths, '/studio', '/zh/studio']],
    // Search crawlers can read Studio's noindex tag; private data still requires auth.
    ...[
      'Googlebot',
      'Bingbot',
      'OAI-SearchBot',
      'PerplexityBot',
      'Claude-SearchBot',
      'ChatGPT-User',
      'GPTBot',
      'ClaudeBot',
    ].map((agent) => [agent, privatePaths]),
  ] as Array<[string, string[]]>;
  return (
    groups
      .map(([agent, paths]) =>
        [
          `User-agent: ${agent}`,
          'Allow: /',
          ...paths.map((path) => `Disallow: ${path}`),
          '',
        ].join('\n')
      )
      .join('\n') + `\nSitemap: ${new URL('/sitemap.xml', appUrl).href}\n`
  );
}
