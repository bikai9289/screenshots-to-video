import { ArrowUpRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

import { ScreenshotFooter, ScreenshotHeader } from './landing';
import type { ScreenshotsCopy } from './types';

export function ScreenshotContact({ copy }: { copy: ScreenshotsCopy }) {
  return (
    <div className="stv-site">
      <ScreenshotHeader copy={copy} />
      <main className="wrap section contact-content">
        <p className="eyebrow">{copy.contact}</p>
        <h1>{copy.contactTitle}</h1>
        <p>{copy.contactDescription}</p>
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
