import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { apiPost } from '@/lib/api-client';
import { track } from '@/lib/track';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { ScreenshotPricing } from '@/components/screenshots-to-video/pricing';

import { getScreenshotsCopy } from './content';

export function ScreenshotsPricing() {
  const copy = getScreenshotsCopy();
  const { data: session } = useSession();
  const configQuery = usePublicConfig();
  const configs = configQuery.data;
  const router = useRouter();
  const available = configs?.screenshots_purchase_available === 'true';
  const checkout = useMutation({
    mutationFn: (productId: string) =>
      apiPost<{ checkout_url: string }>('/api/payment/checkout', {
        product_id: productId,
        payment_provider: 'stripe',
        redirect: localizeHref('/studio'),
        currency: 'usd',
        locale: getLocale(),
      }),
    onSuccess: (result) => {
      try {
        const url = new URL(result.checkout_url);
        if (
          url.protocol !== 'https:' &&
          !(import.meta.env.DEV && url.origin === location.origin)
        )
          throw new Error('Invalid checkout');
        window.location.assign(url.href);
      } catch {
        toast.error(copy.purchaseFailed);
      }
    },
    onError: () => toast.error(copy.purchaseFailed),
  });
  const buy = (productId: string) => {
    if (!session?.user) {
      router.push('/sign-in?callbackUrl=%2Fpricing');
      return;
    }
    track('plan_selected', { productId });
    checkout.mutate(productId);
  };
  return (
    <ScreenshotPricing
      copy={copy}
      available={available}
      availabilityStatus={
        configQuery.isError ? 'error' : configs ? 'ready' : 'loading'
      }
      onRetry={() => {
        void configQuery.refetch();
      }}
      pending={checkout.isPending ? checkout.variables : null}
      onBuy={buy}
    />
  );
}
