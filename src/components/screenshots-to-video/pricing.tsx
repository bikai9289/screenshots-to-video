import { ArrowUpRight, Check, LoaderCircle } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { screenshotPacks } from '@/config/screenshots-product';

import { ScreenshotFooter, ScreenshotHeader } from './landing';
import type { ScreenshotsCopy } from './types';

export function ScreenshotPricing({
  copy,
  available,
  pending,
  onBuy,
}: {
  copy: ScreenshotsCopy;
  available: boolean;
  pending: string | null;
  onBuy: (productId: string) => void;
}) {
  const names = [copy.packSingle, copy.packLaunch, copy.packStudio];
  const counts = [copy.packOne, copy.packThree, copy.packFive];
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
              <h3>{counts[index]}</h3>
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
                disabled={!available || pending !== null}
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
        <p className="pricing-small">{copy.packValidity}</p>
        {!available && (
          <p role="status" className="pricing-small">
            {copy.purchaseUnavailable}{' '}
            <Link href="/contact">
              {copy.contact}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </p>
        )}
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
