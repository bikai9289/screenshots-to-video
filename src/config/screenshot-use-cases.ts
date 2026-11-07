export const screenshotUseCases = [
  { id: 'demo', path: '/screenshot-to-demo-video' },
  { id: 'app', path: '/screenshot-to-app-store-preview-video' },
  { id: 'feature', path: '/feature-announcement-video' },
] as const;
export type ScreenshotUseCase = (typeof screenshotUseCases)[number]['id'];
