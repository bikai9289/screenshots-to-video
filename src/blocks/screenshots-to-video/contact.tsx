import { ScreenshotContact } from '@/components/screenshots-to-video/contact';

import { getScreenshotsCopy } from './content';

export function ScreenshotsContact() {
  return <ScreenshotContact copy={getScreenshotsCopy()} />;
}
