'use client';

import { useMemo } from 'react';
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
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
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

export function AIAllTrendCharts({
  data,
  range,
}: {
  data: AdminDashboardData;
  range: AdminDashboardPeriodKey;
}) {
  const period = data.periods[range];
  const days = range === 'today' ? 1 : Number.parseInt(range, 10);

  const imageTaskChartConfig = {
    imageTasks: {
      label: m['admin.dashboard.charts.tasks.series_total'](),
      color: '#3b82f6',
    },
    imageSuccess: {
      label: m['admin.dashboard.charts.tasks.series_success'](),
      color: '#10b981',
    },
    imageFailed: {
      label: m['admin.dashboard.charts.tasks.series_failed'](),
      color: '#ef4444',
    },
  } satisfies ChartConfig;

  const videoTaskChartConfig = {
    videoTasks: {
      label: m['admin.dashboard.charts.tasks.series_total'](),
      color: '#8b5cf6',
    },
    videoSuccess: {
      label: m['admin.dashboard.charts.tasks.series_success'](),
      color: '#10b981',
    },
    videoFailed: {
      label: m['admin.dashboard.charts.tasks.series_failed'](),
      color: '#ef4444',
    },
  } satisfies ChartConfig;

  const failureChartConfig = useMemo(() => {
    return period.activeProviders.reduce((acc, item, index) => {
      acc[item.provider] = {
        label: item.provider,
        color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);
  }, [period.activeProviders]);

  const failureChartData = useMemo(() => {
    return period.points.map((point) => {
      const next: Record<string, string | number> = {
        label: formatAxisLabel(point.dateKey, days),
      };

      period.activeProviders.forEach((provider) => {
        next[provider.provider] =
          point.failureProviders[provider.provider] || 0;
      });

      return next;
    });
  }, [days, period.activeProviders, period.points]);

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

  return (
    <>
      {/* 1. 生图任务趋势 */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {m['admin.dashboard.charts.image_tasks.title']()}
          </CardTitle>
          <CardDescription>
            {m['admin.dashboard.charts.image_tasks.description']()}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartContainer
            className="aspect-auto h-[240px] w-full min-w-0"
            config={imageTaskChartConfig}
          >
            <LineChart
              margin={{ left: 4, right: 12 }}
              data={period.points.map((point) => ({
                label: formatAxisLabel(point.dateKey, days),
                imageTasks: point.imageTasks,
                imageSuccess: point.imageSuccess,
                imageFailed: point.imageFailed,
              }))}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                opacity={0.3}
              />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="imageTasks"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="imageSuccess"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="imageFailed"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 2. 生视频任务趋势 */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {m['admin.dashboard.charts.video_tasks.title']()}
          </CardTitle>
          <CardDescription>
            {m['admin.dashboard.charts.video_tasks.description']()}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartContainer
            className="aspect-auto h-[240px] w-full min-w-0"
            config={videoTaskChartConfig}
          >
            <LineChart
              margin={{ left: 4, right: 12 }}
              data={period.points.map((point) => ({
                label: formatAxisLabel(point.dateKey, days),
                videoTasks: point.videoTasks,
                videoSuccess: point.videoSuccess,
                videoFailed: point.videoFailed,
              }))}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                opacity={0.3}
              />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="videoTasks"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="videoSuccess"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="videoFailed"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 3. AI 供应商异常分布 */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {m['admin.dashboard.charts.failures.title']()}
          </CardTitle>
          <CardDescription>
            {m['admin.dashboard.charts.failures.description']()}
          </CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {period.activeProviders.length > 0 ? (
              period.activeProviders.map((provider) => (
                <Badge key={provider.provider} variant="outline">
                  {provider.provider} · {provider.count}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">
                {m['admin.dashboard.charts.failures.no_providers']()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartContainer
            className="aspect-auto h-[240px] w-full min-w-0"
            config={failureChartConfig}
          >
            <BarChart margin={{ left: 4, right: 12 }} data={failureChartData}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                opacity={0.3}
              />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {period.activeProviders.map((provider, index) => (
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
    </>
  );
}
