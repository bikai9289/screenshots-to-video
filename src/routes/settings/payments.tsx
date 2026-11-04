import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { tDynamic } from '@/core/i18n/dynamic';
import { apiGet, apiPost, type PageResult } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Order = {
  id: string;
  orderNo: string;
  status: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  paymentType?: string | null;
  productName?: string | null;
  planName?: string | null;
  invoiceUrl?: string | null;
  paidAt?: string | null;
  createdAt: string;
  paymentState?: string;
  lastAttemptCode?: string | null;
  checkedAt?: string | null;
  resumeUrl?: string | null;
};

const TABS = ['all', 'one-time', 'subscription', 'renew'] as const;
type Tab = (typeof TABS)[number];

const PAGE_SIZE = 20;

function formatAmount(amount: number, currency: string) {
  const normalized = (currency || 'usd').toUpperCase();
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: normalized,
  }).format(amount / 100);
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'succeeded' || s === 'active') return 'default';
  if (s === 'failed' || s === 'canceled') return 'destructive';
  return 'secondary';
}

function PaymentsPage() {
  const queryClient = useQueryClient();
  const [openedAt] = useState(Date.now);
  const [tab, setTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch]);

  const query = useQuery({
    queryKey: ['user-payments', page, tab, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (tab !== 'all') params.set('paymentType', tab);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiGet<PageResult<Order>>(`/api/user/orders?${params}`);
    },
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      Date.now() - openedAt < 120_000 &&
      query.state.data?.items.some((o) =>
        ['created', 'pending'].includes(o.status)
      )
        ? 10_000
        : false,
  });
  const check = useMutation({
    mutationFn: (orderNo: string) =>
      apiPost<{ paymentState: string }>('/api/user/orders/check', { orderNo }),
    onSuccess: (data) => {
      toast.success(tDynamic(`settings.payments.state_${data.paymentState}`));
      queryClient.invalidateQueries({ queryKey: ['user-payments'] });
      queryClient.invalidateQueries({ queryKey: ['screenshot-account'] });
    },
    onError: () => toast.error(m['settings.payments.check_error']()),
  });
  const orders = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const columns: Column<Order>[] = [
    {
      header: m['settings.payments.order_no'](),
      cell: (o) => <span className="font-mono text-xs">{o.orderNo}</span>,
    },
    {
      header: m['settings.payments.product'](),
      cell: (o) => <span>{o.planName || o.productName || '—'}</span>,
    },
    {
      header: m['settings.payments.amount'](),
      cell: (o) => (
        <span className="font-medium">
          {formatAmount(o.amount, o.currency)}
        </span>
      ),
    },
    {
      header: m['settings.payments.status'](),
      cell: (o) => {
        if (o.paymentProvider === 'stripe' && o.paymentState)
          return (
            <div className="space-y-1">
              <Badge variant={statusVariant(o.status)}>
                {tDynamic(`settings.payments.state_${o.paymentState}`)}
              </Badge>
              {o.paymentState === 'retryable' && (
                <p className="text-muted-foreground max-w-52 text-xs">
                  {m['settings.payments.attempt_failed']()}
                </p>
              )}
            </div>
          );
        const key = `admin.payments.status_${o.status}`;
        const label = tDynamic(key);
        return (
          <Badge variant={statusVariant(o.status)}>
            {label === key ? o.status : label}
          </Badge>
        );
      },
    },
    {
      header: m['settings.payments.type'](),
      cell: (o) => {
        if (!o.paymentType) return '—';
        const tabKey = `settings.payments.tab_${o.paymentType.replace('-', '_')}`;
        const label = tDynamic(tabKey);
        return label === tabKey ? o.paymentType : label;
      },
    },
    {
      header: m['settings.payments.provider'](),
      cell: (o) => <span className="capitalize">{o.paymentProvider}</span>,
    },
    {
      header: m['settings.payments.date'](),
      cell: (o) => (
        <span className="text-muted-foreground text-sm">
          {formatDateTime(o.paidAt || o.createdAt)}
        </span>
      ),
    },
    {
      header: m['settings.payments.invoice'](),
      className: 'w-[60px]',
      cell: (o) =>
        o.invoiceUrl ? (
          <a
            href={o.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            aria-label={m['settings.payments.invoice']()}
          >
            <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  columns.push({
    header: m['settings.payments.check_title'](),
    cell: (o) =>
      o.paymentProvider === 'stripe' &&
      ['created', 'pending'].includes(o.status) ? (
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            disabled={check.isPending}
            onClick={() => check.mutate(o.orderNo)}
          >
            <RefreshCw
              className={cn(
                'size-3.5',
                check.isPending &&
                  check.variables === o.orderNo &&
                  'animate-spin'
              )}
            />
            {m['settings.payments.check']()}
          </Button>
          {o.resumeUrl && (
            <a
              className="text-primary block text-xs underline underline-offset-4"
              href={o.resumeUrl}
              rel="noopener noreferrer"
            >
              {m['settings.payments.resume']()}
            </a>
          )}
          {o.checkedAt && (
            <p className="text-muted-foreground text-xs">
              {formatDateTime(o.checkedAt)}
            </p>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['settings.payments.title']()}</h1>
        <p className="text-muted-foreground">
          {m['settings.payments.description']()}
        </p>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          {m['settings.payments.status_help']()}
        </p>
      </div>

      <div className="border-border flex gap-1 overflow-x-auto overflow-y-hidden border-b">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === tb
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {tDynamic(`settings.payments.tab_${tb.replace('-', '_')}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={orders}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(o) => o.id}
            emptyText={m['settings.payments.no_payments']()}
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => query.refetch()}
            loading={query.isFetching || query.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/settings/payments')({
  component: PaymentsPage,
});
