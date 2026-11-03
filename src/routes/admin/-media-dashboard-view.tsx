'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  ListFilter,
  Music,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  AdminDashboardData,
  AdminDashboardPeriodKey,
} from '@/modules/admin/dashboard-service';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PROVIDER_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
];

function formatAxisLabel(dateKey: string, days: number) {
  if (days === 1) {
    return m['admin.dashboard.ranges.today']();
  }
  const [, month, day] = dateKey.split('-');
  return `${month}-${day}`;
}

export function MediaDashboardView({
  mediaType,
  title,
  description,
  tasksLabel,
  failedTasksLabel,
}: {
  mediaType: 'image' | 'video' | 'music';
  title: string;
  description: string;
  tasksLabel: string;
  failedTasksLabel: string;
}) {
  const [range, setRange] = useState<AdminDashboardPeriodKey>('7d');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => apiGet<AdminDashboardData>('/api/admin/dashboard'),
  });

  const period = dashboardData?.periods?.[range];
  const days = range === 'today' ? 1 : Number.parseInt(range, 10);

  const stats = useMemo(() => {
    if (!period) return { total: 0, success: 0, failed: 0, rate: '100%' };
    let total = 0;
    let success = 0;
    let failed = 0;

    if (mediaType === 'video') {
      total = period.summary.videoTasks;
      success = period.summary.videoSuccess;
      failed = period.summary.videoFailed;
    } else if (mediaType === 'music') {
      total = period.summary.musicTasks;
      success = period.summary.musicSuccess;
      failed = period.summary.musicFailed;
    } else {
      total = period.summary.imageTasks;
      success = period.summary.imageSuccess;
      failed = period.summary.imageFailed;
    }

    const rate =
      total > 0 ? `${((success / total) * 100).toFixed(1)}%` : '100%';
    return { total, success, failed, rate };
  }, [period, mediaType]);

  const activeProviders = useMemo(() => {
    if (!period) return [];
    if (mediaType === 'video') return period.videoProviders || [];
    if (mediaType === 'music') return period.musicProviders || [];
    return period.imageProviders || [];
  }, [period, mediaType]);

  const channelStats = useMemo(() => {
    if (!period?.channelStats) return [];
    return period.channelStats[mediaType] || [];
  }, [period, mediaType]);

  const lineChartConfig = {
    total: {
      label: m['admin.dashboard.charts.tasks.series_total'](),
      color:
        mediaType === 'video'
          ? '#8b5cf6'
          : mediaType === 'music'
            ? '#f59e0b'
            : '#3b82f6',
    },
    success: {
      label: m['admin.dashboard.charts.tasks.series_success'](),
      color: '#10b981',
    },
    failed: {
      label: m['admin.dashboard.charts.tasks.series_failed'](),
      color: '#ef4444',
    },
  } satisfies ChartConfig;

  const failureChartConfig = useMemo(() => {
    return activeProviders.reduce((acc, item, index) => {
      acc[item.provider] = {
        label: item.provider,
        color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);
  }, [activeProviders]);

  const failureChartData = useMemo(() => {
    if (!period) return [];
    return period.points.map((point) => {
      const next: Record<string, string | number> = {
        label: formatAxisLabel(point.dateKey, days),
      };

      const sourceMap =
        mediaType === 'video'
          ? point.videoFailureProviders
          : mediaType === 'music'
            ? point.musicFailureProviders
            : point.imageFailureProviders;

      activeProviders.forEach((provider) => {
        next[provider.provider] = sourceMap?.[provider.provider] || 0;
      });

      return next;
    });
  }, [days, activeProviders, period, mediaType]);

  const lineChartData = useMemo(() => {
    if (!period) return [];
    return period.points.map((point) => {
      if (mediaType === 'video') {
        return {
          label: formatAxisLabel(point.dateKey, days),
          total: point.videoTasks,
          success: point.videoSuccess,
          failed: point.videoFailed,
        };
      }
      if (mediaType === 'music') {
        return {
          label: formatAxisLabel(point.dateKey, days),
          total: point.musicTasks,
          success: point.musicSuccess,
          failed: point.musicFailed,
        };
      }
      return {
        label: formatAxisLabel(point.dateKey, days),
        total: point.imageTasks,
        success: point.imageSuccess,
        failed: point.imageFailed,
      };
    });
  }, [period, days, mediaType]);

  const xAxisProps = {
    dataKey: 'label',
    tickLine: false,
    axisLine: false,
    minTickGap: 12,
    tickMargin: 8,
    padding: { left: 8, right: 8 },
  };

  const yAxisProps = {
    allowDecimals: false,
    tickLine: false,
    axisLine: false,
    width: 36,
    tickMargin: 8,
  };

  const MediaIcon =
    mediaType === 'video' ? Film : mediaType === 'music' ? Music : ImageIcon;

  const mainColor =
    mediaType === 'video'
      ? '#8b5cf6'
      : mediaType === 'music'
        ? '#f59e0b'
        : '#3b82f6';

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header with Title and Action Links */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs
            value={range}
            onValueChange={(val) => setRange(val as AdminDashboardPeriodKey)}
          >
            <TabsList className="grid h-9 grid-cols-3">
              <TabsTrigger value="today" className="text-xs">
                {m['admin.dashboard.ranges.today']()}
              </TabsTrigger>
              <TabsTrigger value="7d" className="text-xs">
                {m['admin.dashboard.ranges.7d']()}
              </TabsTrigger>
              <TabsTrigger value="30d" className="text-xs">
                {m['admin.dashboard.ranges.30d']()}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Link
            to="/admin/ai-tasks"
            search={{ type: mediaType }}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className:
                'inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs whitespace-nowrap',
            })}
          >
            <ListFilter className="size-3.5 shrink-0" />
            <span>{tasksLabel}</span>
          </Link>

          <Link
            to="/admin/ai-tasks"
            search={{ type: mediaType, status: 'failed' }}
            className={buttonVariants({
              variant: 'destructive',
              size: 'sm',
              className:
                'inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs whitespace-nowrap',
            })}
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{failedTasksLabel}</span>
          </Link>
        </div>
      </div>

      {isLoading || !period ? (
        <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
          {m['admin.loading']()}
        </div>
      ) : (
        <>
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
                <CardDescription className="truncate text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.charts.tasks.series_total']()}
                </CardDescription>
                <MediaIcon
                  className="size-4 shrink-0"
                  style={{ color: mainColor }}
                />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl font-bold sm:text-2xl">
                  {stats.total}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
                <CardDescription className="truncate text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.charts.tasks.series_success']()}
                </CardDescription>
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl font-bold text-emerald-600 sm:text-2xl">
                  {stats.success}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
                <CardDescription className="truncate text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.charts.tasks.series_failed']()}
                </CardDescription>
                <AlertTriangle className="size-4 shrink-0 text-rose-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl font-bold text-rose-600 sm:text-2xl">
                  {stats.failed}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
                <CardDescription className="truncate text-xs font-medium tracking-wider uppercase">
                  {m['admin.media.success_rate']()}
                </CardDescription>
                <Activity className="size-4 shrink-0 text-sky-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-foreground text-xl font-bold sm:text-2xl">
                  {stats.rate}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row: Trend Line Chart & Provider Failure Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Trend Chart */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base font-semibold">
                  {m['admin.media.trend_title']()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {m['admin.media.trend_desc']()}
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
                <ChartContainer
                  className="aspect-auto h-[260px] w-full min-w-0"
                  config={lineChartConfig}
                >
                  <LineChart
                    margin={{ left: 4, right: 12 }}
                    data={lineChartData}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={mainColor}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="success"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Provider Failure Distribution */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base font-semibold">
                  {m['admin.dashboard.charts.failures.title']()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {m['admin.dashboard.charts.failures.description']()}
                </CardDescription>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeProviders.length > 0 ? (
                    activeProviders.map((provider, index) => (
                      <Badge
                        key={provider.provider}
                        variant="outline"
                        className="text-[11px]"
                        style={{
                          borderColor:
                            PROVIDER_COLORS[index % PROVIDER_COLORS.length],
                        }}
                      >
                        {provider.provider} · {provider.count}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-[11px]">
                      {m['admin.dashboard.charts.failures.no_providers']()}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
                <ChartContainer
                  className="aspect-auto h-[260px] w-full min-w-0"
                  config={failureChartConfig}
                >
                  <BarChart
                    margin={{ left: 4, right: 12 }}
                    data={failureChartData}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    {activeProviders.map((provider, index) => (
                      <Bar
                        key={provider.provider}
                        dataKey={provider.provider}
                        stackId="failures"
                        fill={PROVIDER_COLORS[index % PROVIDER_COLORS.length]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Channels / Models Breakdown */}
          {channelStats.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base font-semibold">
                  {m['admin.media.channels_title']()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {m['admin.media.channels_desc']()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {channelStats.map((item) => {
                    const failRate =
                      item.total > 0
                        ? ((item.failed / item.total) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <div
                        key={item.name}
                        className="bg-card flex flex-col justify-between rounded-lg border p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span
                            className="truncate text-xs font-semibold"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <Badge
                            variant={
                              item.failed > 0 ? 'destructive' : 'secondary'
                            }
                            className="shrink-0 text-[10px]"
                          >
                            {m['admin.media.fail_rate']({ rate: failRate })}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>
                            {m['admin.media.total_calls']()}{' '}
                            <strong className="text-foreground">
                              {item.total}
                            </strong>
                          </span>
                          <span>
                            {m['admin.media.failed_calls']()}{' '}
                            <strong className="text-rose-500">
                              {item.failed}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
