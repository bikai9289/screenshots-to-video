'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Check,
  CreditCard,
  Crown,
  Film,
  Flame,
  Globe2,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import {
  formatCheckoutAmount,
  getPricingProduct,
  isPaymentProviderAvailableForProduct,
  resolveProviderCheckoutPricing,
} from '@/config/pricing';
import { apiPost } from '@/lib/api-client';
import { currentPathWithQuery } from '@/lib/redirect';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import { FAQSection } from '@/components/sites/creation/FAQSection';

const ALL_PROVIDERS: PaymentProvider[] = [
  'stripe',
  'creem',
  'waffo',
  'paypal',
  'alipay',
  'wechat',
];

interface PixanyPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
  badge?: string;
  features: string[];
  cta: string;
  productId: string;
  priceInCents: number;
  credits: number;
  creditsValidDays: number;
  metrics: {
    videos: string;
    images: string;
  };
}

export function Pricing() {
  const router = useRouter();
  const { data: session } = useSession();

  const { data: configsData } = usePublicConfig();
  const configs = configsData ?? {};
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PixanyPlan | null>(null);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);

  const enabledProviders = useMemo<PaymentProvider[]>(
    () => ALL_PROVIDERS.filter((p) => configs[`${p}_enabled`] === 'true'),
    [configs]
  );

  const isZh = getLocale() === 'zh';

  const plans: PixanyPlan[] = [
    {
      id: 'starter',
      name: m['stp.pricing.starter_title'](),
      price: isZh ? '¥71.99' : '$9.99',
      period: m['stp.pricing.one_time'](),
      description: m['stp.pricing.starter_desc'](),
      features: [
        m['stp.pricing.feat_400_credits'](),
        m['stp.pricing.feat_valid_1m'](),
        m['stp.pricing.feat_full_access'](),
        m['stp.pricing.feat_up_6_vid'](),
        m['stp.pricing.feat_up_60_img'](),
      ],
      cta: m['stp.pricing.buy_now'](),
      productId: 'nanobanana_joyflix_starter',
      priceInCents: isZh ? 7199 : 999,
      credits: 400,
      creditsValidDays: 30,
      metrics: {
        videos: '6',
        images: '60',
      },
    },
    {
      id: 'standard',
      name: m['stp.pricing.standard_title'](),
      price: isZh ? '¥359.99' : '$49.99',
      period: m['stp.pricing.one_time'](),
      description: m['stp.pricing.standard_desc'](),
      popular: true,
      badge: m['stp.pricing.most_popular'](),
      features: [
        m['stp.pricing.feat_2500_credits'](),
        m['stp.pricing.feat_valid_3m'](),
        m['stp.pricing.feat_full_access'](),
        m['stp.pricing.feat_priority_sup'](),
        m['stp.pricing.feat_up_37_vid'](),
        m['stp.pricing.feat_up_400_img'](),
      ],
      cta: m['stp.pricing.buy_now'](),
      productId: 'nanobanana_joyflix_standard',
      priceInCents: isZh ? 35999 : 4999,
      credits: 2500,
      creditsValidDays: 90,
      metrics: {
        videos: '37',
        images: '400',
      },
    },
    {
      id: 'premium',
      name: m['stp.pricing.premium_title'](),
      price: isZh ? '¥719.99' : '$99.99',
      period: m['stp.pricing.one_time'](),
      description: m['stp.pricing.premium_desc'](),
      badge: m['stp.pricing.max_power'](),
      features: [
        m['stp.pricing.feat_6000_credits'](),
        m['stp.pricing.feat_valid_1y'](),
        m['stp.pricing.feat_full_access'](),
        m['stp.pricing.feat_priority_sup'](),
        m['stp.pricing.feat_up_90_vid'](),
        m['stp.pricing.feat_up_1000_img'](),
      ],
      cta: m['stp.pricing.buy_now'](),
      productId: 'nanobanana_joyflix_premium',
      priceInCents: isZh ? 71999 : 9999,
      credits: 6000,
      creditsValidDays: 365,
      metrics: {
        videos: '90',
        images: '1,000',
      },
    },
  ];

  const pricingFaqs = [
    {
      question: m['stp.pricing.faq1_q'](),
      answer: m['stp.pricing.faq1_a'](),
    },
    {
      question: m['stp.pricing.faq2_q'](),
      answer: m['stp.pricing.faq2_a'](),
    },
    {
      question: m['stp.pricing.faq3_q'](),
      answer: m['stp.pricing.faq3_a'](),
    },
    {
      question: m['stp.pricing.faq4_q'](),
      answer: m['stp.pricing.faq4_a'](),
    },
  ];

  const checkoutMutation = useMutation({
    mutationFn: ({
      plan,
      provider,
    }: {
      plan: PixanyPlan;
      provider: PaymentProvider;
    }) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: plan.productId,
        product_name: plan.name,
        plan_name: plan.name,
        price: plan.priceInCents,
        currency: isZh ? 'cny' : 'usd',
        type: 'one-time',
        description: plan.name,
        credits: plan.credits,
        credits_valid_days: plan.creditsValidDays,
        payment_provider: provider,
        locale: getLocale(),
        redirect: localizeHref('/settings/credits'),
      }),
    onSuccess: (data) => {
      if (!data?.checkout_url) {
        toast.error(m['common.pricing.checkout_failed']());
        setLoadingProvider(null);
        return;
      }
      window.location.href = data.checkout_url;
    },
    onError: (err: unknown) => {
      const raw =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : '';
      if (
        raw === 'Payment product mapping not configured' ||
        /Invalid productId: expected Product Short ID format/i.test(raw)
      ) {
        toast.error(m['common.error.payment_product_mapping_missing']());
      } else if (
        raw ===
        'Alipay and WeChat Pay are only available for one-time credit packs'
      ) {
        toast.error(m['common.error.payment_provider_cny_only']());
      } else if (
        raw === 'This payment method does not support the selected currency'
      ) {
        toast.error(m['common.error.payment_currency_unsupported']());
      } else {
        toast.error(raw || m['common.pricing.checkout_failed']());
      }
      setLoadingProvider(null);
    },
  });

  function startCheckout(plan: PixanyPlan, provider: PaymentProvider) {
    setLoadingProvider(provider);
    checkoutMutation.mutate({ plan, provider });
  }

  async function handleCheckout(plan: PixanyPlan) {
    if (!session?.user) {
      const callbackUrl = encodeURIComponent(currentPathWithQuery('/pricing'));
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
      return;
    }

    const selectEnabled = configs.select_payment_enabled === 'true';
    const defaultProvider = (configs.default_payment_provider ||
      enabledProviders[0] ||
      'stripe') as PaymentProvider;

    if (enabledProviders.length === 0 && !configs.default_payment_provider) {
      toast.error(m['common.pricing.payment_not_configured']());
      return;
    }

    // Alipay/WeChat can't charge products without a CNY price.
    const planProviders = providersForPlan(plan);

    setPendingPlan(plan);
    if (selectEnabled && planProviders.length > 1) {
      setModalOpen(true);
      return;
    }

    const product = getPricingProduct(plan.productId);
    await startCheckout(
      plan,
      !product || isPaymentProviderAvailableForProduct(product, defaultProvider)
        ? defaultProvider
        : planProviders[0] || defaultProvider
    );
  }

  function providersForPlan(plan: PixanyPlan): PaymentProvider[] {
    const product = getPricingProduct(plan.productId);
    if (!product) return enabledProviders;
    return enabledProviders.filter((p) =>
      isPaymentProviderAvailableForProduct(product, p)
    );
  }

  // "Charged as $9.99" when a provider charges in a different currency than
  // the price shown (zh pack + Creem → USD; en + Alipay/WeChat → CNY).
  function providerChargeNotes(
    plan: PixanyPlan
  ): Partial<Record<PaymentProvider, string>> {
    const product = getPricingProduct(plan.productId);
    if (!product) return {};
    const shownCurrency =
      isZh && product.currencies?.cny != null ? 'cny' : product.currency;
    const notes: Partial<Record<PaymentProvider, string>> = {};
    for (const p of providersForPlan(plan)) {
      const pricing = resolveProviderCheckoutPricing(product, {
        provider: p,
        requestedCurrency: shownCurrency,
      });
      if (pricing.ok && pricing.currency !== shownCurrency) {
        notes[p] = m['common.pricing.charged_as']({
          price: formatCheckoutAmount(pricing.amount, pricing.currency),
        });
      }
    }
    return notes;
  }

  function handleProviderSelect(provider: PaymentProvider) {
    if (!pendingPlan) return;
    startCheckout(pendingPlan, provider);
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-28">
      {/* Dynamic Ambient Mesh Lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-500/15 via-indigo-500/10 to-transparent blur-[140px] dark:from-blue-600/25 dark:via-purple-600/15" />
        <div className="absolute top-[40%] right-[-10%] h-[450px] w-[550px] rounded-full bg-gradient-to-l from-purple-500/10 to-transparent blur-[120px] dark:from-purple-500/15" />
        <div className="absolute top-[60%] left-[-10%] h-[450px] w-[550px] rounded-full bg-gradient-to-r from-blue-500/10 to-transparent blur-[120px] dark:from-blue-500/15" />
      </div>

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-24">
        {/* Header Hero Section */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="border-border/80 bg-muted/60 text-foreground mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-xs backdrop-blur-md transition-transform hover:scale-105">
            <span className="flex size-2 animate-pulse rounded-full bg-emerald-500" />
            <span>{m['stp.pricing.zero_sub_pill']()}</span>
          </div>

          <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {m['landing.pricing.title']()}
          </h1>

          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base lg:text-lg">
            {m['stp.pricing.banner_subtitle']()}
          </p>

          {/* Quick Value Badges */}
          <div className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-medium sm:mt-8 sm:gap-4 lg:gap-6">
            <div className="border-border/60 bg-muted/30 flex items-center gap-1.5 rounded-full border px-3 py-1 backdrop-blur-xs">
              <Zap className="size-3.5 text-amber-500" />
              <span>{m['stp.pricing.instant_gen']()}</span>
            </div>
            <div className="border-border/60 bg-muted/30 flex items-center gap-1.5 rounded-full border px-3 py-1 backdrop-blur-xs">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>{m['stp.pricing.commercial_ip']()}</span>
            </div>
            <div className="border-border/60 bg-muted/30 flex items-center gap-1.5 rounded-full border px-3 py-1 backdrop-blur-xs">
              <Sparkles className="size-3.5 text-blue-500" />
              <span>{m['stp.pricing.all_models']()}</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 mb-20 grid gap-6 sm:gap-8 lg:mt-14 lg:mb-24 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => {
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-300 sm:p-8 ${
                  isPopular
                    ? 'border-primary/90 bg-card text-card-foreground ring-primary/20 shadow-2xl ring-1 lg:-translate-y-2'
                    : 'border-border/80 bg-card/80 text-card-foreground hover:border-border dark:bg-card/50 backdrop-blur-xl hover:shadow-xl'
                } border`}
              >
                {/* Popular Pill */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-1 text-xs font-bold tracking-wide text-white shadow-md shadow-blue-500/25">
                      <Sparkles className="size-3" />
                      {m['landing.pricing.popular']()}
                    </span>
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-foreground text-2xl font-bold tracking-tight">
                          {plan.name}
                        </h3>
                        {plan.id === 'starter' && (
                          <Sparkles className="text-muted-foreground size-4" />
                        )}
                        {plan.id === 'standard' && (
                          <Flame className="size-4.5 fill-amber-500/20 text-amber-500" />
                        )}
                        {plan.id === 'premium' && (
                          <Crown className="size-4.5 fill-indigo-500/20 text-indigo-500" />
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  {/* Price Block */}
                  <div className="mt-6 mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-foreground text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.5rem] xl:text-5xl">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs font-semibold whitespace-nowrap sm:text-sm">
                      / {plan.period}
                    </span>
                  </div>

                  {/* Estimated Output Matrix Card */}
                  <div className="border-border/80 bg-muted/40 mb-6 rounded-2xl border p-3.5 backdrop-blur-xs sm:p-4">
                    <div className="border-border/50 flex items-center justify-between border-b pb-2.5">
                      <span className="text-foreground text-xs font-extrabold sm:text-sm">
                        {plan.credits.toLocaleString()}{' '}
                        {m['stp.common.credits']()}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px]">
                      <div className="bg-background/50 rounded-lg p-2">
                        <Film className="mx-auto mb-1 size-3.5 text-blue-500" />
                        <span className="text-foreground font-bold">
                          ~{plan.metrics.videos}
                        </span>
                        <p className="text-muted-foreground text-[10px]">
                          {m['stp.pricing.videos_unit']()}
                        </p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-2">
                        <ImageIcon className="mx-auto mb-1 size-3.5 text-emerald-500" />
                        <span className="text-foreground font-bold">
                          ~{plan.metrics.images}
                        </span>
                        <p className="text-muted-foreground text-[10px]">
                          {m['stp.pricing.images_unit']()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="border-border/60 border-t pt-5">
                    <p className="text-foreground mb-4 text-xs font-bold tracking-wider uppercase">
                      {m['stp.pricing.includes']()}
                    </p>
                    <ul className="space-y-3 text-xs">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5">
                          <div className="bg-muted text-foreground mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full">
                            <Check className="size-3" strokeWidth={2.5} />
                          </div>
                          <span className="text-foreground/90 leading-tight font-medium">
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="mt-8 pt-2">
                  <button
                    type="button"
                    disabled={
                      checkoutMutation.isPending && pendingPlan?.id === plan.id
                    }
                    onClick={() => handleCheckout(plan)}
                    className={`w-full cursor-pointer rounded-2xl py-3.5 text-sm font-bold shadow-md transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                      isPopular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 hover:shadow-lg'
                        : 'bg-foreground text-background hover:bg-foreground/90 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80'
                    }`}
                  >
                    {checkoutMutation.isPending && pendingPlan?.id === plan.id
                      ? '...'
                      : plan.cta}
                  </button>
                  <p className="text-muted-foreground mt-2.5 text-center text-[11px]">
                    {m['stp.pricing.instant_activation']()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Security & Trust Pillars */}
        <div className="border-border/80 bg-card/60 mx-auto mb-20 max-w-5xl rounded-3xl border p-6 shadow-sm backdrop-blur-xl sm:p-8 lg:mb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="size-5" />
              </div>
              <h4 className="text-foreground text-xs font-bold sm:text-sm">
                {m['stp.pricing.trust1_title']()}
              </h4>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                {m['stp.pricing.trust1_desc']()}
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Zap className="size-5" />
              </div>
              <h4 className="text-foreground text-xs font-bold sm:text-sm">
                {m['stp.pricing.trust2_title']()}
              </h4>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                {m['stp.pricing.trust2_desc']()}
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <Sparkles className="size-5" />
              </div>
              <h4 className="text-foreground text-xs font-bold sm:text-sm">
                {m['stp.pricing.trust3_title']()}
              </h4>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                {m['stp.pricing.trust3_desc']()}
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                <Globe2 className="size-5" />
              </div>
              <h4 className="text-foreground text-xs font-bold sm:text-sm">
                {m['stp.pricing.trust4_title']()}
              </h4>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                {m['stp.pricing.trust4_desc']()}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing FAQs Section */}
        <FAQSection title={m['stp.pricing.faq_title']()} items={pricingFaqs} />

        <PaymentProviderModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setPendingPlan(null);
              setLoadingProvider(null);
            }
          }}
          providers={
            pendingPlan
              ? providersForPlan(pendingPlan)
              : enabledProviders.length
                ? enabledProviders
                : ['stripe']
          }
          providerNotes={
            pendingPlan ? providerChargeNotes(pendingPlan) : undefined
          }
          loadingProvider={loadingProvider}
          onSelect={handleProviderSelect}
          planName={pendingPlan?.name}
          price={pendingPlan?.price}
        />
      </section>
    </div>
  );
}
