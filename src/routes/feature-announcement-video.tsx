import { createFileRoute } from '@tanstack/react-router';

import { useCaseRouteOptions } from '@/lib/use-case-head';
import { ScreenshotsUseCase } from '@/blocks/screenshots-to-video/use-case';

export const Route = createFileRoute('/feature-announcement-video')({
  ...useCaseRouteOptions('feature', '/feature-announcement-video'),
  component: () => <ScreenshotsUseCase id="feature" />,
});
