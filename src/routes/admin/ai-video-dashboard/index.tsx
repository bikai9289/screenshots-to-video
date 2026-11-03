'use client';

import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';

import { MediaDashboardView } from '../-media-dashboard-view';

function AIVideoDashboardPage() {
  return (
    <MediaDashboardView
      mediaType="video"
      title={m['admin.nav.ai_video_dashboard']()}
      description={m['admin.dashboard.charts.video_tasks.description']()}
      tasksLabel={m['admin.nav.ai_video_tasks']()}
      failedTasksLabel={m['admin.nav.ai_video_failed_tasks']()}
    />
  );
}

export const Route = createFileRoute('/admin/ai-video-dashboard/')({
  component: AIVideoDashboardPage,
});
