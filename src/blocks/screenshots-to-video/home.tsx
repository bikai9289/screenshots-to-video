import { tDynamic } from '@/core/i18n/dynamic';
import { screenshotUseCases } from '@/config/screenshot-use-cases';
import { ScreenshotLanding } from '@/components/screenshots-to-video/landing';

import { useScreenshotsCopy } from './use-copy';

export function ScreenshotsHome() {
  return (
    <ScreenshotLanding
      copy={useScreenshotsCopy()}
      useCases={screenshotUseCases.map((item) => ({
        href: item.path,
        title: tDynamic(`landing.useCases.${item.id}.title`),
        description: tDynamic(`landing.useCases.${item.id}.fit`),
      }))}
    />
  );
}
