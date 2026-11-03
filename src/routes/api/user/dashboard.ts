import { createFileRoute } from '@tanstack/react-router';
import { and, eq, isNull } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask, credit } from '@/config/db/schema';
import { respData, respErr } from '@/lib/resp';

export type UserDashboardPeriodKey = 'today' | '7d' | '30d';

export type UserDashboardPoint = {
  dateKey: string;
  label: string;
  totalTasks: number;
  imageTasks: number;
  videoTasks: number;
  musicTasks: number;
  successTasks: number;
  failedTasks: number;
  creditsConsumed: number;
};

export type UserDashboardPeriod = {
  key: UserDashboardPeriodKey;
  summary: {
    totalTasks: number;
    imageTasks: number;
    videoTasks: number;
    musicTasks: number;
    successTasks: number;
    failedTasks: number;
    creditsConsumed: number;
  };
  points: UserDashboardPoint[];
};

export type UserDashboardData = {
  periods: Record<UserDashboardPeriodKey, UserDashboardPeriod>;
  lifetimeSummary: {
    totalTasks: number;
    imageTasks: number;
    videoTasks: number;
    musicTasks: number;
    successTasks: number;
    creditsConsumed: number;
  };
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayLabel(date: Date, days: number) {
  if (days === 1) return 'Today';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function buildPoints(days: number): UserDashboardPoint[] {
  const today = startOfDay(new Date());
  const start = addDays(today, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const current = addDays(start, index);
    return {
      dateKey: formatDateKey(current),
      label: formatDisplayLabel(current, days),
      totalTasks: 0,
      imageTasks: 0,
      videoTasks: 0,
      musicTasks: 0,
      successTasks: 0,
      failedTasks: 0,
      creditsConsumed: 0,
    };
  });
}

function toDateKey(value: Date | string | number | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDateKey(date);
}

function sumPoints(points: UserDashboardPoint[]) {
  return points.reduce(
    (acc, point) => {
      acc.totalTasks += point.totalTasks;
      acc.imageTasks += point.imageTasks;
      acc.videoTasks += point.videoTasks;
      acc.musicTasks += point.musicTasks;
      acc.successTasks += point.successTasks;
      acc.failedTasks += point.failedTasks;
      acc.creditsConsumed += point.creditsConsumed;
      return acc;
    },
    {
      totalTasks: 0,
      imageTasks: 0,
      videoTasks: 0,
      musicTasks: 0,
      successTasks: 0,
      failedTasks: 0,
      creditsConsumed: 0,
    }
  );
}

function buildPeriod(
  days: number,
  key: UserDashboardPeriodKey
): UserDashboardPeriod {
  const points = buildPoints(days);
  return {
    key,
    summary: sumPoints(points),
    points,
  };
}

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const userId = session.user.id;
    const today = startOfDay(new Date());
    const start30d = addDays(today, -29);

    const [tasksList, creditsList] = await Promise.all([
      db()
        .select({
          createdAt: aiTask.createdAt,
          mediaType: aiTask.mediaType,
          status: aiTask.status,
          costCredits: aiTask.costCredits,
        })
        .from(aiTask)
        .where(and(eq(aiTask.userId, userId), isNull(aiTask.deletedAt))),
      db()
        .select({
          createdAt: credit.createdAt,
          credits: credit.credits,
        })
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            eq(credit.transactionType, 'consume'),
            isNull(credit.deletedAt)
          )
        ),
    ]);

    const periods: Record<UserDashboardPeriodKey, UserDashboardPeriod> = {
      today: buildPeriod(1, 'today'),
      '7d': buildPeriod(7, '7d'),
      '30d': buildPeriod(30, '30d'),
    };

    const lifetimeSummary = {
      totalTasks: tasksList.length,
      imageTasks: 0,
      videoTasks: 0,
      musicTasks: 0,
      successTasks: 0,
      creditsConsumed: 0,
    };

    for (const t of tasksList) {
      if (t.mediaType === 'image') lifetimeSummary.imageTasks++;
      else if (t.mediaType === 'video') lifetimeSummary.videoTasks++;
      else if (t.mediaType === 'music') lifetimeSummary.musicTasks++;

      if (t.status === 'success') lifetimeSummary.successTasks++;

      const dateKey = toDateKey(t.createdAt);
      if (!dateKey) continue;

      const tDate = t.createdAt ? new Date(t.createdAt) : null;
      if (!tDate || tDate < start30d) continue;

      for (const period of Object.values(periods)) {
        const point = period.points.find((p) => p.dateKey === dateKey);
        if (!point) continue;

        point.totalTasks++;
        if (t.mediaType === 'image') point.imageTasks++;
        else if (t.mediaType === 'video') point.videoTasks++;
        else if (t.mediaType === 'music') point.musicTasks++;

        if (t.status === 'success') point.successTasks++;
        else if (t.status === 'failed' || t.status === 'canceled')
          point.failedTasks++;
      }
    }

    for (const c of creditsList) {
      const amount = Math.abs(c.credits || 0);
      lifetimeSummary.creditsConsumed += amount;

      const dateKey = toDateKey(c.createdAt);
      if (!dateKey) continue;

      const cDate = c.createdAt ? new Date(c.createdAt) : null;
      if (!cDate || cDate < start30d) continue;

      for (const period of Object.values(periods)) {
        const point = period.points.find((p) => p.dateKey === dateKey);
        if (!point) continue;

        point.creditsConsumed += amount;
      }
    }

    for (const period of Object.values(periods)) {
      period.summary = sumPoints(period.points);
    }

    const data: UserDashboardData = {
      periods,
      lifetimeSummary,
    };

    return respData(data);
  } catch (error: any) {
    console.error('User dashboard query failed:', error);
    return respErr('Failed to fetch dashboard data');
  }
}

export const Route = createFileRoute('/api/user/dashboard')({
  server: {
    handlers: { GET },
  },
});
