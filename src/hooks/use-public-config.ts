import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { apiGet } from '@/lib/api-client';

export type PublicConfig = Record<string, string>;

const rootRoute = getRouteApi('__root__');

// Public runtime config (auth methods, social login ids, …) — shared by
// sign-in/sign-up/forgot-password/google-one-tap/pricing. Deduped and
// cached by react-query.
//
// Only fetch in the browser. SSR must keep `data` undefined so AppName
// falls back to root loader / envConfigs and matches the client's first paint.
export function usePublicConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: () =>
      apiGet<PublicConfig>('/api/config/public', { cache: 'no-store' }),
    staleTime: 0,
    enabled: typeof window !== 'undefined',
  });
}

/**
 * 统一获取前台 App Name：优先后台配置，其次 root loader，再次 .env
 */
export function useAppName(): string {
  const { data: configs } = usePublicConfig();
  const rootData = rootRoute.useLoaderData();
  return (
    configs?.app_name?.trim() ||
    rootData?.appName?.trim() ||
    envConfigs.app_name ||
    ''
  );
}
