import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            '# Screenshots to Video',
            '',
            '> A paid tool for making product demo and launch videos from screenshots.',
            '',
            '## Public pages',
            '',
            '- [Home](' +
              envConfigs.app_url +
              '/): Purpose, illustrative motion previews, workflow and FAQ.',
            '- [Pricing](' +
              envConfigs.app_url +
              '/pricing): One-time USD packs; no free generation.',
            '- [Contact](' +
              envConfigs.app_url +
              '/contact): Account-based support.',
            '- [Privacy](' +
              envConfigs.app_url +
              '/privacy-policy): Inputs, provider processing and retention.',
            '- [Terms](' +
              envConfigs.app_url +
              '/terms-of-service): Purchase, usage and refund conditions.',
            '',
            '## Important distinctions',
            '',
            'Homepage motion previews use a fictional product and are not customer work.',
            'Video creation requires authentication and a paid render pack.',
            'AI-generated video may alter interface text and details; review before publishing.',
            'Generation depends on the configured SeeAPI service. Do not infer availability from these documentation links.',
            'Private Studio tasks, screenshots and account pages are not public content.',
            '',
          ].join('\n'),
          { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        ),
    },
  },
});
