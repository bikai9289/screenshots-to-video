import { ArrowUpRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

import { ScreenshotFooter, ScreenshotHeader } from './landing';
import type { ScreenshotsCopy } from './types';

export function ScreenshotContact({
  copy,
  supportEmail,
}: {
  copy: ScreenshotsCopy;
  supportEmail?: string;
}) {
  return (
    <div className="stv-site">
      <ScreenshotHeader copy={copy} />
      <main className="wrap section contact-content">
        <p className="eyebrow">{copy.contact}</p>
        <h1>{copy.contactTitle}</h1>
        <p>{copy.contactDescription}</p>
        {supportEmail && (
          <div className="presales-contact">
            <p className="eyebrow">{copy.presalesTitle}</p>
            <a className="inline-link" href={`mailto:${supportEmail}`}>
              {supportEmail}
              <ArrowUpRight aria-hidden="true" />
            </a>
            <p className="contact-hint">{copy.presalesHint}</p>
          </div>
        )}
        <Link className="button dark large" href="/settings/tickets">
          {copy.contactAction}
          <ArrowUpRight aria-hidden="true" />
        </Link>
        <p className="contact-hint">{copy.contactHint}</p>
      </main>
      <ScreenshotFooter copy={copy} />
    </div>
  );
}
