import { Link } from '@/core/i18n/navigation';
import { screenshotPacks } from '@/config/screenshots-product';

import { ScreenshotFooter, ScreenshotHeader } from './landing';
import { RealDemo } from './real-demo';
import type { ScreenshotsCopy } from './types';

export function ScreenshotUseCasePage({
  copy,
  content,
}: {
  copy: ScreenshotsCopy;
  content: {
    title: string;
    description: string;
    fit: string;
    steps: string[];
    prompt: string;
    limitation: string;
    reference?: { href: string; label: string };
    links: { href: string; label: string }[];
  };
}) {
  return (
    <div className="stv-site">
      <ScreenshotHeader copy={copy} />
      <main>
        <section className="wrap section use-case-intro">
          <p className="eyebrow">{copy.useCasesEyebrow}</p>
          <h1>{content.title}</h1>
          <p className="use-case-lead">{content.description}</p>
          <p>{content.fit}</p>
          <Link className="button dark large" href="/studio">
            {copy.create}
          </Link>
          <Link className="inline-link" href="/pricing">
            {copy.pricingNav}
          </Link>
        </section>
        <section className="wrap purchase-details" aria-label={copy.specsTitle}>
          <dl>
            <div>
              <dt>{copy.specsImagesLabel}</dt>
              <dd>{copy.specsImages}</dd>
            </div>
            <div>
              <dt>{copy.specsOutputLabel}</dt>
              <dd>{copy.specsOutput}</dd>
            </div>
            <div>
              <dt>{copy.specsDurationLabel}</dt>
              <dd>{copy.specsDuration}</dd>
            </div>
            <div>
              <dt>{copy.pricingNav}</dt>
              <dd>
                ${(screenshotPacks[0].priceInCents / 100).toFixed(2)} /{' '}
                {copy.entryCredit}. {copy.oneTime}
              </dd>
            </div>
          </dl>
        </section>
        <section className="wrap section use-case-method">
          <h2>{copy.howNav}</h2>
          <ol>
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h3>{copy.promptExample}</h3>
          <blockquote>{content.prompt}</blockquote>
          <p>{content.limitation}</p>
          {content.reference && (
            <a className="inline-link" href={content.reference.href}>
              {content.reference.label}
            </a>
          )}
          <p>{copy.aiResultNote}</p>
        </section>
        <RealDemo copy={copy} />
        <section className="wrap section use-case-method">
          <h2>{copy.beforeUpload}</h2>
          <p>{copy.privacyProcessing}</p>
          <p>{copy.privacyRetention}</p>
          <Link className="inline-link" href="/privacy-policy">
            {copy.privacy}
          </Link>
          <h2>{copy.pricingTitle}</h2>
          <p>{copy.packFailure}</p>
          <Link className="button dark" href="/pricing">
            {copy.pricingNav}
          </Link>
          <h2>{copy.relatedUses}</h2>
          <ul>
            {content.links.map((link) => (
              <li key={link.href}>
                <Link className="inline-link" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <ScreenshotFooter copy={copy} />
    </div>
  );
}
