import { createFileRoute } from '@tanstack/react-router';

import { useCaseRouteOptions } from '@/lib/use-case-head';
import { ScreenshotsUseCase } from '@/blocks/screenshots-to-video/use-case';

export const Route = createFileRoute('/screenshot-to-demo-video')({
  ...useCaseRouteOptions('demo', '/screenshot-to-demo-video'),
  component: () => <ScreenshotsUseCase id="demo" />,
});
