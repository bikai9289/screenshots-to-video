import { and, eq, gte, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, order, user } from '@/config/db/schema';

export type DashboardPoint = {
  label: string;
  dateKey: string;
  users: number;
  payments: number;
  revenue: number;
  imageTasks: number;
  imageSuccess: number;
  imageFailed: number;
  videoTasks: number;
  videoSuccess: number;
  videoFailed: number;
  musicTasks: number;
  musicSuccess: number;
  musicFailed: number;
  failureProviders: Record<string, number>;
  imageFailureProviders: Record<string, number>;
  videoFailureProviders: Record<string, number>;
  musicFailureProviders: Record<string, number>;
};

export type AdminDashboardPeriodKey = 'today' | '7d' | '30d';

export type ChannelStatItem = {
  name: string;
  total: number;
  failed: number;
};

export type AdminDashboardPeriod = {
  key: AdminDashboardPeriodKey;
  label: string;
  summary: {
    users: number;
    payments: number;
    revenue: number;
    imageTasks: number;
    imageSuccess: number;
    imageFailed: number;
    videoTasks: number;
    videoSuccess: number;
    videoFailed: number;
    musicTasks: number;
    musicSuccess: number;
    musicFailed: number;
  };
  activeProviders: Array<{
    provider: string;
    count: number;
  }>;
  imageProviders: Array<{
    provider: string;
    count: number;
  }>;
  videoProviders: Array<{
    provider: string;
    count: number;
  }>;
  musicProviders: Array<{
    provider: string;
    count: number;
  }>;
  channelStats: {
    image: ChannelStatItem[];
    video: ChannelStatItem[];
    music: ChannelStatItem[];
  };
  points: DashboardPoint[];
};

export type AdminDashboardData = {
  periods: Record<AdminDashboardPeriodKey, AdminDashboardPeriod>;
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

function formatDisplayLabel(date: Date, days: number, index: number) {
  if (days === 1) {
    return 'Today';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (days === 7 && index === days - 1) {
    return `Today · ${month}-${day}`;
  }
  return `${month}-${day}`;
}

function buildPoints(days: number): DashboardPoint[] {
  const today = startOfDay(new Date());
  const start = addDays(today, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const current = addDays(start, index);
    return {
      label: formatDisplayLabel(current, days, index),
      dateKey: formatDateKey(current),
      users: 0,
      payments: 0,
      revenue: 0,
      imageTasks: 0,
      imageSuccess: 0,
      imageFailed: 0,
      videoTasks: 0,
      videoSuccess: 0,
      videoFailed: 0,
      musicTasks: 0,
      musicSuccess: 0,
      musicFailed: 0,
      failureProviders: {},
      imageFailureProviders: {},
      videoFailureProviders: {},
      musicFailureProviders: {},
    };
  });
}

function sumPoints(points: DashboardPoint[]) {
  return points.reduce(
    (acc, point) => {
      acc.users += point.users;
      acc.payments += point.payments;
      acc.revenue += point.revenue;
      acc.imageTasks += point.imageTasks;
      acc.imageSuccess += point.imageSuccess;
      acc.imageFailed += point.imageFailed;
      acc.videoTasks += point.videoTasks;
      acc.videoSuccess += point.videoSuccess;
      acc.videoFailed += point.videoFailed;
      acc.musicTasks += point.musicTasks;
      acc.musicSuccess += point.musicSuccess;
      acc.musicFailed += point.musicFailed;
      return acc;
    },
    {
      users: 0,
      payments: 0,
      revenue: 0,
      imageTasks: 0,
      imageSuccess: 0,
      imageFailed: 0,
      videoTasks: 0,
      videoSuccess: 0,
      videoFailed: 0,
      musicTasks: 0,
      musicSuccess: 0,
      musicFailed: 0,
    }
  );
}

function getProviderCounts(
  points: DashboardPoint[],
  key:
    | 'failureProviders'
    | 'imageFailureProviders'
    | 'videoFailureProviders'
    | 'musicFailureProviders'
) {
  const counts = new Map<string, number>();

  for (const point of points) {
    for (const [provider, count] of Object.entries(point[key])) {
      counts.set(provider, (counts.get(provider) || 0) + count);
    }
  }

  return Array.from(counts.entries())
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count);
}

function buildPeriod(
  days: number,
  key: AdminDashboardPeriodKey
): AdminDashboardPeriod {
  const points = buildPoints(days);

  return {
    key,
    label: key,
    summary: sumPoints(points),
    activeProviders: [],
    imageProviders: [],
    videoProviders: [],
    musicProviders: [],
    channelStats: {
      image: [],
      video: [],
      music: [],
    },
    points,
  };
}

function toDateKey(value: Date | string | number | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDateKey(date);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const today = startOfDay(new Date());
  const start30d = addDays(today, -29);

  const [usersList, ordersList, tasksList] = await Promise.all([
    db()
      .select({ createdAt: user.createdAt })
      .from(user)
      .where(gte(user.createdAt, start30d)),
    db()
      .select({
        createdAt: order.createdAt,
        amount: order.amount,
        status: order.status,
      })
      .from(order)
      .where(
        and(
          gte(order.createdAt, start30d),
          eq(order.status, 'paid'),
          isNull(order.deletedAt)
        )
      ),
    db()
      .select({
        createdAt: aiTask.createdAt,
        status: aiTask.status,
        provider: aiTask.provider,
        model: aiTask.model,
        mediaType: aiTask.mediaType,
      })
      .from(aiTask)
      .where(and(gte(aiTask.createdAt, start30d), isNull(aiTask.deletedAt))),
  ]);

  const periods: Record<AdminDashboardPeriodKey, AdminDashboardPeriod> = {
    today: buildPeriod(1, 'today'),
    '7d': buildPeriod(7, '7d'),
    '30d': buildPeriod(30, '30d'),
  };

  const periodEntries = Object.entries(periods) as Array<
    [AdminDashboardPeriodKey, AdminDashboardPeriod]
  >;

  const applyToPeriods = (
    dateKey: string,
    updater: (point: DashboardPoint, periodKey: AdminDashboardPeriodKey) => void
  ) => {
    for (const [periodKey, period] of periodEntries) {
      const point = period.points.find((item) => item.dateKey === dateKey);
      if (point) {
        updater(point, periodKey);
      }
    }
  };

  // Channels stats accumulator for each period
  const channelMaps: Record<
    AdminDashboardPeriodKey,
    {
      image: Map<string, ChannelStatItem>;
      video: Map<string, ChannelStatItem>;
      music: Map<string, ChannelStatItem>;
    }
  > = {
    today: { image: new Map(), video: new Map(), music: new Map() },
    '7d': { image: new Map(), video: new Map(), music: new Map() },
    '30d': { image: new Map(), video: new Map(), music: new Map() },
  };

  usersList.forEach((item: any) => {
    const dateKey = toDateKey(item.createdAt);
    if (!dateKey) return;
    applyToPeriods(dateKey, (point) => {
      point.users += 1;
    });
  });

  ordersList.forEach((item: any) => {
    const dateKey = toDateKey(item.createdAt);
    if (!dateKey) return;
    applyToPeriods(dateKey, (point) => {
      point.payments += 1;
      point.revenue += item.amount || 0;
    });
  });

  tasksList.forEach((item: any) => {
    const dateKey = toDateKey(item.createdAt);
    if (!dateKey) return;
    const mediaType = item.mediaType || 'image';
    const isSuccess = item.status === 'success';
    const isFailed = item.status === 'failed' || item.status === 'canceled';
    const provider = item.provider || 'default';
    const channelName = item.model ? `${provider} / ${item.model}` : provider;

    applyToPeriods(dateKey, (point, periodKey) => {
      let bucket: 'image' | 'video' | 'music' = 'image';
      if (mediaType === 'video') {
        bucket = 'video';
        point.videoTasks += 1;
        if (isSuccess) point.videoSuccess += 1;
        if (isFailed) {
          point.videoFailed += 1;
          point.videoFailureProviders[provider] =
            (point.videoFailureProviders[provider] || 0) + 1;
        }
      } else if (mediaType === 'music' || mediaType === 'audio') {
        bucket = 'music';
        point.musicTasks += 1;
        if (isSuccess) point.musicSuccess += 1;
        if (isFailed) {
          point.musicFailed += 1;
          point.musicFailureProviders[provider] =
            (point.musicFailureProviders[provider] || 0) + 1;
        }
      } else {
        bucket = 'image';
        point.imageTasks += 1;
        if (isSuccess) point.imageSuccess += 1;
        if (isFailed) {
          point.imageFailed += 1;
          point.imageFailureProviders[provider] =
            (point.imageFailureProviders[provider] || 0) + 1;
        }
      }

      if (isFailed) {
        point.failureProviders[provider] =
          (point.failureProviders[provider] || 0) + 1;
      }

      // Track channel stats for this period
      const cMap = channelMaps[periodKey][bucket];
      const exist = cMap.get(channelName) || {
        name: channelName,
        total: 0,
        failed: 0,
      };
      exist.total += 1;
      if (isFailed) exist.failed += 1;
      cMap.set(channelName, exist);
    });
  });

  for (const [periodKey, period] of periodEntries) {
    period.summary = sumPoints(period.points);
    period.activeProviders = getProviderCounts(
      period.points,
      'failureProviders'
    );
    period.imageProviders = getProviderCounts(
      period.points,
      'imageFailureProviders'
    );
    period.videoProviders = getProviderCounts(
      period.points,
      'videoFailureProviders'
    );
    period.musicProviders = getProviderCounts(
      period.points,
      'musicFailureProviders'
    );
    period.channelStats = {
      image: Array.from(channelMaps[periodKey].image.values()).sort(
        (a, b) => b.total - a.total
      ),
      video: Array.from(channelMaps[periodKey].video.values()).sort(
        (a, b) => b.total - a.total
      ),
      music: Array.from(channelMaps[periodKey].music.values()).sort(
        (a, b) => b.total - a.total
      ),
    };
  }

  return {
    periods,
  };
}
