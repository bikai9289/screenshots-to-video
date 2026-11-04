import { useSession } from '@/core/auth/client';

import { getScreenshotsCopy } from './content';

export function useScreenshotsCopy() {
  const copy = getScreenshotsCopy();
  const { data: session } = useSession();
  return {
    ...copy,
    accountLabel: session?.user ? copy.myVideos : copy.signIn,
    accountHref: session?.user ? '/studio' : '/sign-in?callbackUrl=%2Fstudio',
  };
}
