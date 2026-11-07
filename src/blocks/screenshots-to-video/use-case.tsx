import { tDynamic } from '@/core/i18n/dynamic';
import {
  screenshotUseCases,
  type ScreenshotUseCase,
} from '@/config/screenshot-use-cases';
import { ScreenshotUseCasePage } from '@/components/screenshots-to-video/use-case';

import { useScreenshotsCopy } from './use-copy';

export function ScreenshotsUseCase({ id }: { id: ScreenshotUseCase }) {
  const text = (field: string) => tDynamic(`landing.useCases.${id}.${field}`);
  const copy = useScreenshotsCopy();
  return (
    <ScreenshotUseCasePage
      copy={copy}
      content={{
        title: text('title'),
        description: text('description'),
        fit: text('fit'),
        steps: [1, 2, 3].map((n) => text(`step${n}`)),
        prompt: text('prompt'),
        limitation: text('limitation'),
        reference:
          id === 'app'
            ? {
                href: 'https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/',
                label: 'Apple App Preview Specifications',
              }
            : undefined,
        links: screenshotUseCases
          .filter((item) => item.id !== id)
          .map((item) => ({
            href: item.path,
            label: tDynamic(`landing.useCases.${item.id}.title`),
          })),
      }}
    />
  );
}
