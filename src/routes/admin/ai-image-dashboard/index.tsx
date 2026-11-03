'use client';

import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';

import { MediaDashboardView } from '../-media-dashboard-view';

function AIImageDashboardPage() {
  return (
    <MediaDashboardView
      mediaType="image"
      title={m['admin.nav.ai_image_dashboard']()}
      description={m['admin.dashboard.charts.image_tasks.description']()}
      tasksLabel={m['admin.nav.ai_image_tasks']()}
      failedTasksLabel={m['admin.nav.ai_image_failed_tasks']()}
    />
  );
}

export const Route = createFileRoute('/admin/ai-image-dashboard/')({
  component: AIImageDashboardPage,
});
