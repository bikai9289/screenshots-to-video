import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type {
  UserDashboardData,
  UserDashboardPeriodKey,
} from '@/routes/api/user/dashboard';
import {
  Activity,
  CreditCard,
  Film,
  Image as ImageIcon,
  Key,
  Sparkles,
  TrendingUp,
  Zap,
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

import { useSession } from '@/core/auth/client';
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

type Subscription = {
  status: string;
  planName?: string | null;
  productName?: string | null;
};

function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [range, setRange] = useState<UserDashboardPeriodKey>('7d');
  const { data: session } = useSession();

  const { data: creditsData } = useQuery({
    queryKey: ['user-credits'],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
  });
  const { data: apiKeysData } = useQuery({
    queryKey: ['user-apikeys'],
    queryFn: () => apiGet<unknown[]>('/api/apikeys'),
  });
  const { data: subscriptionData } = useQuery({
    queryKey: ['user-subscription-current'],
    queryFn: () =>
      apiGet<Subscription | null>('/api/user/subscriptions/current'),
  });
  const { data: userDashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['user-dashboard-stats'],
    queryFn: () => apiGet<UserDashboardData>('/api/user/dashboard'),
  });

  const credits = creditsData?.balance ?? null;
  const apiKeys = apiKeysData?.length ?? null;
  const subscription = subscriptionData ?? null;

  const planLabel =
    subscription?.planName ||
    subscription?.productName ||
    m['settings.overview.plan_free']();

  const currentPeriod = userDashboardData?.periods?.[range];
  const days = range === 'today' ? 1 : Number.parseInt(range, 10);

  const taskChartConfig = {
    totalTasks: {
      label: m['admin.dashboard.charts.tasks.series_total'](),
      color: '#3b82f6',
    },
    successTasks: {
      label: m['admin.dashboard.charts.tasks.series_success'](),
      color: '#10b981',
    },
    failedTasks: {
      label: m['admin.dashboard.charts.tasks.series_failed'](),
      color: '#ef4444',
    },
  } satisfies ChartConfig;

  const creditsChartConfig = {
    creditsConsumed: {
      label: m['settings.dashboard.charts.credits.series'](),
      color: '#f59e0b',
    },
  } satisfies ChartConfig;

  const multimodalChartConfig = {
    imageTasks: {
      label: m['settings.dashboard.charts.multimodal.image'](),
      color: '#0284c7',
    },
    videoTasks: {
      label: m['settings.dashboard.charts.multimodal.video'](),
      color: '#8b5cf6',
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
    width: 32,
    tickMargin: 8,
  };

  const periodTasks =
    currentPeriod?.summary.totalTasks ??
    userDashboardData?.lifetimeSummary.totalTasks ??
    0;
  const periodSuccess = currentPeriod?.summary.successTasks ?? 0;
  const periodCredits = currentPeriod?.summary.creditsConsumed ?? 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {m['settings.title']()}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {mounted
              ? m['settings.welcome']({
                  name: session?.user?.name || session?.user?.email || '',
                })
              : ''}
          </p>
        </div>
        <Tabs
          value={range}
          onValueChange={(val) => setRange(val as UserDashboardPeriodKey)}
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

      {/* Summary metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.overview.plan']()}
            </CardTitle>
            <TrendingUp className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planLabel}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {m['settings.overview.plan_description']()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.credits.title']()}
            </CardTitle>
            <CreditCard className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{credits ?? '—'}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {m['settings.credits.description']()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.apikeys.title']()}
            </CardTitle>
            <Key className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys ?? '—'}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {m['settings.overview.apikeys_description']()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.overview.usage']()}
            </CardTitle>
            <Activity className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodTasks}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {isDashboardLoading
                ? '...'
                : `${periodSuccess} ✓ · ${periodCredits} ${m['stp.common.credits']()}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Trend Charts Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {m['settings.dashboard.title']()}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {m['settings.dashboard.description']()}
          </p>
        </div>

        {isDashboardLoading || !currentPeriod ? (
          <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
            {m['admin.loading']()}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 1. AI Task Generation Trend (LineChart: Total, Success, Failed) */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {m['settings.dashboard.charts.tasks.title']()}
                    </CardTitle>
                    <CardDescription>
                      {m['settings.dashboard.charts.tasks.description']()}
                    </CardDescription>
                  </div>
                  <Sparkles className="size-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent className="min-w-0">
                <ChartContainer
                  className="aspect-auto h-[240px] w-full min-w-0"
                  config={taskChartConfig}
                >
                  <LineChart
                    margin={{ left: 4, right: 12 }}
                    data={currentPeriod.points}
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
                      dataKey="totalTasks"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="successTasks"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="failedTasks"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* 2. Credits Usage Trend (BarChart) */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {m['settings.dashboard.charts.credits.title']()}
                    </CardTitle>
                    <CardDescription>
                      {m['settings.dashboard.charts.credits.description']()}
                    </CardDescription>
                  </div>
                  <Zap className="size-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent className="min-w-0">
                <ChartContainer
                  className="aspect-auto h-[240px] w-full min-w-0"
                  config={creditsChartConfig}
                >
                  <BarChart
                    margin={{ left: 4, right: 12 }}
                    data={currentPeriod.points}
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
                      dataKey="creditsConsumed"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* 3. Multi-modal Distribution Comparison (Image, Video, Music) */}
            <Card className="min-w-0 overflow-hidden lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {m['settings.dashboard.charts.multimodal.title']()}
                    </CardTitle>
                    <CardDescription>
                      {m['settings.dashboard.charts.multimodal.description']()}
                    </CardDescription>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="size-3.5 text-sky-500" />
                      {m['settings.dashboard.charts.multimodal.image']()}:{' '}
                      <strong className="text-foreground">
                        {currentPeriod.summary.imageTasks}
                      </strong>
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Film className="size-3.5 text-purple-500" />
                      {m['settings.dashboard.charts.multimodal.video']()}:{' '}
                      <strong className="text-foreground">
                        {currentPeriod.summary.videoTasks}
                      </strong>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0">
                <ChartContainer
                  className="aspect-auto h-[240px] w-full min-w-0"
                  config={multimodalChartConfig}
                >
                  <BarChart
                    margin={{ left: 4, right: 12 }}
                    data={currentPeriod.points}
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
                      dataKey="imageTasks"
                      fill="#0284c7"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="videoTasks"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings/')({
  component: DashboardPage,
});
