import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { atomic, AtomicGuardError, guard } from '@/core/db/atomic';
import {
  AlipayProvider,
  CreemProvider,
  PaymentManager,
  StripeProvider,
  WaffoProvider,
  WechatPayProvider,
} from '@/core/payment';
import {
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentOrder,
  type PaymentRefund,
} from '@/core/payment/types';
import {
  credit,
  order,
  screenshotTask,
  subscription,
} from '@/config/db/schema';
import { getScreenshotPack } from '@/config/screenshots-product';
import { getAllConfigs } from '@/modules/config/service';
import {
  calculateCreditExpirationTime,
  planDeductForRefund,
} from '@/modules/credits/service';
import {
  findByProviderSubscriptionId,
  findBySubscriptionNo,
  SubscriptionStatus,
  updateBySubscriptionNo,
  type NewSubscription,
  type UpdateSubscription,
} from '@/modules/subscriptions/service';
import { getSnowId, getUniSeq, getUuid, md5 } from '@/lib/hash';

import {
  grantOrderCreditsOnce,
  insertIgnoringConflict,
  paymentAffectedRows,
} from './order-credits';

export { paymentAffectedRows };

// --- Order types ---

enum OrderStatus {
  PENDING = 'pending',
  CREATED = 'created',
  PAID = 'paid',
  FAILED = 'failed',
  // Provider reported success but paid amount/currency does not cover the order.
  ABNORMAL = 'abnormal',
  REFUNDING = 'refunding', // claimed by an in-flight refund
  REFUNDED = 'refunded',
}

// A refund stuck in REFUNDING (crash between provider call and DB commit) can
// be retried after this long; provider idempotency keys make the retry safe.
const REFUND_STALE_MS = 5 * 60 * 1000;

/**
 * Provider says "paid" but amount/currency still unknown after one re-query.
 * Webhook → non-2xx so provider redelivers; callback → keeps polling.
 */
export class PaymentAmountPendingError extends Error {
  constructor(orderNo: string) {
    super(`payment amount pending for order ${orderNo}`);
    this.name = 'PaymentAmountPendingError';
  }
}

export function isPaymentAmountPendingError(
  error: unknown
): error is PaymentAmountPendingError {
  return (
    error instanceof PaymentAmountPendingError ||
    (error instanceof Error && error.name === 'PaymentAmountPendingError')
  );
}

type AmountVerdict = {
  ok: boolean;
  reason?:
    | 'amount_short'
    | 'subtotal_short'
    | 'discount_mismatch'
    | 'currency_mismatch'
    | 'amount_unknown';
  expected: number;
  expectedCurrency: string;
  paid: number | null;
  paidCurrency: string;
  subtotal?: number | null;
  discount?: number;
  info?: any;
};

function pickAmount(v: any): number | null {
  return v === undefined ||
    v === null ||
    v === '' ||
    !Number.isFinite(Number(v))
    ? null
    : Number(v);
}

function reportedPaid(provider: string, info: any) {
  const platformCoupon = provider === 'alipay' || provider === 'wechat';
  const amount = platformCoupon
    ? (pickAmount(info?.amount) ?? pickAmount(info?.paymentAmount))
    : pickAmount(info?.paymentAmount);
  const currency = String(info?.paymentCurrency || info?.currency || '')
    .trim()
    .toLowerCase();
  return { amount, currency };
}

async function verifyPaidAmount(
  existingOrder: any,
  session: any,
  provider: string
): Promise<AmountVerdict> {
  const expected = Number(existingOrder.amount || 0);
  const expectedCurrency = String(existingOrder.currency || '')
    .trim()
    .toLowerCase();
  const base = { expected, expectedCurrency };
  if (getScreenshotPack(existingOrder.productId)) {
    const { amount, currency } = reportedPaid(provider, session.paymentInfo);
    return {
      ok:
        amount === expected &&
        currency === expectedCurrency &&
        provider === existingOrder.paymentProvider &&
        expected > 0,
      ...base,
      paid: amount,
      paidCurrency: currency,
      reason:
        amount !== expected
          ? 'amount_short'
          : currency !== expectedCurrency
            ? 'currency_mismatch'
            : undefined,
      info: session.paymentInfo,
    };
  }
  if (
    existingOrder.paymentType === PaymentType.SUBSCRIPTION ||
    existingOrder.paymentType === 'subscription' ||
    expected <= 0
  ) {
    return { ok: true, ...base, paid: null, paidCurrency: '' };
  }

  let { amount, currency } = reportedPaid(provider, session.paymentInfo);
  let info = session.paymentInfo;
  // 0 is a real paid amount (e.g. 100% promo). Only null/missing triggers re-query.
  if (amount === null || !currency) {
    try {
      const pm = await getPaymentManager();
      const p = pm.getProvider(existingOrder.paymentProvider || provider);
      const sessionId =
        p?.name === 'waffo'
          ? existingOrder.orderNo
          : existingOrder.paymentSessionId || existingOrder.orderNo;
      const fresh = p ? await p.getPaymentSession({ sessionId }) : null;
      if (fresh?.paymentStatus === PaymentStatus.SUCCESS && fresh.paymentInfo) {
        const r = reportedPaid(provider, fresh.paymentInfo);
        if (r.amount !== null) amount = r.amount;
        if (r.currency) currency = r.currency;
        info = fresh.paymentInfo;
      }
    } catch (error) {
      console.error('[payment] amount re-query failed', {
        orderNo: existingOrder.orderNo,
        provider,
        error: (error as any)?.message || String(error),
      });
    }
  }

  if (amount === null || !currency) {
    return {
      ok: false,
      reason: 'amount_unknown',
      ...base,
      paid: amount,
      paidCurrency: currency,
    };
  }

  const discount = Math.max(0, pickAmount(info?.discountAmount) ?? 0);
  const discountCurrency = String(info?.discountCurrency || '')
    .trim()
    .toLowerCase();
  const subtotal = pickAmount(info?.subtotalAmount);
  const detail = {
    ...base,
    paid: amount,
    paidCurrency: currency,
    subtotal,
    discount,
    info,
  };
  if (
    (expectedCurrency && currency !== expectedCurrency) ||
    (discount > 0 && discountCurrency && discountCurrency !== currency)
  ) {
    return { ok: false, reason: 'currency_mismatch', ...detail };
  }
  if (subtotal !== null && subtotal > 0) {
    if (subtotal < expected) {
      return { ok: false, reason: 'subtotal_short', ...detail };
    }
    if (amount + discount < subtotal) {
      return { ok: false, reason: 'discount_mismatch', ...detail };
    }
    return { ok: true, ...detail };
  }
  if (amount < expected) {
    return { ok: false, reason: 'amount_short', ...detail };
  }
  return { ok: true, ...detail };
}

async function markAmountMismatch(
  existingOrder: any,
  session: any,
  verdict: AmountVerdict
) {
  let prior: any = {};
  try {
    prior =
      typeof session.paymentResult === 'object' && session.paymentResult
        ? session.paymentResult
        : {};
  } catch {
    prior = {};
  }
  const result = await db()
    .update(order)
    .set({
      status: OrderStatus.ABNORMAL,
      paymentAmount: verdict.paid ?? null,
      paymentCurrency: verdict.paidCurrency || null,
      transactionId: session.paymentInfo?.transactionId || null,
      discountCode: verdict.info?.discountCode || null,
      discountAmount: verdict.info?.discountAmount ?? null,
      paymentResult: JSON.stringify({
        ...prior,
        amount_mismatch: {
          reason: verdict.reason,
          expected: verdict.expected,
          expectedCurrency: verdict.expectedCurrency,
          paid: verdict.paid,
          paidCurrency: verdict.paidCurrency,
          subtotal: verdict.subtotal ?? null,
          discount: verdict.discount ?? 0,
          discountCode: verdict.info?.discountCode || null,
          at: new Date().toISOString(),
        },
      }),
    })
    .where(
      and(
        eq(order.id, existingOrder.id),
        inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING])
      )
    );
  console.error('[payment] amount mismatch, order not fulfilled', {
    orderNo: existingOrder.orderNo,
    provider: existingOrder.paymentProvider,
    reason: verdict.reason,
    expected: verdict.expected,
    expectedCurrency: verdict.expectedCurrency,
    paid: verdict.paid,
    paidCurrency: verdict.paidCurrency,
    subtotal: verdict.subtotal ?? null,
    discount: verdict.discount ?? 0,
    marked: paymentAffectedRows(result) === 1,
  });
}

// --- Payment Manager ---

let manager: PaymentManager | null = null;
let managerConfigHash = '';

async function getPaymentManager(): Promise<PaymentManager> {
  const configs = await getAllConfigs();
  const c = (key: string) => configs[key] || '';

  // Rebuild manager if provider configs changed
  const hash = JSON.stringify([
    c('stripe_secret_key') || c('stripe_api_key'),
    c('creem_enabled'),
    c('creem_api_key'),
    c('waffo_enabled'),
    c('waffo_merchant_id'),
    c('waffo_private_key'),
    c('waffo_environment'),
    c('alipay_app_id'),
    c('wechat_mch_id'),
    c('default_payment_provider'),
  ]);
  if (manager && hash === managerConfigHash) return manager;

  manager = new PaymentManager();
  managerConfigHash = hash;

  const stripeKey = c('stripe_secret_key') || c('stripe_api_key');
  if (stripeKey) {
    const isDefault =
      !c('default_payment_provider') ||
      c('default_payment_provider') === 'stripe';
    manager.addProvider(
      new StripeProvider({
        secretKey: stripeKey,
        publishableKey: c('stripe_publishable_key'),
        signingSecret:
          c('stripe_signing_secret') || c('stripe_webhook_secret') || undefined,
        allowPromotionCodes: true,
        allowedPaymentMethods: ['card', 'wechat_pay', 'alipay'],
      }),
      isDefault
    );
  }

  if (c('creem_enabled') === 'true' && c('creem_api_key')) {
    const isDefault = c('default_payment_provider') === 'creem';
    manager.addProvider(
      new CreemProvider({
        apiKey: c('creem_api_key'),
        signingSecret: c('creem_signing_secret') || undefined,
        environment:
          c('creem_environment') === 'production' ? 'production' : 'sandbox',
      }),
      isDefault
    );
  }

  if (
    c('waffo_enabled') === 'true' &&
    c('waffo_merchant_id') &&
    c('waffo_private_key')
  ) {
    const isDefault = c('default_payment_provider') === 'waffo';
    manager.addProvider(
      new WaffoProvider({
        merchantId: c('waffo_merchant_id'),
        privateKey: c('waffo_private_key'),
        environment: c('waffo_environment') === 'production' ? 'prod' : 'test',
      }),
      isDefault
    );
  }

  if (c('alipay_app_id') && c('alipay_private_key')) {
    const isDefault = c('default_payment_provider') === 'alipay';
    manager.addProvider(
      new AlipayProvider({
        appId: c('alipay_app_id'),
        privateKey: c('alipay_private_key'),
        alipayPublicKey: c('alipay_public_key'),
        notifyUrl: c('alipay_notify_url') || undefined,
      }),
      isDefault
    );
  }

  if (c('wechat_mch_id') && c('wechat_private_key')) {
    const isDefault = c('default_payment_provider') === 'wechat';
    manager.addProvider(
      new WechatPayProvider({
        appId: c('wechat_app_id'),
        mchId: c('wechat_mch_id'),
        apiV3Key: c('wechat_api_v3_key'),
        privateKey: c('wechat_private_key'),
        serialNo: c('wechat_serial_no'),
        notifyUrl: c('wechat_notify_url') || undefined,
        platformCert: c('wechat_platform_cert') || undefined,
      }),
      isDefault
    );
  }

  return manager;
}

// --- Checkout ---

/**
 * Providers whose checkout needs a provider product id from
 * `<provider>_product_ids_mapping`. Currency/amount per provider is decided
 * by resolveProviderCheckoutPricing (src/config/pricing.ts).
 */
const MAPPED_PRODUCT_PROVIDERS = ['creem', 'waffo'];

export function requiresMappedProviderProduct(provider?: string | null) {
  return Boolean(provider && MAPPED_PRODUCT_PROVIDERS.includes(provider));
}

/**
 * Provider name createCheckout will actually use: the requested one (it
 * rejects unconfigured names), else the payment manager default — which is
 * `default_payment_provider` when that provider is configured, otherwise the
 * first configured provider.
 */
export async function resolveCheckoutProviderName(
  requested?: string | null
): Promise<string | undefined> {
  if (requested) return requested;
  const pm = await getPaymentManager();
  return pm.getDefaultProvider()?.name;
}

export async function createCheckout(params: {
  userId: string;
  userEmail?: string;
  paymentOrder: PaymentOrder;
  provider?: string;
  productName?: string;
  planName?: string;
  credits?: number;
  creditsValidDays?: number;
}): Promise<CheckoutSession> {
  const {
    userId,
    userEmail,
    paymentOrder,
    provider,
    productName,
    planName,
    credits,
    creditsValidDays,
  } = params;
  const pm = await getPaymentManager();
  if (provider && !pm.getProviderNames().includes(provider)) {
    throw new Error(`Payment provider '${provider}' is not configured`);
  }
  const orderNo = getUniSeq('ORD');
  const configs = await getAllConfigs();
  const appUrl = configs.app_url || 'http://localhost:3000';

  // Resolve provider-specific product ID (e.g. Creem/Waffo product IDs mapping)
  const resolvedProvider = provider || pm.getDefaultProvider()?.name;
  let resolvedProductId = paymentOrder.productId;
  if (
    requiresMappedProviderProduct(resolvedProvider) &&
    paymentOrder.productId
  ) {
    const mapping = configs[`${resolvedProvider}_product_ids_mapping`];
    let mappedProductId: string | null = null;
    if (mapping) {
      try {
        const map = JSON.parse(mapping) as Record<string, string>;
        mappedProductId =
          typeof map[paymentOrder.productId] === 'string'
            ? map[paymentOrder.productId].trim()
            : '';
        if (mappedProductId) {
          resolvedProductId = mappedProductId;
        }
      } catch {
        // invalid JSON — treat as unmapped
      }
    }
    // Never send catalog ids to Creem/Waffo (providers reject with PROD_xxx etc.).
    if (!mappedProductId || resolvedProductId === paymentOrder.productId) {
      throw new Error('Payment product mapping not configured');
    }
  }

  const finalSuccessUrl =
    paymentOrder.successUrl || `${appUrl}/settings/billing?success=1`;
  const callbackSuccessUrl = `${appUrl}/api/payment/callback?order_no=${orderNo}&redirect=${encodeURIComponent(finalSuccessUrl)}`;

  const session = await pm.createPayment({
    order: {
      ...paymentOrder,
      productId: resolvedProductId,
      orderNo,
      metadata: { ...paymentOrder.metadata, userId },
      successUrl: callbackSuccessUrl,
      cancelUrl:
        paymentOrder.cancelUrl || `${appUrl}/settings/billing?canceled=1`,
    },
    provider,
  });

  await db()
    .insert(order)
    .values({
      id: getUuid(),
      orderNo,
      userId,
      userEmail: userEmail || '',
      status: OrderStatus.CREATED,
      amount: paymentOrder.price?.amount || 0,
      currency: paymentOrder.price?.currency || 'usd',
      productId: paymentOrder.productId || '',
      productName: productName || null,
      planName: planName || null,
      creditsAmount: credits ?? null,
      creditsValidDays: creditsValidDays ?? null,
      paymentType: paymentOrder.type || 'one-time',
      paymentProvider: session.provider,
      paymentSessionId: session.checkoutInfo.sessionId,
      checkoutInfo: JSON.stringify(session.checkoutInfo),
      checkoutResult: JSON.stringify(session.checkoutResult),
      checkoutUrl: session.checkoutInfo.checkoutUrl,
      description: paymentOrder.description || '',
    });

  return session;
}

// --- Payment callback (return_url) ---

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handlePaymentCallback(orderNo: string) {
  // Find the order
  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(eq(order.orderNo, orderNo))
    .limit(1);

  if (!existingOrder) return;

  if (existingOrder.status === OrderStatus.PAID) return;

  // Query the payment provider for latest status
  const pm = await getPaymentManager();
  if (!pm.getProviderNames().includes(existingOrder.paymentProvider)) return;
  const provider = pm.getProvider(existingOrder.paymentProvider);
  if (!provider) return;

  const sessionId =
    provider.name === 'waffo'
      ? existingOrder.orderNo
      : existingOrder.paymentSessionId || existingOrder.orderNo;

  // Reuse the same atomic success handler as the webhook so that
  // subscriptions are created and credits granted on synchronous return too.
  // This is important in environments where webhooks aren't reachable (e.g. localhost).
  // Provider still processing / paid amount not reported yet: poll briefly,
  // then leave the order open for the webhook instead of failing the redirect.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const session = await provider.getPaymentSession({ sessionId });
      if (session.paymentStatus === PaymentStatus.PROCESSING) {
        throw new PaymentAmountPendingError(orderNo);
      }
      await handleCheckoutSuccess(session, existingOrder.paymentProvider);
      return;
    } catch (error) {
      if (!isPaymentAmountPendingError(error)) throw error;
      if (attempt < 5) {
        await sleep(attempt * 600);
        continue;
      }
      console.warn(
        `payment amount still pending after callback polls for ${orderNo}`
      );
    }
  }
}

/** Read provider truth for an owned order; callers handle auth/rate limits. */
export async function refreshPaymentOrder(orderNo: string, userId?: string) {
  const [existing] = await db()
    .select()
    .from(order)
    .where(
      and(
        eq(order.orderNo, orderNo),
        isNull(order.deletedAt),
        userId ? eq(order.userId, userId) : undefined
      )
    )
    .limit(1);
  if (!existing) return null;
  if (
    existing.paymentProvider !== 'stripe' ||
    !['created', 'pending'].includes(existing.status)
  )
    return { order: existing, session: null };
  const pm = await getPaymentManager();
  const provider = pm.getProvider('stripe');
  if (!provider || !existing.paymentSessionId)
    throw new Error('Payment provider unavailable');
  const session = await provider.getPaymentSession({
    sessionId: existing.paymentSessionId,
  });
  await handleCheckoutSuccess(session, 'stripe');
  // Keep a safe status snapshot, not the expanded intent's card/customer data.
  if (session.paymentStatus === PaymentStatus.PROCESSING) {
    await db()
      .update(order)
      .set({
        paymentResult: JSON.stringify({
          id: existing.paymentSessionId,
          status: session.paymentResult?.status,
          payment_status: session.paymentResult?.payment_status,
          checkedAt: new Date().toISOString(),
          attempt: session.paymentAttempt,
        }),
      })
      .where(
        and(
          eq(order.id, existing.id),
          inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING])
        )
      );
  }
  const [current] = await db()
    .select()
    .from(order)
    .where(eq(order.id, existing.id))
    .limit(1);
  return { order: current || existing, session };
}

// --- Webhook handling ---

export async function handleWebhook(params: {
  req: Request;
  provider: string;
}): Promise<PaymentEvent> {
  const pm = await getPaymentManager();
  if (!pm.getProviderNames().includes(params.provider)) {
    throw new Error(`Payment provider '${params.provider}' is not configured`);
  }
  const event = await pm.getPaymentEvent({
    req: params.req,
    provider: params.provider,
  });
  const session = event.paymentSession;
  if (!session) return event;

  const eventType = event.eventType;

  // Route event to appropriate handler
  if (eventType === 'checkout.success') {
    await handleCheckoutSuccess(session, params.provider);
  } else if (eventType === 'payment.success') {
    if (
      session.paymentInfo?.subscriptionCycleType ===
      SubscriptionCycleType.RENEWAL
    ) {
      await handleSubscriptionRenewal(session, params.provider);
    } else {
      await handleCheckoutSuccess(session, params.provider);
    }
  } else if (eventType === 'subscribe.updated') {
    await handleSubscriptionUpdated(session, params.provider);
  } else if (eventType === 'subscribe.canceled') {
    await handleSubscriptionCanceled(session, params.provider);
  } else if (eventType === 'payment.refunded') {
    await handlePaymentRefunded(session, params.provider);
  }

  return event;
}

function isSubscriptionOrder(ord: any): boolean {
  return (
    ord?.paymentType === 'subscription' ||
    ord?.paymentType === PaymentType.SUBSCRIPTION
  );
}

/**
 * Attach the provider subscription to an order exactly once: claim the
 * order's empty subscription_no slot with a conditional UPDATE; only the
 * claimer inserts the subscription row (or links an existing one with the
 * same provider subscription id). Losers read back the winner's number.
 */
async function attachOrderSubscription(
  tx: any,
  params: { ord: any; session: any; provider: string; paymentInfo: any }
): Promise<{ subscriptionNo: string; created: boolean }> {
  const { ord, session, provider, paymentInfo } = params;
  const subscriptionInfo = session.subscriptionInfo;

  const [existingSub] = await tx
    .select({ subscriptionNo: subscription.subscriptionNo })
    .from(subscription)
    .where(
      and(
        eq(subscription.paymentProvider, provider),
        eq(subscription.subscriptionId, session.subscriptionId),
        isNull(subscription.deletedAt)
      )
    )
    .limit(1);
  const subscriptionNo: string = existingSub?.subscriptionNo || getSnowId();

  const claim = await tx
    .update(order)
    .set({
      subscriptionNo,
      subscriptionId: session.subscriptionId,
      subscriptionResult: JSON.stringify(session.subscriptionResult),
    })
    .where(
      and(
        eq(order.id, ord.id),
        or(isNull(order.subscriptionNo), eq(order.subscriptionNo, ''))
      )
    );
  if (paymentAffectedRows(claim) !== 1) {
    const [current] = await tx
      .select({ subscriptionNo: order.subscriptionNo })
      .from(order)
      .where(eq(order.id, ord.id))
      .limit(1);
    return { subscriptionNo: current?.subscriptionNo || '', created: false };
  }
  if (existingSub) return { subscriptionNo, created: false };

  const newSub: any = {
    id: getUuid(),
    subscriptionNo,
    userId: ord.userId,
    userEmail: ord.userEmail || ord.paymentEmail || '',
    status: subscriptionInfo.status || SubscriptionStatus.ACTIVE,
    paymentProvider: provider,
    subscriptionId: session.subscriptionId,
    subscriptionResult: JSON.stringify(session.subscriptionResult),
    productId: ord.productId,
    description: subscriptionInfo.description || 'Subscription Created',
    amount: subscriptionInfo.amount,
    currency: subscriptionInfo.currency,
    interval: subscriptionInfo.interval,
    intervalCount: subscriptionInfo.intervalCount,
    trialPeriodDays: subscriptionInfo.trialPeriodDays,
    currentPeriodStart: subscriptionInfo.currentPeriodStart,
    currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
    billingUrl: subscriptionInfo.billingUrl,
    planName: ord.planName || ord.productName,
    productName: ord.productName,
    creditsAmount: ord.creditsAmount,
    creditsValidDays: ord.creditsValidDays,
    paymentProductId: ord.paymentProductId,
    paymentUserId: paymentInfo?.paymentUserId,
  };
  await tx.insert(subscription).values(newSub);
  return { subscriptionNo, created: true };
}

/**
 * Idempotent repair for an order that is already paid: attach a missing
 * subscription and grant missing credits. Never re-fulfills.
 */
async function backfillPaidOrder(
  existingOrder: any,
  session: any,
  provider: string
) {
  const subscriptionInfo = session.subscriptionInfo;
  let createdSubscriptionNo: string | null = null;

  await db().transaction(async (tx: any) => {
    let subscriptionNo: string = existingOrder.subscriptionNo || '';
    if (
      !subscriptionNo &&
      isSubscriptionOrder(existingOrder) &&
      subscriptionInfo &&
      session.subscriptionId
    ) {
      const attached = await attachOrderSubscription(tx, {
        ord: existingOrder,
        session,
        provider,
        paymentInfo: session.paymentInfo,
      });
      subscriptionNo = attached.subscriptionNo;
      if (attached.created) createdSubscriptionNo = attached.subscriptionNo;
    }

    const granted = await grantOrderCreditsOnce(tx, {
      orderNo: existingOrder.orderNo,
      userId: existingOrder.userId,
      userEmail: existingOrder.userEmail,
      subscriptionNo,
      credits: existingOrder.creditsAmount,
      transactionScene: isSubscriptionOrder(existingOrder)
        ? 'subscription'
        : 'payment',
      description: 'Grant credit',
      expiresAt: calculateCreditExpirationTime({
        creditsValidDays: existingOrder.creditsValidDays || 0,
        currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
      }),
    });
    if (granted || createdSubscriptionNo) {
      console.warn('[payment] backfilled paid order', {
        orderNo: existingOrder.orderNo,
        provider,
        granted,
        subscriptionNo: createdSubscriptionNo,
      });
    }
  });
}

// --- Checkout Success: update order + create subscription + grant credits ---

/** Settle a trusted saved order snapshot. Atomic guards recheck it at write time. */
export async function settleCheckoutOrder(
  savedOrder: typeof order.$inferSelect,
  session: any,
  provider: string
) {
  const [current] = await db()
    .select()
    .from(order)
    .where(and(eq(order.id, savedOrder.id), isNull(order.deletedAt)))
    .limit(1);
  if (!current) return;
  if (current.paymentProvider !== provider)
    throw new Error('Payment provider does not match order');
  if (![OrderStatus.CREATED, OrderStatus.PENDING].includes(current.status))
    return;
  if (session.paymentStatus !== PaymentStatus.SUCCESS) {
    if (
      [PaymentStatus.FAILED, PaymentStatus.CANCELED].includes(
        session.paymentStatus
      )
    )
      await db()
        .update(order)
        .set({ status: OrderStatus.FAILED })
        .where(
          and(
            eq(order.id, current.id),
            inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING])
          )
        );
    return;
  }
  // Legacy trusted integrations used `amount`; normalize it only against this saved order.
  const info = { ...session.paymentInfo };
  info.paymentAmount = info.paymentAmount ?? info.amount;
  if (!info.paymentCurrency && info.amount !== undefined)
    info.paymentCurrency = current.currency;
  const verdict = await verifyPaidAmount(
    current,
    { ...session, paymentInfo: info },
    provider
  );
  if (!verdict.ok)
    throw new Error('Payment amount or currency does not match order');
  const [existingGrant] = await db()
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.orderNo, current.orderNo),
        eq(credit.transactionType, 'grant')
      )
    )
    .limit(1);
  const subscriptionInfo = session.subscriptionInfo;
  const [existingSubscription] = session.subscriptionId
    ? await db()
        .select({
          id: subscription.id,
          subscriptionNo: subscription.subscriptionNo,
        })
        .from(subscription)
        .where(
          and(
            eq(subscription.paymentProvider, provider),
            eq(subscription.subscriptionId, session.subscriptionId)
          )
        )
        .limit(1)
    : [];
  const subscriptionNo =
    current.subscriptionNo ||
    existingSubscription?.subscriptionNo ||
    (session.subscriptionId && subscriptionInfo
      ? `sub_${md5(`${provider}:${session.subscriptionId}`)}`
      : '');
  const grantAmount = Number(current.creditsAmount || 0);
  try {
    await atomic((q) => [
      guard({
        table: order,
        column: 'userId',
        where: eq(order.id, current.id),
        require: inArray(order.status, [
          OrderStatus.CREATED,
          OrderStatus.PENDING,
        ]),
        message: 'Order already settled',
      }),
      q
        .update(order)
        .set({
          status: OrderStatus.PAID,
          paidAt: info.paidAt || new Date(),
          paymentAmount: info.paymentAmount ?? null,
          paymentCurrency: info.paymentCurrency || null,
          transactionId: info.transactionId || null,
          paymentResult: JSON.stringify(session.paymentResult || {}),
          ...(subscriptionNo
            ? { subscriptionNo, subscriptionId: session.subscriptionId }
            : {}),
        })
        .where(eq(order.id, current.id)),
      !existingSubscription &&
        !!subscriptionInfo &&
        !!session.subscriptionId &&
        q.insert(subscription).values({
          id: subscriptionNo,
          subscriptionNo,
          userId: current.userId,
          userEmail: current.userEmail || '',
          status: subscriptionInfo.status || 'active',
          paymentProvider: provider,
          subscriptionId: session.subscriptionId,
          subscriptionResult: JSON.stringify(session.subscriptionResult || {}),
          productId: current.productId,
          amount: subscriptionInfo.amount,
          currency: subscriptionInfo.currency,
          interval: subscriptionInfo.interval,
          intervalCount: subscriptionInfo.intervalCount,
          currentPeriodStart: subscriptionInfo.currentPeriodStart,
          currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
          creditsAmount: current.creditsAmount,
          creditsValidDays: current.creditsValidDays,
        }),
      !existingGrant &&
        grantAmount > 0 &&
        q.insert(credit).values({
          id: `grant_${md5(current.orderNo)}`,
          userId: current.userId,
          userEmail: current.userEmail || '',
          orderNo: current.orderNo,
          subscriptionNo,
          transactionNo: `grant-${current.orderNo}`,
          transactionType: 'grant',
          transactionScene: isSubscriptionOrder(current)
            ? 'subscription'
            : 'payment',
          credits: grantAmount,
          remainingCredits: grantAmount,
          status: 'active',
          description: 'Grant credit',
          expiresAt: calculateCreditExpirationTime({
            creditsValidDays: current.creditsValidDays || 0,
            currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
          }),
        }),
    ]);
  } catch (error) {
    if (!(error instanceof AtomicGuardError)) throw error;
  }
}

export async function handleCheckoutSuccess(session: any, provider: string) {
  // Different providers expose the session identifier under different keys.
  // We try the common shapes; for Alipay the natural key is out_trade_no
  // (which equals our orderNo and the value we stored in paymentSessionId).
  const result = session.paymentResult || {};
  const sessionId: string =
    result.id ||
    result.object?.id ||
    result.out_trade_no ||
    result.outTradeNo ||
    '';
  if (!sessionId) return;

  // Find order by session ID
  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(
      and(
        or(eq(order.paymentSessionId, sessionId), eq(order.orderNo, sessionId)),
        isNull(order.deletedAt)
      )
    )
    .limit(1);

  if (!existingOrder) return;

  if (getScreenshotPack(existingOrder.productId)) {
    if (existingOrder.paymentProvider !== provider)
      throw new Error('Payment provider does not match order');
    // Delivery order is not guaranteed. Verified paid truth may recover a
    // previously failed checkout, but cannot reopen paid/refunding/refunded orders.
    const settleable =
      session.paymentStatus === PaymentStatus.SUCCESS && provider === 'stripe'
        ? [OrderStatus.CREATED, OrderStatus.PENDING, OrderStatus.FAILED]
        : [OrderStatus.CREATED, OrderStatus.PENDING];
    if (!settleable.includes(existingOrder.status)) return;
    if (session.paymentStatus !== PaymentStatus.SUCCESS) {
      if (
        [PaymentStatus.FAILED, PaymentStatus.CANCELED].includes(
          session.paymentStatus
        )
      )
        await db()
          .update(order)
          .set({
            status: OrderStatus.FAILED,
            paymentResult: JSON.stringify({
              id: sessionId,
              status: session.paymentResult?.status,
              payment_status: session.paymentResult?.payment_status,
            }),
          })
          .where(
            and(
              eq(order.id, existingOrder.id),
              inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING])
            )
          );
      return;
    }
    const verdict = await verifyPaidAmount(existingOrder, session, provider);
    if (!verdict.ok)
      throw new Error('Payment amount or currency does not match order');
    await atomic((q) => [
      q
        .update(order)
        .set({
          status: OrderStatus.PAID,
          paymentAmount: verdict.paid,
          paymentCurrency: verdict.paidCurrency,
          paymentResult: JSON.stringify(session.paymentResult || {}),
          paidAt: new Date(),
          transactionId: session.paymentInfo?.transactionId || null,
        })
        .where(
          and(
            eq(order.id, existingOrder.id),
            eq(order.paymentProvider, provider),
            inArray(order.status, settleable)
          )
        ),
      guard({
        table: order,
        column: 'userId',
        where: eq(order.id, existingOrder.id),
        require: and(
          eq(order.status, OrderStatus.PAID),
          eq(order.paymentProvider, provider),
          eq(order.paymentAmount, existingOrder.amount)
        )!,
        message: 'Payment settlement claim failed',
      }),
    ]);
    return;
  }

  // Already paid (earlier callback/webhook, or admin release): don't fulfill
  // again, only backfill what that fulfillment missed (subscription payload
  // arrived later, or a D1 run died between claim and grant). Each backfill
  // step is guarded so concurrent redeliveries apply it at most once.
  if (existingOrder.status === OrderStatus.PAID) {
    if (session.paymentStatus === PaymentStatus.SUCCESS) {
      await backfillPaidOrder(existingOrder, session, provider);
    }
    return;
  }
  if (
    existingOrder.status !== OrderStatus.CREATED &&
    existingOrder.status !== OrderStatus.PENDING
  )
    return;

  let verifiedInfo: any = null;
  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    const verdict = await verifyPaidAmount(existingOrder, session, provider);
    verifiedInfo = verdict.info ?? null;
    if (!verdict.ok && verdict.reason === 'amount_unknown') {
      console.warn(
        '[payment] success without amount/currency, order left open',
        {
          orderNo: existingOrder.orderNo,
          provider,
          paid: verdict.paid,
          paidCurrency: verdict.paidCurrency,
        }
      );
      throw new PaymentAmountPendingError(existingOrder.orderNo);
    }
    if (!verdict.ok) {
      await markAmountMismatch(existingOrder, session, verdict);
      return;
    }
  }

  const paymentInfo =
    verifiedInfo && verifiedInfo !== session.paymentInfo
      ? { ...(session.paymentInfo || {}), ...verifiedInfo }
      : session.paymentInfo;
  const subscriptionInfo = session.subscriptionInfo;

  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    // Prepare order update
    const orderUpdate: Record<string, any> = {
      status: OrderStatus.PAID,
      paymentResult: JSON.stringify(session.paymentResult),
      // ?? keeps a verified real 0 (e.g. 100% promo); only absent → null.
      paymentAmount: paymentInfo?.paymentAmount ?? null,
      paymentCurrency: paymentInfo?.paymentCurrency || null,
      paymentEmail: paymentInfo?.paymentEmail || null,
      paidAt: paymentInfo?.paidAt || new Date(),
      transactionId: paymentInfo?.transactionId || null,
      invoiceId: paymentInfo?.invoiceId || null,
      invoiceUrl: paymentInfo?.invoiceUrl || null,
      paymentUserName: paymentInfo?.paymentUserName || null,
      paymentUserId: paymentInfo?.paymentUserId || null,
      discountCode: paymentInfo?.discountCode || null,
      discountAmount: paymentInfo?.discountAmount || null,
    };

    // Claim-first: only the request whose conditional UPDATE moves the order
    // created/pending → paid fulfills it; concurrent callers see 0 rows and
    // return. D1 runs transaction(fn) as fn(db) and SQLite has no row locks,
    // so the guarded UPDATE is the real mutex. On Postgres/MySQL the
    // transaction also rolls the claim back if a later step throws (provider
    // retries); on D1 a redelivery heals via backfillPaidOrder.
    await db().transaction(async (tx: any) => {
      const claim = await tx
        .update(order)
        .set(orderUpdate)
        .where(
          and(
            eq(order.id, existingOrder.id),
            inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING])
          )
        );
      if (paymentAffectedRows(claim) !== 1) return;

      // 1. Create / link subscription (guarded by the order's empty slot)
      let subscriptionNo = '';
      if (subscriptionInfo && session.subscriptionId) {
        const attached = await attachOrderSubscription(tx, {
          ord: existingOrder,
          session,
          provider,
          paymentInfo,
        });
        subscriptionNo = attached.subscriptionNo;
      }

      // 2. Grant credits (at most once per order)
      await grantOrderCreditsOnce(tx, {
        orderNo: existingOrder.orderNo,
        userId: existingOrder.userId,
        userEmail: existingOrder.userEmail,
        subscriptionNo,
        credits: existingOrder.creditsAmount,
        transactionScene: isSubscriptionOrder(existingOrder)
          ? 'subscription'
          : 'payment',
        description: 'Grant credit',
        expiresAt: calculateCreditExpirationTime({
          creditsValidDays: existingOrder.creditsValidDays || 0,
          currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
        }),
      });
    });
  } else if (
    session.paymentStatus === PaymentStatus.FAILED ||
    session.paymentStatus === PaymentStatus.CANCELED
  ) {
    await db()
      .update(order)
      .set({
        status: OrderStatus.FAILED,
        paymentResult: JSON.stringify(session.paymentResult),
      })
      .where(
        and(
          eq(order.id, existingOrder.id),
          or(
            eq(order.status, OrderStatus.CREATED),
            eq(order.status, OrderStatus.PENDING)
          )
        )
      );
  }
}

async function handlePaymentRefunded(session: any, provider: string) {
  const result = session.paymentResult || {};
  const sessionId: string = result.id || result.orderNo || '';
  if (!sessionId) return;

  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(
      and(
        or(eq(order.paymentSessionId, sessionId), eq(order.orderNo, sessionId)),
        eq(order.paymentProvider, provider),
        isNull(order.deletedAt)
      )
    )
    .limit(1);
  if (!existingOrder) return;

  await db().transaction(async (tx: any) => {
    const [lockedOrder] = await tx
      .select()
      .from(order)
      .where(eq(order.id, existingOrder.id))
      .limit(1)
      .for('update');
    if (!lockedOrder || lockedOrder.status !== OrderStatus.PAID) return;

    // Conditional paid → failed: on D1/SQLite (no row locks) only one
    // concurrent refund delivery wins and expires the credits below.
    const claim = await tx
      .update(order)
      .set({
        status: OrderStatus.FAILED,
        paymentResult: JSON.stringify(session.paymentResult),
      })
      .where(
        and(eq(order.id, lockedOrder.id), eq(order.status, OrderStatus.PAID))
      );
    if (paymentAffectedRows(claim) !== 1) return;

    await tx
      .update(credit)
      .set({ remainingCredits: 0, status: 'expired' })
      .where(
        and(
          eq(credit.orderNo, lockedOrder.orderNo),
          eq(credit.transactionType, 'grant'),
          eq(credit.status, 'active')
        )
      );

    if (lockedOrder.subscriptionNo) {
      await tx
        .update(credit)
        .set({ remainingCredits: 0, status: 'expired' })
        .where(
          and(
            eq(credit.subscriptionNo, lockedOrder.subscriptionNo),
            eq(credit.transactionType, 'grant'),
            eq(credit.status, 'active')
          )
        );
      await tx
        .update(subscription)
        .set({ status: SubscriptionStatus.CANCELED, canceledAt: new Date() })
        .where(eq(subscription.subscriptionNo, lockedOrder.subscriptionNo));
    }
  });
}

// --- Subscription Renewal ---

/**
 * Idempotency key for a renewal order. Prefer the provider transaction id;
 * without one, a subscription is renewed at most once per billing period, so
 * subscription + period start identifies the renewal across redeliveries.
 */
export function renewalOrderIdFor(input: {
  provider: string;
  transactionId?: string | null;
  subscriptionNo: string;
  currentPeriodStart: Date | string | number;
}): string {
  if (input.transactionId) {
    return `renew-${md5(`${input.provider}:${input.transactionId}`)}`;
  }
  const periodStart = new Date(input.currentPeriodStart).getTime();
  if (!Number.isFinite(periodStart)) {
    throw new Error('renewal without transaction id needs a period start');
  }
  return `renew-${md5(
    `${input.provider}:period:${input.subscriptionNo}:${periodStart}`
  )}`;
}

export async function handleSubscriptionRenewal(
  session: any,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub || !existingSub.amount || !existingSub.currency) return;

  const subscriptionInfo = session.subscriptionInfo;
  if (
    !subscriptionInfo.currentPeriodStart ||
    !subscriptionInfo.currentPeriodEnd
  )
    return;

  if (session.paymentStatus !== PaymentStatus.SUCCESS) return;

  const paymentInfo = session.paymentInfo;

  const renewalOrderNo = getSnowId();
  // Stable primary key per renewal, so repeated/concurrent deliveries can't
  // both insert an order (D1/SQLite have no row locks).
  const renewalOrderId = renewalOrderIdFor({
    provider,
    transactionId: paymentInfo?.transactionId,
    subscriptionNo: existingSub.subscriptionNo,
    currentPeriodStart: subscriptionInfo.currentPeriodStart,
  });

  const periodStart = new Date(subscriptionInfo.currentPeriodStart);
  const periodEnd = new Date(subscriptionInfo.currentPeriodEnd);
  if (
    !Number.isFinite(periodStart.getTime()) ||
    !Number.isFinite(periodEnd.getTime()) ||
    periodEnd <= periodStart
  )
    throw new Error('Invalid renewal period');
  if (
    existingSub.currentPeriodStart &&
    new Date(existingSub.currentPeriodStart) >= periodStart
  )
    return;
  if (paymentInfo?.transactionId) {
    const [duplicate] = await db()
      .select({ id: order.id })
      .from(order)
      .where(
        and(
          eq(order.transactionId, paymentInfo.transactionId),
          eq(order.paymentProvider, provider)
        )
      )
      .limit(1);
    if (duplicate) return;
  }
  // Claim the billing period, order and credit grant in a single batch on SQLite/D1.
  // A different delivery transaction ID for the same period must not grant twice.
  try {
    await atomic((q) => [
      guard({
        table: subscription,
        column: 'userId',
        where: eq(subscription.id, existingSub.id),
        require: or(
          isNull(subscription.currentPeriodStart),
          lt(subscription.currentPeriodStart, periodStart)
        )!,
        message: 'Renewal period already settled',
      }),
      q.insert(order).values({
        id: renewalOrderId,
        orderNo: renewalOrderNo,
        userId: existingSub.userId,
        userEmail: existingSub.userEmail || '',
        status: OrderStatus.PAID,
        amount: existingSub.amount,
        currency: existingSub.currency,
        productId: existingSub.productId || '',
        paymentType: 'renew',
        paymentInterval: existingSub.interval || '',
        paymentProvider: provider,
        checkoutInfo: '',
        description: 'Subscription Renewal',
        productName: existingSub.productName || '',
        planName: existingSub.planName || '',
        creditsAmount: existingSub.creditsAmount,
        creditsValidDays: existingSub.creditsValidDays,
        paymentProductId: existingSub.paymentProductId || '',
        paymentResult: JSON.stringify(session.paymentResult),
        paymentAmount: paymentInfo?.paymentAmount,
        paymentCurrency: paymentInfo?.paymentCurrency,
        paymentEmail: paymentInfo?.paymentEmail,
        paidAt: paymentInfo?.paidAt || new Date(),
        invoiceId: paymentInfo?.invoiceId,
        invoiceUrl: paymentInfo?.invoiceUrl,
        subscriptionNo: existingSub.subscriptionNo,
        subscriptionId: session.subscriptionId,
        transactionId: paymentInfo?.transactionId,
        paymentUserName: paymentInfo?.paymentUserName,
        paymentUserId: paymentInfo?.paymentUserId,
      }),
      q
        .update(subscription)
        .set({
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        })
        .where(eq(subscription.id, existingSub.id)),
      Number(existingSub.creditsAmount) > 0 &&
        q.insert(credit).values({
          id: `grant_${md5(renewalOrderId)}`,
          orderNo: renewalOrderNo,
          userId: existingSub.userId,
          userEmail: existingSub.userEmail,
          subscriptionNo: existingSub.subscriptionNo,
          transactionNo: `grant-${renewalOrderId}`,
          transactionType: 'grant',
          credits: existingSub.creditsAmount,
          remainingCredits: existingSub.creditsAmount,
          status: 'active',
          transactionScene: 'renewal',
          description: 'Grant credit',
          expiresAt: calculateCreditExpirationTime({
            creditsValidDays: existingSub.creditsValidDays || 0,
            currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
          }),
        }),
    ]);
  } catch (error) {
    if (!(error instanceof AtomicGuardError)) throw error;
  }
}

// --- Subscription Updated ---

async function handleSubscriptionUpdated(session: any, provider: string) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;

  const info = session.subscriptionInfo;
  await updateBySubscriptionNo(existingSub.subscriptionNo, {
    status: info.status,
    currentPeriodStart: info.currentPeriodStart,
    currentPeriodEnd: info.currentPeriodEnd,
    canceledAt: info.canceledAt || null,
    canceledEndAt: info.canceledEndAt || null,
    canceledReason: info.canceledReason || '',
    canceledReasonType: info.canceledReasonType || '',
  });
}

// --- Subscription Canceled ---

async function handleSubscriptionCanceled(session: any, provider: string) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;

  const info = session.subscriptionInfo;
  await updateBySubscriptionNo(existingSub.subscriptionNo, {
    status: SubscriptionStatus.CANCELED,
    canceledAt: info.canceledAt,
    canceledEndAt: info.canceledEndAt,
    canceledReason: info.canceledReason,
    canceledReasonType: info.canceledReasonType,
  });
}

// --- Cancel subscription (user-initiated) ---

export async function cancelUserSubscription(params: {
  userId: string;
  subscriptionNo: string;
}) {
  const { userId, subscriptionNo } = params;

  const sub = await findBySubscriptionNo(subscriptionNo);
  if (!sub) throw new Error('Subscription not found');
  if (sub.userId !== userId) throw new Error('Forbidden');

  if (
    sub.status === SubscriptionStatus.CANCELED ||
    sub.status === SubscriptionStatus.EXPIRED
  ) {
    return sub;
  }

  const pm = await getPaymentManager();
  const provider = pm.getProvider(sub.paymentProvider);
  if (!provider || !provider.cancelSubscription) {
    throw new Error('Cancellation not supported for this provider');
  }

  const session = await provider.cancelSubscription({
    subscriptionId: sub.subscriptionId,
  });

  const info = session.subscriptionInfo;
  const updated = await updateBySubscriptionNo(subscriptionNo, {
    status: info?.status || SubscriptionStatus.CANCELED,
    canceledAt: info?.canceledAt || new Date(),
    canceledEndAt: info?.canceledEndAt || null,
    canceledReason: info?.canceledReason || 'Canceled by user',
    canceledReasonType: info?.canceledReasonType || 'user_request',
  });

  return updated;
}

// --- Refund (admin-initiated) ---

export async function refundOrder(params: {
  orderNo: string;
  operatorId: string;
  reason?: string;
  deductCredits?: number; // defaults to the credits this order granted
  cancelSubscription?: boolean;
}) {
  const { orderNo, operatorId, reason } = params;

  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(and(eq(order.orderNo, orderNo), isNull(order.deletedAt)))
    .limit(1);
  if (!existingOrder) throw new Error('Order not found');

  if (getScreenshotPack(existingOrder.productId)) {
    const [usage] = await db()
      .select({ total: count() })
      .from(screenshotTask)
      .where(
        and(
          eq(screenshotTask.orderId, existingOrder.id),
          ne(screenshotTask.status, 'failed')
        )
      );
    if (Number(usage.total) > 0)
      throw new Error(
        'This video pack has used or reserved renders and cannot be refunded automatically'
      );
  }

  const staleBefore = new Date(Date.now() - REFUND_STALE_MS);
  if (
    existingOrder.status !== OrderStatus.PAID &&
    !(
      existingOrder.status === OrderStatus.REFUNDING &&
      existingOrder.updatedAt < staleBefore
    )
  ) {
    throw new Error(
      existingOrder.status === OrderStatus.REFUNDING
        ? 'A refund for this order is already in progress'
        : `Only paid orders can be refunded (status: ${existingOrder.status})`
    );
  }

  // Resolve the provider BEFORE claiming. getProvider() falls back to the
  // default provider, so check the name — never refund through the wrong one.
  const paidAmount = existingOrder.paymentAmount ?? existingOrder.amount;
  const pm = await getPaymentManager();
  const provider = pm.getProvider(existingOrder.paymentProvider);
  if (paidAmount > 0) {
    if (
      !provider ||
      provider.name !== existingOrder.paymentProvider ||
      !provider.refundPayment
    ) {
      throw new Error(
        `Refund is not supported for provider '${existingOrder.paymentProvider}' (not configured or no refund API)`
      );
    }
  }

  // 1. Claim the order so a double click can't refund twice. The token
  //    check works on every dialect without relying on affected-row counts.
  const claim = JSON.stringify({ claim: getUuid() });
  await atomic((q) => [
    getScreenshotPack(existingOrder.productId) &&
      guard({
        table: order,
        column: 'userId',
        where: eq(order.id, existingOrder.id),
        require: sql`(select count(*) from ${screenshotTask} where ${screenshotTask.orderId} = ${existingOrder.id} and ${screenshotTask.status} <> 'failed') = 0`,
        message: 'Video pack is in use',
      }),
    q
      .update(order)
      .set({ status: OrderStatus.REFUNDING, refundResult: claim })
      .where(
        and(
          eq(order.id, existingOrder.id),
          or(
            eq(order.status, OrderStatus.PAID),
            and(
              eq(order.status, OrderStatus.REFUNDING),
              lt(order.updatedAt, staleBefore)
            )
          )
        )
      ),
  ]);
  const [claimed] = await db()
    .select({ refundResult: order.refundResult })
    .from(order)
    .where(eq(order.id, existingOrder.id))
    .limit(1);
  if (claimed?.refundResult !== claim) {
    throw new Error('A refund for this order is already in progress');
  }

  // 2. Refund at the provider. On failure, release the claim.
  let refund: PaymentRefund | null = null;
  if (paidAmount > 0 && provider?.refundPayment) {
    try {
      refund = await provider.refundPayment({
        orderNo: existingOrder.orderNo,
        sessionId: existingOrder.paymentSessionId || undefined,
        transactionId: existingOrder.transactionId || undefined,
        invoiceId: existingOrder.invoiceId || undefined,
        paymentType: existingOrder.paymentType || undefined,
        amount: existingOrder.amount,
        currency: existingOrder.currency,
        reason,
      });
    } catch (error) {
      await db()
        .update(order)
        .set({ status: OrderStatus.PAID, refundResult: null })
        .where(
          and(eq(order.id, existingOrder.id), eq(order.refundResult, claim))
        );
      throw error;
    }
  }

  // 3. Atomically deduct credits + mark the order refunded.
  const creditsToDeduct = Math.max(
    0,
    Math.floor(params.deductCredits ?? existingOrder.creditsAmount ?? 0)
  );
  const refundAmount = refund?.amount ?? paidAmount;
  let creditsDeducted = 0;
  try {
    const deduction = await planDeductForRefund({
      userId: existingOrder.userId,
      userEmail: existingOrder.userEmail || '',
      orderNo: existingOrder.orderNo,
      credits: creditsToDeduct,
      description: `Refund ${existingOrder.orderNo}`,
    });
    await atomic((q) => [
      guard({
        table: order,
        column: 'userId',
        where: eq(order.id, existingOrder.id),
        require: and(
          eq(order.status, OrderStatus.REFUNDING),
          eq(order.refundResult, claim)
        )!,
        message: 'Order refund claim lost',
      }),
      ...deduction.steps(q),
      q
        .update(order)
        .set({
          status: OrderStatus.REFUNDED,
          refundAmount,
          refundedAt: new Date(),
          refundResult: JSON.stringify({
            refundId: refund?.refundId || null,
            status: refund?.status || 'succeeded',
            reason: reason || '',
            operatorId,
            creditsDeducted: deduction.deducted,
            providerResult: refund?.refundResult ?? null,
          }),
        })
        .where(eq(order.id, existingOrder.id)),
    ]);
    creditsDeducted = deduction.deducted;
  } catch (error: any) {
    // The provider has already refunded; leave the order in REFUNDING so it
    // can be retried (idempotently) instead of looking like a paid order.
    throw new Error(
      `Refund was issued at the provider but saving it failed: ${error?.message || error}. Retry in a few minutes.`
    );
  }

  // 4. Optionally cancel the subscription — best effort, after the refund
  //    is recorded, so a cancel failure never hides a completed refund.
  let subscriptionCanceled = false;
  let subscriptionError: string | undefined;
  if (params.cancelSubscription && existingOrder.subscriptionNo) {
    try {
      const sub = await findBySubscriptionNo(existingOrder.subscriptionNo);
      if (
        sub &&
        sub.status !== SubscriptionStatus.CANCELED &&
        sub.status !== SubscriptionStatus.EXPIRED
      ) {
        const subProvider = pm.getProvider(sub.paymentProvider);
        if (
          !subProvider ||
          subProvider.name !== sub.paymentProvider ||
          !subProvider.cancelSubscription
        ) {
          throw new Error('Cancellation not supported for this provider');
        }
        const session = await subProvider.cancelSubscription({
          subscriptionId: sub.subscriptionId,
        });
        const info = session.subscriptionInfo;
        await updateBySubscriptionNo(sub.subscriptionNo, {
          status: info?.status || SubscriptionStatus.CANCELED,
          canceledAt: info?.canceledAt || new Date(),
          canceledEndAt: info?.canceledEndAt || null,
          canceledReason: reason || 'Refunded by admin',
          canceledReasonType: 'refund',
        });
      }
      subscriptionCanceled = true;
    } catch (error: any) {
      subscriptionError = error?.message || String(error);
    }
  }

  return {
    orderNo: existingOrder.orderNo,
    refundId: refund?.refundId || null,
    refundStatus: refund?.status || 'succeeded',
    refundAmount,
    creditsDeducted,
    creditsRequested: creditsToDeduct,
    subscriptionCanceled,
    subscriptionError,
  };
}

// --- Query helpers ---

export async function getUserOrders(userId: string) {
  return db()
    .select()
    .from(order)
    .where(and(eq(order.userId, userId), isNull(order.deletedAt)))
    .orderBy(desc(order.createdAt));
}
