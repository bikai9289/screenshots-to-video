import { envConfigs } from '@/config';
import { ScreenshotContact } from '@/components/screenshots-to-video/contact';

import { getScreenshotsCopy } from './content';

export function ScreenshotsContact() {
  const email = envConfigs.support_email.trim();
  const supportEmail = /^[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(email)
    ? email
    : undefined;
  return (
    <ScreenshotContact
      copy={getScreenshotsCopy()}
      supportEmail={supportEmail}
    />
  );
}
