import { createFileRoute } from '@tanstack/react-router';
import { and, count, desc, eq, isNull, like, or, type SQL } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask, user } from '@/config/db/schema';
import { hasPermission } from '@/modules/rbac/service';
import { respErr, respPage } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const isAdmin = await hasPermission(session.user.id, 'admin.*');
    if (!isAdmin) return respErr('Forbidden');

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20'))
    );
    const offset = (page - 1) * pageSize;

    const mediaType = searchParams.get('mediaType') || searchParams.get('type');
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const search =
      searchParams.get('search')?.trim() || searchParams.get('keyword')?.trim();

    const conditions: SQL[] = [isNull(aiTask.deletedAt)];
    if (mediaType && mediaType !== 'all') {
      conditions.push(eq(aiTask.mediaType, mediaType));
    }
    if (status && status !== 'all') {
      conditions.push(eq(aiTask.status, status));
    }
    if (provider && provider !== 'all') {
      conditions.push(eq(aiTask.provider, provider));
    }
    if (search) {
      conditions.push(
        or(
          like(aiTask.id, `%${search}%`),
          like(aiTask.taskId, `%${search}%`),
          like(aiTask.prompt, `%${search}%`),
          like(aiTask.model, `%${search}%`),
          like(user.email, `%${search}%`),
          like(user.name, `%${search}%`)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db()
      .select({ count: count() })
      .from(aiTask)
      .leftJoin(user, eq(aiTask.userId, user.id))
      .where(where);
    const total = totalResult.count;

    const tasks = await db()
      .select({
        id: aiTask.id,
        taskId: aiTask.taskId,
        userId: aiTask.userId,
        mediaType: aiTask.mediaType,
        provider: aiTask.provider,
        model: aiTask.model,
        prompt: aiTask.prompt,
        status: aiTask.status,
        options: aiTask.options,
        taskInfo: aiTask.taskInfo,
        taskResult: aiTask.taskResult,
        costCredits: aiTask.costCredits,
        scene: aiTask.scene,
        createdAt: aiTask.createdAt,
        updatedAt: aiTask.updatedAt,
        userEmail: user.email,
        userName: user.name,
      })
      .from(aiTask)
      .leftJoin(user, eq(aiTask.userId, user.id))
      .where(where)
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);

    return respPage(tasks, total);
  } catch (error: any) {
    console.error('Failed to fetch admin AI tasks:', error);
    return respErr('Failed to fetch AI tasks');
  }
}

export const Route = createFileRoute('/api/admin/ai-tasks')({
  server: {
    handlers: { GET },
  },
});
