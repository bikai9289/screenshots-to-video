import { createFileRoute } from '@tanstack/react-router';

import { staticPageRouteOptions } from './-static-page';

export const Route = createFileRoute('/(pages)/terms')(
  staticPageRouteOptions('terms-of-service')
);
