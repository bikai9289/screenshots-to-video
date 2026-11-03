'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  CreditCard,
  Film,
  Image as ImageIcon,
  Users,
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
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AIAllTrendCharts } from './-trend-charts';

function formatCurrency(amount: number) {
  return `$${(amount / 100).toFixed(2)}`;
}

function formatAxisLabel(dateKey: string, days: number) {
  if (days === 1) {
    return m['admin.dashboard.ranges.today']();
  }
  const [, month, day] = dateKey.split('-');
  return `${month}-${day}`;
}

function AdminDashboardPage() {
  const [range, setRange] = useState<AdminDashboardPeriodKey>('7d');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => apiGet<AdminDashboardData>('/api/admin/dashboard'),
  });

  const period = dashboardData?.periods?.[range];
  const days = range === 'today' ? 1 : Number.parseInt(range, 10);

  const userChartConfig = {
    users: {
      label: m['admin.dashboard.charts.users.series'](),
      color: '#3b82f6',
    },
  } satisfies ChartConfig;

  const paymentChartConfig = {
    payments: {
      label: m['admin.dashboard.charts.payments.series'](),
      color: '#10b981',
    },
  } satisfies ChartConfig;

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
    <div className="space-y-6 p-6">
      {/* Header & Period Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {m['admin.title']()}
          </h1>
          <p className="text-muted-foreground text-sm">
            {m['admin.description']()}
          </p>
        </div>
        <Tabs
          value={range}
          onValueChange={(val) => setRange(val as AdminDashboardPeriodKey)}
        >
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="today">
              {m['admin.dashboard.ranges.today']()}
            </TabsTrigger>
            <TabsTrigger value="7d">
              {m['admin.dashboard.ranges.7d']()}
            </TabsTrigger>
            <TabsTrigger value="30d">
              {m['admin.dashboard.ranges.30d']()}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading || !period ? (
        <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
          {m['admin.loading']()}
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* New Users */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.summary.new_users']()}
                </CardDescription>
                <Users className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{period.summary.users}</div>
              </CardContent>
            </Card>

            {/* Payments & Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.summary.payments']()}
                </CardDescription>
                <CreditCard className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {period.summary.payments}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {m['admin.dashboard.summary.revenue']()}:{' '}
                  <span className="text-foreground font-medium">
                    {formatCurrency(period.summary.revenue)}
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Image Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.summary.image_tasks']()}
                </CardDescription>
                <ImageIcon className="size-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {period.summary.imageTasks}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  <span className="font-medium text-emerald-600">
                    {period.summary.imageSuccess} ✓
                  </span>
                  {' · '}
                  <span className="font-medium text-rose-500">
                    {period.summary.imageFailed} ✕
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Video Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.summary.video_tasks']()}
                </CardDescription>
                <Film className="size-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {period.summary.videoTasks}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  <span className="font-medium text-emerald-600">
                    {period.summary.videoSuccess} ✓
                  </span>
                  {' · '}
                  <span className="font-medium text-rose-500">
                    {period.summary.videoFailed} ✕
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Core Growth & Revenue Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* User Growth */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {m['admin.dashboard.charts.users.title']()}
                </CardTitle>
                <CardDescription>
                  {m['admin.dashboard.charts.users.description']()}
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0">
                <ChartContainer
                  className="aspect-auto h-[240px] w-full min-w-0"
                  config={userChartConfig}
                >
                  <LineChart
                    margin={{ left: 4, right: 12 }}
                    data={period.points.map((point) => ({
                      label: formatAxisLabel(point.dateKey, days),
                      users: point.users,
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
                      dataKey="users"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Payments Trend */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {m['admin.dashboard.charts.payments.title']()}
                </CardTitle>
                <CardDescription>
                  {m['admin.dashboard.charts.payments.description']()}
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0">
                <ChartContainer
                  className="aspect-auto h-[240px] w-full min-w-0"
                  config={paymentChartConfig}
                >
                  <BarChart
                    margin={{ left: 4, right: 12 }}
                    data={period.points.map((point) => ({
                      label: formatAxisLabel(point.dateKey, days),
                      payments: point.payments,
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
                    <Bar
                      dataKey="payments"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Multi-modal AI Generation Trend Charts (Image, Video, Audio & Failures) */}
            <AIAllTrendCharts data={dashboardData} range={range} />
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute('/admin/')({
  component: AdminDashboardPage,
});
