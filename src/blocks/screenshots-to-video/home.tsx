import { ScreenshotLanding } from '@/components/screenshots-to-video/landing';

import { useScreenshotsCopy } from './use-copy';

export function ScreenshotsHome() {
  return <ScreenshotLanding copy={useScreenshotsCopy()} />;
}
