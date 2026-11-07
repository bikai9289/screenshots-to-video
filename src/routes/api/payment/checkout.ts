import { createFileRoute } from '@tanstack/react-router';
import { screenshotServiceReady, studioFailure } from '@/server/screenshots';

import { getAuth } from '@/core/auth';
import {
  getPricingProduct,
  resolveProviderCheckoutPricing,
} from '@/config/pricing';
import { getScreenshotPack } from '@/config/screenshots-product';
import { getAllConfigs } from '@/modules/config/service';
import {
  createCheckout,
  resolveCheckoutProviderName,
} from '@/modules/payment/service';
import { isProduction } from '@/lib/env';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import { StudioError } from '@/lib/screenshots-contract';

function safeSameOriginPath(
  input: string | undefined | null,
  fallbackPath: string,
  baseUrl: string
): string {
  if (!input) return fallbackPath;
  try {
    const appUrl = new URL(baseUrl);
    const candidate = new URL(input, appUrl);
    if (candidate.origin !== appUrl.origin) return fallbackPath;
    return candidate.pathname + candidate.search + candidate.hash;
  } catch {
    return fallbackPath;
  }
}

// Mapped to localized messages by the pricing page.
const CNY_PROVIDER_UNAVAILABLE_ERROR =
  'Alipay and WeChat Pay are only available for one-time credit packs';
const PROVIDER_CURRENCY_REJECTED_ERROR =
  'This payment method does not support the selected currency';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'checkout',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized');
    }

    // Per account too: one user can't sidestep the IP bucket by switching networks.
    const userLimited = enforceMinIntervalRateLimit(request, {
      intervalMs: 1000,
      keyPrefix: 'checkout',
      extraKey: session.user.id,
    });
    if (userLimited) return userLimited;

    const body = await request.json().catch(() => ({}));
    const { product_id, payment_provider, redirect, currency, locale } = body;

    if (!product_id || typeof product_id !== 'string') {
      return respErr('Missing product_id');
    }

    // Look up product in the authoritative server-side catalog.
    // We DO NOT trust price / credits / plan from the request body.
    const product = getPricingProduct(product_id);
    if (!product) {
      return respErr('Unknown product');
    }
    const videoPack = getScreenshotPack(product_id);
    if (videoPack?.legacy)
      return respErr(
        'This pack is no longer sold. Choose a current credit pack.'
      );

    // Resolve the provider exactly as createCheckout will (requested, else
    // the payment manager default = default_payment_provider when that
    // provider is configured, otherwise the first configured one).
    const configs = await getAllConfigs();
    if (getScreenshotPack(product_id) && !screenshotServiceReady(configs))
      return studioFailure(new StudioError('SERVICE_UNAVAILABLE'));
    const providerKey = await resolveCheckoutProviderName(payment_provider);
    if (getScreenshotPack(product_id) && providerKey !== 'stripe')
      return studioFailure(new StudioError('INVALID_REQUEST'));

    // Price in the currency the provider will actually charge, so the order
    // amount/currency matches the paid amount verified later:
    // alipay/wechat → CNY only; creem → catalog USD; waffo/stripe → CNY when
    // the zh page requests it, else USD.
    const requestedCurrency =
      typeof currency === 'string' ? currency.toLowerCase() : '';
    const pricing = resolveProviderCheckoutPricing(product, {
      provider: providerKey,
      requestedCurrency,
    });
    if (!pricing.ok) {
      return respErr(CNY_PROVIDER_UNAVAILABLE_ERROR);
    }
    const { amount: authoritativePrice, currency: authoritativeCurrency } =
      pricing;

    // Optional per-provider "test amount" override (admin-configured).
    // Disabled in production: order.amount becomes the charge amount and
    // verifyPaidAmount accepts it, so a leftover test_amount would let users
    // pay $0.01 for full catalog credits.
    const testAmountRaw =
      !isProduction && providerKey
        ? configs[`${providerKey}_test_amount`]
        : undefined;
    const testAmount = testAmountRaw ? parseInt(testAmountRaw) : 0;
    const chargeAmount =
      !getScreenshotPack(product_id) && testAmount > 0
        ? testAmount
        : authoritativePrice;

    // Build success/cancel URLs — only accept same-origin redirects.
    const baseUrl = configs.app_url || 'http://localhost:3000';
    const safeRedirectPath = safeSameOriginPath(
      redirect,
      '/settings/payments',
      baseUrl
    );
    // Straight to the destination: safeSameOriginPath has already reduced it
    // to a path on this site. The old detour through /auth-callback exists to
    // hand a session token to a desktop client — a browser coming back from
    // checkout is already signed in, and that page isn't part of this app.
    const finalRedirect = `${baseUrl}${safeRedirectPath}`;
    const successUrl = `${baseUrl}/api/payment/callback?redirect=${encodeURIComponent(finalRedirect)}`;
    const checkoutLocale =
      typeof locale === 'string' && locale.split('-')[0] === 'zh' ? 'zh' : 'en';
    const cancelUrl = `${baseUrl}${checkoutLocale === 'zh' ? '/zh' : ''}/pricing`;

    const checkout = await createCheckout({
      userId: session.user.id,
      userEmail: session.user.email,
      productName: product.productName,
      planName: product.planName,
      credits: product.credits,
      creditsValidDays: product.creditsValidDays,
      paymentOrder: {
        metadata: getScreenshotPack(product_id)
          ? {
              disable_promotion_codes: 'true',
              video_credits: String(
                videoPack && !videoPack.legacy ? videoPack.credits : 0
              ),
              video_billing_version: 'credits-v1',
            }
          : undefined,
        productId: product.productId,
        price: { amount: chargeAmount, currency: authoritativeCurrency },
        type: product.type,
        description: product.description,
        successUrl,
        cancelUrl,
        locale: checkoutLocale,
        customer: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
        plan: product.plan
          ? {
              name: product.plan.name,
              interval: product.plan.interval,
              intervalCount: product.plan.intervalCount,
            }
          : undefined,
      },
      provider: payment_provider,
    });

    return respData({ checkout_url: checkout.checkoutInfo.checkoutUrl });
  } catch (error: any) {
    console.error('checkout error:', error);
    // Providers reject a currency their product has not enabled (e.g. CNY
    // not added in the Waffo product editor) with a raw message; the raw
    // detail stays in the log above.
    if (/currenc/i.test(String(error?.message || ''))) {
      return respErr(PROVIDER_CURRENCY_REJECTED_ERROR);
    }
    return respErr(error.message || 'Checkout failed');
  }
}

export const Route = createFileRoute('/api/payment/checkout')({
  server: {
    handlers: { POST },
  },
});
