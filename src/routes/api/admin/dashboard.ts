import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAdminDashboardData } from '@/modules/admin/dashboard-service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const isAdmin = await hasPermission(session.user.id, 'admin.*');
    if (!isAdmin) return respErr('Forbidden');

    const data = await getAdminDashboardData();
    return respData(data);
  } catch (error: any) {
    console.error('Admin dashboard query failed:', error);
    return respErr('Failed to fetch dashboard data');
  }
}

export const Route = createFileRoute('/api/admin/dashboard')({
  server: {
    handlers: { GET },
  },
});
