import { ScreenshotLanding } from '@/components/screenshots-to-video/landing';

import { getScreenshotsCopy } from './content';

export function ScreenshotsHome() {
  return <ScreenshotLanding copy={getScreenshotsCopy()} />;
}
