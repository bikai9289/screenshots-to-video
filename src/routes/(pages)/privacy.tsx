import { createFileRoute } from '@tanstack/react-router';

import { staticPageRouteOptions } from './-static-page';

export const Route = createFileRoute('/(pages)/privacy')(
  staticPageRouteOptions('privacy-policy')
);
