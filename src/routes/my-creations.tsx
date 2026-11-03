import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/my-creations')({
  beforeLoad: () => {
    throw redirect({
      to: '/settings/creations',
    });
  },
});
