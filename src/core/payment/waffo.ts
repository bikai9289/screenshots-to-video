import {
  TaxCategory,
  verifyWebhook,
  WaffoPancake,
  WebhookEventType,
  type CashierLanguage,
  type WebhookEventData,
} from '@waffo/pancake-ts';

import {
  CheckoutSession,
  PaymentConfigs,
  PaymentEvent,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
  WebhookIgnoredError,
} from './types';

const WAFFO_LANGUAGES: Record<string, CashierLanguage> = {
  en: 'en',
  zh: 'zh-Hans',
};

const SUBSCRIPTION_RENEWED_EVENT = 'subscription.renewed';

export interface WaffoConfigs extends PaymentConfigs {
  merchantId: string;
  privateKey: string;
  environment: 'test' | 'prod';
}

export class WaffoProvider implements PaymentProvider {
  readonly name = 'waffo';
  configs: WaffoConfigs;

  private client: WaffoPancake;

  constructor(configs: WaffoConfigs) {
    this.configs = configs;
    this.client = new WaffoPancake({
      merchantId: configs.merchantId,
      privateKey: configs.privateKey,
    });
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    if (!order.productId) throw new Error('productId is required');
    if (!order.price) throw new Error('price is required');
    if (!order.customer?.id) throw new Error('customer.id is required');

    const language = this.mapLocaleToWaffoLanguage(order.locale);
    const currency = order.price.currency.toUpperCase();
    // One-time: charge exactly order.price in order currency (e.g. CNY for zh
    // packs) instead of the dashboard price, so order.amount/currency equals
    // the paid amount. The Waffo product must have this currency enabled.
    // Subscriptions keep the recurring price configured in Waffo.
    const priceSnapshot =
      order.type === PaymentType.SUBSCRIPTION
        ? undefined
        : this.buildPriceSnapshot(order.price.amount, currency);
    const result = await this.client.checkout.authenticated.create({
      productId: order.productId,
      currency,
      ...(priceSnapshot ? { priceSnapshot } : {}),
      buyerIdentity: order.customer.id,
      buyerEmail: order.customer.email,
      successUrl: order.successUrl,
      metadata: order.metadata,
      orderMerchantExternalId: order.orderNo,
      withTrial: order.plan?.trialPeriodDays
        ? order.plan.trialPeriodDays > 0
        : undefined,
      ...(language ? { language } : {}),
    });

    return {
      provider: this.name,
      checkoutParams: order,
      checkoutInfo: {
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
      },
      checkoutResult: result,
      metadata: order.metadata || {},
    };
  }

  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    const result = await this.client.graphql.query<{
      payments: Array<{
        id: string;
        status: string;
        orderId: string;
        orderMerchantExternalId?: string;
        createdAt?: string;
        snapshotAmountDetails?: { currency?: string; total?: string };
        subscriptionOrder?: {
          id: string;
          status?: string;
          billingPeriod?: string;
          currentPeriodStart?: string;
          currentPeriodEnd?: string;
          canceledAt?: string;
          subscriptionProduct?: { id: string; name?: string };
          priceSnapshot?: {
            currency?: string;
            regularPhase?: { total?: string };
          };
        } | null;
      }>;
    }>({
      query: `query ($ref: String!) {
        payments(filter: { orderMerchantExternalId: { eq: $ref } }) {
          id status orderId orderMerchantExternalId createdAt
          snapshotAmountDetails { currency total }
          subscriptionOrder {
            id status billingPeriod currentPeriodStart currentPeriodEnd canceledAt
            subscriptionProduct { id name }
            priceSnapshot { currency regularPhase { total } }
          }
        }
      }`,
      variables: { ref: sessionId },
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join(', '));
    }

    const payment = result.data?.payments.find(
      (item) => item.orderMerchantExternalId === sessionId
    );
    if (!payment) {
      return { provider: this.name, paymentStatus: PaymentStatus.PROCESSING };
    }

    const amount = payment.snapshotAmountDetails;
    const paymentCurrency = amount?.currency || '';
    // undefined = not reported yet; a reported "0"/"0.00" (100% discount)
    // is a real amount and goes through verifyPaidAmount.
    const paymentAmount = this.optionalAmount(amount?.total, paymentCurrency);
    // Callback polling can see succeeded before amount fields are populated.
    let paymentStatus =
      payment.status === 'succeeded'
        ? PaymentStatus.SUCCESS
        : payment.status === 'failed'
          ? PaymentStatus.FAILED
          : payment.status === 'canceled'
            ? PaymentStatus.CANCELED
            : PaymentStatus.PROCESSING;
    if (
      paymentStatus === PaymentStatus.SUCCESS &&
      (!paymentCurrency || paymentAmount === undefined || paymentAmount < 0)
    ) {
      console.log(
        `Waffo payment ${payment.id} succeeded without amount details, keep processing`
      );
      paymentStatus = PaymentStatus.PROCESSING;
    }

    const session: PaymentSession = {
      provider: this.name,
      paymentStatus,
      paymentInfo: {
        transactionId: payment.id,
        paymentAmount,
        paymentCurrency,
        paidAt: this.date(payment.createdAt) || undefined,
        invoiceId: payment.id,
      },
      paymentResult: { ...payment, id: sessionId, orderNo: sessionId },
    };

    const subscription = payment.subscriptionOrder;
    if (subscription) {
      const currency =
        subscription.priceSnapshot?.currency || amount?.currency || '';
      session.subscriptionId = subscription.id;
      session.subscriptionInfo = {
        subscriptionId: subscription.id,
        productId: subscription.subscriptionProduct?.id,
        description: subscription.subscriptionProduct?.name,
        amount: this.amount(
          subscription.priceSnapshot?.regularPhase?.total || amount?.total,
          currency
        ),
        currency,
        interval: this.interval(subscription.billingPeriod),
        intervalCount: 1,
        currentPeriodStart:
          this.date(subscription.currentPeriodStart) || new Date(),
        currentPeriodEnd:
          this.date(subscription.currentPeriodEnd) || new Date(),
        status: this.subscriptionStatus(subscription.status),
        canceledAt: this.date(subscription.canceledAt) || undefined,
      };
      session.subscriptionResult = subscription;
    }

    return session;
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    const payload = await req.text();
    const signature = req.headers.get('x-waffo-signature');
    if (!payload || !signature) throw new Error('Invalid webhook request');

    const event = verifyWebhook<WebhookEventData>(payload, signature, {
      environment: this.configs.environment,
      toleranceMs: 300_000,
    });
    if (event.mode !== this.configs.environment) {
      throw new WebhookIgnoredError(
        `Unexpected Waffo event mode: ${event.mode}`
      );
    }

    const paymentSession = this.buildPaymentSession(event);
    if (!paymentSession) {
      throw new WebhookIgnoredError(
        `No handler for Waffo event: ${event.eventType}`
      );
    }

    return {
      eventType: this.mapEventType(event.eventType),
      eventResult: event,
      paymentSession,
    };
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const result = await this.client.orders.cancelSubscription({
      orderId: subscriptionId,
    });
    const status =
      result.status === 'canceling'
        ? SubscriptionStatus.PENDING_CANCEL
        : SubscriptionStatus.CANCELED;

    return {
      provider: this.name,
      subscriptionId,
      subscriptionInfo: {
        subscriptionId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        status,
        canceledAt: new Date(),
        canceledEndAt: result.status === 'canceled' ? new Date() : undefined,
      },
      subscriptionResult: result,
    };
  }

  private buildPaymentSession(event: {
    eventType: string;
    eventId: string;
    data: WebhookEventData;
  }): PaymentSession | undefined {
    const { data } = event;
    const orderNo = data.orderMerchantExternalId;
    if (!orderNo) {
      throw new Error('Waffo webhook is missing orderMerchantExternalId');
    }

    switch (event.eventType) {
      case WebhookEventType.OrderCompleted:
        return this.buildOneTimeSession(data, event, orderNo);
      case WebhookEventType.SubscriptionActivated:
        return this.buildSubscriptionPaymentSession(data, event, orderNo);
      case WebhookEventType.SubscriptionPaymentSucceeded:
        // Renewal period fields moved to subscription.renewed after 2026-09-06.
        if (!data.currentPeriodStart || !data.currentPeriodEnd)
          return undefined;
        return this.buildSubscriptionPaymentSession(data, event, orderNo);
      case SUBSCRIPTION_RENEWED_EVENT:
        return this.buildSubscriptionPaymentSession(data, event, orderNo);
      case WebhookEventType.RefundSucceeded:
        return this.buildRefundSession(data, event, orderNo);
      case WebhookEventType.SubscriptionUpdated:
      case WebhookEventType.SubscriptionCanceling:
      case WebhookEventType.SubscriptionUncanceled:
      case WebhookEventType.SubscriptionPastDue:
      case WebhookEventType.SubscriptionCanceled:
        return this.buildSubscriptionSession(data, event, orderNo);
      default:
        return undefined;
    }
  }

  /** Minor units → Waffo display-string price override. */
  private buildPriceSnapshot(amountMinor: number, currency: string) {
    if (!Number.isFinite(amountMinor) || amountMinor <= 0 || !currency) {
      return undefined;
    }
    const fractionDigits =
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    return {
      amount: (amountMinor / 10 ** fractionDigits).toFixed(fractionDigits),
      taxCategory: TaxCategory.DigitalGoods,
    };
  }

  private mapLocaleToWaffoLanguage(
    locale?: string
  ): CashierLanguage | undefined {
    if (!locale) return undefined;
    return WAFFO_LANGUAGES[locale] ?? WAFFO_LANGUAGES[locale.split('-')[0]];
  }

  private buildOneTimeSession(
    data: WebhookEventData,
    event: { eventId: string },
    orderNo: string
  ): PaymentSession {
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: this.paymentInfo(data, event.eventId),
      paymentResult: { id: orderNo, ...data, orderNo },
      metadata: data.orderMetadata,
    };
  }

  private buildSubscriptionPaymentSession(
    data: WebhookEventData,
    event: { eventId: string; eventType: string },
    orderNo: string
  ): PaymentSession {
    const session = this.buildSubscriptionSession(data, event, orderNo);
    session.paymentStatus = PaymentStatus.SUCCESS;
    session.paymentResult = { id: orderNo, ...data, orderNo };
    session.paymentInfo = {
      ...this.paymentInfo(data, event.eventId),
      subscriptionCycleType:
        event.eventType === WebhookEventType.SubscriptionActivated
          ? SubscriptionCycleType.CREATE
          : SubscriptionCycleType.RENEWAL,
    };
    return session;
  }

  private buildSubscriptionSession(
    data: WebhookEventData,
    event: { eventId: string },
    orderNo: string
  ): PaymentSession {
    return {
      provider: this.name,
      subscriptionId: data.orderId,
      subscriptionInfo: this.subscriptionInfo(data),
      subscriptionResult: {
        id: orderNo,
        ...data,
        orderNo,
        eventId: event.eventId,
      },
      metadata: data.orderMetadata,
    };
  }

  private buildRefundSession(
    data: WebhookEventData,
    event: { eventId: string },
    orderNo: string
  ): PaymentSession {
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: this.paymentInfo(data, event.eventId),
      paymentResult: { id: orderNo, ...data, orderNo },
      metadata: data.orderMetadata,
    };
  }

  private paymentInfo(data: WebhookEventData, eventId: string) {
    return {
      description: data.productDescription || data.productName,
      transactionId: data.paymentId || eventId,
      // Absent total/amount or currency → undefined (verification pending),
      // never 0; a reported "0" stays a real 0.
      paymentAmount: this.optionalAmount(
        this.firstPresent(data.total, data.amount),
        data.currency
      ),
      paymentCurrency: data.currency,
      paymentEmail: data.buyerEmail,
      paymentUserId: data.merchantProvidedBuyerIdentity,
      paidAt: this.date(data.paymentDate) || new Date(),
      invoiceId: data.paymentId || eventId,
    };
  }

  private subscriptionInfo(data: WebhookEventData): SubscriptionInfo {
    return {
      subscriptionId: data.orderId,
      productId: data.productMetadata?.productId,
      description: data.productDescription || data.productName,
      amount: this.amount(data.total || data.amount, data.currency),
      currency: data.currency,
      interval: this.interval(data.billingPeriod),
      intervalCount: 1,
      currentPeriodStart: this.date(data.currentPeriodStart) || new Date(),
      currentPeriodEnd: this.date(data.currentPeriodEnd) || new Date(),
      status: this.subscriptionStatus(data.orderStatus),
      canceledAt: this.date(data.canceledAt) || undefined,
      canceledEndAt:
        data.orderStatus === 'canceled'
          ? this.date(data.canceledAt) || new Date()
          : undefined,
    };
  }

  private mapEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case WebhookEventType.OrderCompleted:
      case WebhookEventType.SubscriptionActivated:
        return PaymentEventType.CHECKOUT_SUCCESS;
      case WebhookEventType.SubscriptionPaymentSucceeded:
      case SUBSCRIPTION_RENEWED_EVENT:
        return PaymentEventType.PAYMENT_SUCCESS;
      case WebhookEventType.RefundSucceeded:
        return PaymentEventType.PAYMENT_REFUNDED;
      case WebhookEventType.SubscriptionCanceled:
        return PaymentEventType.SUBSCRIBE_CANCELED;
      default:
        return PaymentEventType.SUBSCRIBE_UPDATED;
    }
  }

  private interval(value?: string): PaymentInterval {
    return value === 'yearly' ? PaymentInterval.YEAR : PaymentInterval.MONTH;
  }

  private subscriptionStatus(value?: string): SubscriptionStatus {
    switch (value) {
      case 'canceling':
        return SubscriptionStatus.PENDING_CANCEL;
      case 'canceled':
      case 'expired':
      case 'closed':
        return SubscriptionStatus.CANCELED;
      case 'past_due':
        return SubscriptionStatus.PAUSED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private amount(value: string | undefined, currency: string): number {
    return this.optionalAmount(value, currency) ?? 0;
  }

  private firstPresent(
    ...values: Array<string | number | null | undefined>
  ): string | undefined {
    const found = values.find(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== ''
    );
    return found === undefined || found === null ? undefined : String(found);
  }

  /** Display-string amount → minor units; undefined when amount/currency missing. */
  private optionalAmount(
    value: string | number | null | undefined,
    currency: string | null | undefined
  ): number | undefined {
    if (value === undefined || value === null || String(value).trim() === '')
      return undefined;
    const amount = Number(value);
    if (!Number.isFinite(amount) || !currency) return undefined;
    const fractionDigits =
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    return Math.round(amount * 10 ** fractionDigits);
  }

  private date(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
