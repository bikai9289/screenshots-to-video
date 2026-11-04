import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { productDiscovery } from '@/lib/public-discovery';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          productDiscovery(envConfigs.app_url, false, envConfigs.support_email),
          { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        ),
    },
  },
});
