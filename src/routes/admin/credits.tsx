import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Eye } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { apiGet, type PageResult } from '@/lib/api-client';
import { formatAdminDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserCell } from '@/components/user-cell';

interface Credit {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  userImage: string | null;
  transactionNo: string;
  transactionType: string;
  transactionScene: string | null;
  credits: number;
  remainingCredits: number;
  description: string | null;
  expiresAt: string | null;
  status: string;
  createdAt: string;
  taskId: string | null;
  taskExternalId: string | null;
  taskMediaType: string | null;
  taskProvider: string | null;
  taskModel: string | null;
  taskPrompt: string | null;
  taskStatus: string | null;
  taskCreatedAt: string | null;
}

const PAGE_SIZE = 20;

const TABS = ['all', 'grant', 'consume'] as const;
type Tab = (typeof TABS)[number];

/**
 * 后台管理 - 用户积分流水审计页面
 * 包含点数发放/消耗类型过滤、流水号检索、变动前后余额与有效期审计
 */
function CreditsPage() {
  const initialSearch = Route.useSearch().search ?? '';
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedTask, setSelectedTask] = useState<Credit | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch]);

  const query = useQuery({
    queryKey: ['admin-credits', page, tab, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (tab !== 'all') params.set('transactionType', tab);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiGet<PageResult<Credit>>(`/api/admin/credits?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const credits = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const columns: Column<Credit>[] = [
    {
      header: m['admin.credits.transaction_no'](),
      cell: (c) => <span className="font-mono text-xs">{c.transactionNo}</span>,
    },
    {
      header: m['admin.credits.user'](),
      cell: (c) => (
        <UserCell
          userId={c.userId}
          name={c.userName}
          email={c.userEmail}
          image={c.userImage}
        />
      ),
    },
    {
      header: m['admin.credits.amount'](),
      cell: (c) => (
        <span
          className={cn(
            'font-medium',
            c.credits > 0 ? 'text-green-600' : 'text-red-500'
          )}
        >
          {c.credits > 0 ? `+${c.credits}` : c.credits}
        </span>
      ),
    },
    {
      header: m['admin.credits.remaining'](),
      cell: (c) => c.remainingCredits,
    },
    {
      header: m['admin.credits.type'](),
      cell: (c) => <Badge variant="secondary">{c.transactionType}</Badge>,
    },
    {
      header: m['admin.credits.status'](),
      cell: (c) =>
        c.status === 'deleted' ? (
          <Badge variant="destructive" className="font-semibold">
            {m['admin.credits.refunded']()}
          </Badge>
        ) : (
          <Badge variant="secondary">{c.status}</Badge>
        ),
    },
    {
      header: m['admin.credits.scene'](),
      cell: (c) => c.transactionScene || '—',
    },
    {
      header: m['admin.credits.description'](),
      cell: (c) => (
        <span className="text-muted-foreground block max-w-[200px] truncate text-sm">
          {c.description || '—'}
        </span>
      ),
    },
    {
      header: m['admin.credits.expires_at'](),
      cell: (c) => (
        <span className="text-muted-foreground text-sm">
          {c.expiresAt ? formatAdminDateTime(c.expiresAt) : '—'}
        </span>
      ),
    },
    {
      header: m['admin.credits.created_at'](),
      cell: (c) => (
        <span className="text-muted-foreground text-sm">
          {formatAdminDateTime(c.createdAt)}
        </span>
      ),
    },
    {
      header: m['admin.credits.task'](),
      cell: (c) =>
        c.taskId ? (
          <Button
            variant="ghost"
            size="icon"
            title={m['admin.credits.view_task']()}
            onClick={() => setSelectedTask(c)}
          >
            <Eye className="size-4" />
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['admin.credits.title']()}</h1>
        <p className="text-muted-foreground">
          {m['admin.credits.description']()}
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
            {tDynamic(`admin.credits.tab_${tb}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={credits}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(c) => c.id}
            emptyText={m['admin.credits.no_credits']()}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={m['admin.credits.search_placeholder']()}
            onRefresh={() => query.refetch()}
            loading={query.isFetching || query.isPending}
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m['admin.credits.task_details']()}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">
                  {m['admin.credits.task_id']()}
                </dt>
                <dd className="font-mono break-all">
                  {selectedTask.taskExternalId || selectedTask.taskId}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {m['admin.credits.task_status']()}
                </dt>
                <dd>{selectedTask.taskStatus || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {m['admin.credits.task_model']()}
                </dt>
                <dd>
                  {selectedTask.taskProvider || '—'} /{' '}
                  {selectedTask.taskModel || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {m['admin.credits.task_prompt']()}
                </dt>
                <dd className="bg-muted/50 max-h-40 overflow-y-auto rounded-md p-3 break-words whitespace-pre-wrap">
                  {selectedTask.taskPrompt || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {m['admin.credits.task_created_at']()}
                </dt>
                <dd>
                  {selectedTask.taskCreatedAt
                    ? formatAdminDateTime(selectedTask.taskCreatedAt)
                    : '—'}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/admin/credits')({
  validateSearch: (search: Record<string, unknown>): { search?: string } =>
    typeof search.search === 'string' && search.search
      ? { search: search.search }
      : {},
  component: CreditsPage,
});
