import { ArrowUpRight, Check, LoaderCircle } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { screenshotPacks } from '@/config/screenshots-product';

import { ScreenshotFooter, ScreenshotHeader } from './landing';
import type { ScreenshotsCopy } from './types';

export function ScreenshotPricing({
  copy,
  available,
  availabilityStatus,
  onRetry,
  pending,
  onBuy,
}: {
  copy: ScreenshotsCopy;
  available: boolean;
  availabilityStatus: 'loading' | 'ready' | 'error';
  onRetry: () => void;
  pending: string | null;
  onBuy: (productId: string) => void;
}) {
  const names = [
    copy.packEntry,
    copy.packSingle,
    copy.packLaunch,
    copy.packStudio,
  ];
  return (
    <div className="stv-site">
      <ScreenshotHeader copy={copy} />
      <main className="wrap section pricing-content">
        <div className="pricing-heading">
          <p className="eyebrow">{copy.pricingEyebrow}</p>
          <h1>{copy.pricingTitle}</h1>
          <p>{copy.pricingDescription}</p>
        </div>
        <div className="pack-grid">
          {screenshotPacks.map((pack, index) => (
            <article
              className={`pack ${index === 1 ? 'featured-pack' : ''}`}
              key={pack.productId}
            >
              <div className="pack-name">
                <h2>{names[index]}</h2>
                {index === 1 && <span>{copy.popular}</span>}
              </div>
              <p className="pack-price">
                ${(pack.priceInCents / 100).toFixed(2)}
              </p>
              <p className="pack-currency">{copy.oneTime}</p>
              <h3>
                {pack.credits}{' '}
                {pack.credits === 1 ? copy.creditSingular : copy.creditPlural}
              </h3>
              <p>{copy.creditRule}</p>
              <ul>
                {[copy.packFailure, copy.packPreview, copy.packRights].map(
                  (item) => (
                    <li key={item}>
                      <Check aria-hidden="true" />
                      {item}
                    </li>
                  )
                )}
              </ul>
              <button
                type="button"
                className="button dark"
                disabled={
                  availabilityStatus === 'loading' ||
                  (availabilityStatus === 'ready' && !available) ||
                  pending !== null
                }
                onClick={() => onBuy(pack.productId)}
              >
                {pending === pack.productId
                  ? copy.checkoutPending
                  : copy.buyPack}
                {pending === pack.productId ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ArrowUpRight aria-hidden="true" />
                )}
              </button>
            </article>
          ))}
        </div>
        <section
          className="purchase-details"
          aria-labelledby="purchase-details-title"
        >
          <div>
            <p className="eyebrow">{copy.specsEyebrow}</p>
            <h2 id="purchase-details-title">{copy.specsTitle}</h2>
            <p>{copy.aiResultNote}</p>
          </div>
          <dl>
            <div>
              <dt>{copy.specsOutputLabel}</dt>
              <dd>{copy.specsOutput}</dd>
            </div>
            <div>
              <dt>{copy.specsDurationLabel}</dt>
              <dd>{copy.specsDuration}</dd>
            </div>
            <div>
              <dt>{copy.specsImagesLabel}</dt>
              <dd>{copy.specsImages}</dd>
            </div>
          </dl>
        </section>
        <p className="pricing-small">{copy.packValidity}</p>
        <section className="use-case-method privacy-summary">
          <h2>{copy.beforeUpload}</h2>
          <p>{copy.privacyProcessing}</p>
          <p>{copy.privacyRetention}</p>
          <p>{copy.privacyTraining}</p>
          <Link className="inline-link" href="/privacy-policy">
            {copy.privacy}
          </Link>{' '}
          <a
            className="inline-link"
            href="https://www.seeapi.com/docs/data-handling/"
          >
            {copy.privacyProvider}
          </a>
        </section>
        {availabilityStatus !== 'ready' || !available ? (
          <p role="status" className="pricing-small">
            {availabilityStatus === 'loading' ? (
              copy.purchaseChecking
            ) : (
              <>
                {availabilityStatus === 'error'
                  ? copy.purchaseCheckFailed
                  : copy.purchaseUnavailable}{' '}
                {availabilityStatus === 'error' && (
                  <button
                    type="button"
                    className="inline-link"
                    onClick={onRetry}
                  >
                    {copy.purchaseRetry}
                  </button>
                )}{' '}
                <Link href="/contact">
                  {copy.contact}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </>
            )}
          </p>
        ) : null}
        <div className="pricing-help">
          <h2>{copy.pricingQuestion}</h2>
          <p>{copy.pricingHelp}</p>
          <Link className="inline-link" href="/#examples">
            {copy.explore}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </main>
      <ScreenshotFooter copy={copy} />
    </div>
  );
}
