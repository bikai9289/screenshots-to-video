import { createFileRoute } from '@tanstack/react-router';

import { useCaseRouteOptions } from '@/lib/use-case-head';
import { ScreenshotsUseCase } from '@/blocks/screenshots-to-video/use-case';

export const Route = createFileRoute('/screenshot-to-app-store-preview-video')({
  ...useCaseRouteOptions('app', '/screenshot-to-app-store-preview-video'),
  component: () => <ScreenshotsUseCase id="app" />,
});
