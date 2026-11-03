'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Check, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { extractMediaUrl, extractVideoUrl } from '@/core/ai';
import type { CreationItem } from '@/modules/creations/store';
import { apiGet, type PageResult } from '@/lib/api-client';
import { copyToClipboard } from '@/lib/copy';
import { formatAdminDateTime } from '@/lib/time';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { PromptEllipsis } from '@/components/prompt-ellipsis';
import { RecentCreationsLightbox } from '@/components/sites/workspace/creations/RecentCreationsLightbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AITaskItem {
  id: string;
  taskId: string | null;
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  status: string;
  options: string | null;
  taskInfo: string | null;
  taskResult: string | null;
  costCredits: number;
  scene: string;
  createdAt: number | string | Date;
  updatedAt: number | string | Date;
  userEmail?: string | null;
  userName?: string | null;
}

const STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  success: 'default',
  processing: 'secondary',
  pending: 'outline',
  failed: 'destructive',
  canceled: 'outline',
};

function parseJson(value: string | null): any {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/** Extract user-submitted reference images from task options (image-to-image or image-to-video). */
function getReferenceImageUrls(task: AITaskItem): string[] {
  if (task.mediaType !== 'image' && task.mediaType !== 'video') return [];
  const options = parseJson(task.options);
  const collected: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
      collected.push(value.trim());
    }
  };
  if (Array.isArray(options.image_urls)) options.image_urls.forEach(push);
  if (Array.isArray(options.image_input)) options.image_input.forEach(push);
  push(options.image_url);
  return [...new Set(collected)];
}

/** Extract final successful output media URLs from taskResult / taskInfo. */
function getResultMediaUrls(task: AITaskItem): string[] {
  if (task.status !== 'success') return [];
  const result = parseJson(task.taskResult);
  const info = parseJson(task.taskInfo);
  const collected: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
      collected.push(value.trim());
    }
  };

  if (task.mediaType === 'video') {
    const collectVideos = (list: unknown) => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (typeof item === 'string') push(item);
        else if (item && typeof item === 'object') {
          push(
            (item as any).videoUrl ||
              (item as any).video_url ||
              (item as any).url
          );
        }
      }
    };
    collectVideos(info?.videos);
    collectVideos(result?.taskInfo?.videos);
    collectVideos(result?.videos);
    collectVideos(result?.data?.videos);
    if (collected.length === 0) {
      push(
        extractVideoUrl(result) ||
          extractVideoUrl(info) ||
          extractMediaUrl(result) ||
          extractMediaUrl(info)
      );
    }
  } else {
    const collectImages = (list: unknown) => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (typeof item === 'string') push(item);
        else if (item && typeof item === 'object') {
          push(
            (item as any).imageUrl ||
              (item as any).image_url ||
              (item as any).url
          );
        }
      }
    };
    collectImages(info?.images);
    collectImages(result?.taskInfo?.images);
    collectImages(result?.images);
    collectImages(result?.data?.images);
    if (collected.length === 0) {
      push(extractMediaUrl(result) || extractMediaUrl(info));
    }
  }

  return [...new Set(collected)];
}

function getFailureDetails(task: AITaskItem) {
  const info = parseJson(task.taskInfo);
  const result = parseJson(task.taskResult);
  const errors = [
    result?.taskResult?.data?.error,
    result?.taskResult?.error,
    result?.data?.error,
    result?.error,
    result?.taskInfo,
    info,
  ].filter(Boolean);
  const code = errors.find((item) => item?.errorCode || item?.code);
  const message = errors.find(
    (item) => item?.errorMessage || item?.message || typeof item === 'string'
  );
  return {
    code: code?.errorCode || code?.code || '',
    message:
      (typeof message === 'string'
        ? message
        : message?.errorMessage || message?.message) || '',
  };
}

function getPageMeta(mediaType: string, status: string) {
  const isFailed = status === 'failed';
  if (mediaType === 'image') {
    return {
      title: isFailed
        ? m['admin.ai_tasks.meta.image_failed_title']()
        : m['admin.ai_tasks.meta.image_title'](),
      description: isFailed
        ? m['admin.ai_tasks.meta.image_failed_desc']()
        : m['admin.ai_tasks.meta.image_desc'](),
    };
  }
  if (mediaType === 'video') {
    return {
      title: isFailed
        ? m['admin.ai_tasks.meta.video_failed_title']()
        : m['admin.ai_tasks.meta.video_title'](),
      description: isFailed
        ? m['admin.ai_tasks.meta.video_failed_desc']()
        : m['admin.ai_tasks.meta.video_desc'](),
    };
  }
  if (mediaType === 'music' || mediaType === 'audio') {
    return {
      title: isFailed
        ? m['admin.ai_tasks.meta.music_failed_title']()
        : m['admin.ai_tasks.meta.music_title'](),
      description: isFailed
        ? m['admin.ai_tasks.meta.music_failed_desc']()
        : m['admin.ai_tasks.meta.music_desc'](),
    };
  }
  return {
    title: isFailed
      ? m['admin.ai_tasks.meta.all_failed_title']()
      : m['admin.ai_tasks.meta.all_title'](),
    description: isFailed
      ? m['admin.ai_tasks.meta.all_failed_desc']()
      : m['admin.ai_tasks.meta.all_desc'](),
  };
}

function AITasksPage() {
  const searchParams = Route.useSearch();
  const mediaType = searchParams.type || searchParams.mediaType || 'all';
  const initialStatus = searchParams.status || 'all';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedTask, setSelectedTask] = useState<AITaskItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<CreationItem | null>(null);
  const lightboxItemRef = useRef(lightboxItem);
  lightboxItemRef.current = lightboxItem;
  const ignoreDialogCloseRef = useRef(false);

  const closeLightbox = () => {
    ignoreDialogCloseRef.current = true;
    setLightboxItem(null);
    requestAnimationFrame(() => {
      ignoreDialogCloseRef.current = false;
    });
  };

  useEffect(() => {
    setStatus(searchParams.status || 'all');
    setPage(1);
  }, [searchParams.status, searchParams.type, searchParams.mediaType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'admin-ai-tasks',
      page,
      pageSize,
      mediaType,
      status,
      debouncedSearch,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (mediaType !== 'all') params.set('mediaType', mediaType);
      if (status !== 'all') params.set('status', status);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      return apiGet<PageResult<AITaskItem>>(
        `/api/admin/ai-tasks?${params.toString()}`
      );
    },
    placeholderData: keepPreviousData,
  });

  const pageMeta = useMemo(
    () => getPageMeta(mediaType, status),
    [mediaType, status]
  );

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const columns: Column<AITaskItem>[] = [
    {
      header: m['admin.ai_tasks.task_id'](),
      cell: (item) => (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span
            className="max-w-[120px] truncate"
            title={item.taskId || item.id}
          >
            {item.taskId || item.id}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(item.taskId || item.id, item.id);
            }}
          >
            {copiedId === item.id ? (
              <Check className="size-3 text-emerald-500" />
            ) : (
              <Copy className="text-muted-foreground size-3" />
            )}
          </Button>
        </div>
      ),
    },
    {
      header: m['admin.ai_tasks.type'](),
      cell: (item) => (
        <Badge variant="outline" className="text-xs capitalize">
          {item.mediaType}
        </Badge>
      ),
    },
    {
      header: m['admin.ai_tasks.status'](),
      cell: (item) => (
        <Badge
          variant={STATUS_VARIANTS[item.status] || 'outline'}
          className="text-xs tracking-wider uppercase"
        >
          {item.status}
        </Badge>
      ),
    },
    {
      header: m['admin.ai_tasks.user'](),
      cell: (item) => (
        <div className="flex flex-col text-xs">
          <span className="text-foreground font-medium">
            {item.userEmail || item.userName || 'Anonymous'}
          </span>
          <span className="text-muted-foreground max-w-[140px] truncate text-[10px]">
            {item.userId}
          </span>
        </div>
      ),
    },
    {
      header: m['admin.ai_tasks.model'](),
      cell: (item) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium">{item.model}</span>
          <span className="text-muted-foreground text-[10px]">
            {item.provider}
          </span>
        </div>
      ),
    },
    {
      header: m['admin.ai_tasks.prompt'](),
      cell: (item) => (
        <PromptEllipsis
          value={item.prompt}
          enableCopy
          copyLabel={m['admin.ai_tasks.prompt']()}
        />
      ),
    },
    {
      header: m['admin.ai_tasks.credits'](),
      cell: (item) => (
        <span className="text-foreground text-xs font-semibold">
          {item.costCredits}
        </span>
      ),
    },
    {
      header: m['admin.ai_tasks.created_at'](),
      cell: (item) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {formatAdminDateTime(item.createdAt)}
        </span>
      ),
    },
    {
      header: m['admin.ai_tasks.actions'](),
      cell: (item) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs whitespace-nowrap"
          onClick={() => setSelectedTask(item)}
        >
          <Eye className="mr-1 size-3.5" />
          {m['admin.ai_tasks.details']()}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Dynamic Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {pageMeta.title}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
          {pageMeta.description}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Table without type tabs */}
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            total={data?.total ?? 0}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            rowKey={(item) => item.id}
            emptyText={m['admin.ai_tasks.no_tasks']()}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={m['admin.ai_tasks.search_placeholder']()}
            toolbar={
              <Select
                value={status}
                onValueChange={(val) => {
                  setStatus(val || 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder={m['admin.ai_tasks.status_all']()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {m['admin.ai_tasks.status_all']()}
                  </SelectItem>
                  <SelectItem value="pending">
                    {m['admin.ai_tasks.status_pending']()}
                  </SelectItem>
                  <SelectItem value="processing">
                    {m['admin.ai_tasks.status_processing']()}
                  </SelectItem>
                  <SelectItem value="success">
                    {m['admin.ai_tasks.status_success']()}
                  </SelectItem>
                  <SelectItem value="failed">
                    {m['admin.ai_tasks.status_failed']()}
                  </SelectItem>
                  <SelectItem value="canceled">
                    {m['admin.ai_tasks.status_canceled']()}
                  </SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </CardContent>
      </Card>

      {/* Task Details Dialog (Optimized & Expanded width) */}
      <Dialog
        open={Boolean(selectedTask)}
        modal={!lightboxItem}
        onOpenChange={(open) => {
          if (!open) {
            // Closing lightbox must not dismiss the task dialog.
            if (ignoreDialogCloseRef.current || lightboxItemRef.current) {
              setLightboxItem(null);
              return;
            }
            setSelectedTask(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto p-4 sm:max-w-4xl sm:p-6 lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>{m['admin.ai_tasks.details']()}</span>
              {selectedTask && (
                <Badge
                  variant={STATUS_VARIANTS[selectedTask.status] || 'outline'}
                  className="text-xs uppercase"
                >
                  {selectedTask.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs break-all">
              Task ID: {selectedTask?.taskId || selectedTask?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4 text-xs">
              {selectedTask.status === 'failed' &&
                (() => {
                  const failure = getFailureDetails(selectedTask);
                  if (!failure.code && !failure.message) return null;
                  return (
                    <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3.5">
                      <div className="font-semibold">
                        {m['admin.ai_tasks.failure_reason']()}
                      </div>
                      {failure.code && (
                        <div className="mt-1 font-mono break-all">
                          {m['admin.ai_tasks.error_code']()}: {failure.code}
                        </div>
                      )}
                      {failure.message && (
                        <div className="mt-1 break-all whitespace-pre-wrap">
                          {failure.message}
                        </div>
                      )}
                    </div>
                  );
                })()}
              {/* Meta Grid */}
              <div className="bg-muted/40 grid grid-cols-2 gap-3 rounded-lg border p-3.5 sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  <span className="text-foreground font-medium capitalize">
                    {selectedTask.mediaType}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Model: </span>
                  <span className="text-foreground font-medium">
                    {selectedTask.model}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider: </span>
                  <span className="text-foreground font-medium">
                    {selectedTask.provider}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Credits: </span>
                  <span className="text-foreground font-semibold">
                    {selectedTask.costCredits}
                  </span>
                </div>
                <div className="col-span-2 truncate sm:col-span-1">
                  <span className="text-muted-foreground">User: </span>
                  <span className="text-foreground font-medium">
                    {selectedTask.userEmail || selectedTask.userId}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-muted-foreground">Created: </span>
                  <span className="text-foreground">
                    {formatAdminDateTime(selectedTask.createdAt)}
                  </span>
                </div>
              </div>

              {/* Final result media — show first for successful tasks */}
              {(() => {
                const resultUrls = getResultMediaUrls(selectedTask);
                if (resultUrls.length === 0) return null;
                const isVideoTask = selectedTask.mediaType === 'video';
                const resultTitle = isVideoTask
                  ? m['admin.ai_tasks.result_videos']()
                  : m['admin.ai_tasks.result_images']();
                return (
                  <div>
                    <h4 className="text-foreground mb-1.5 text-xs font-semibold">
                      {resultTitle}
                      {resultUrls.length > 1 && (
                        <span className="text-muted-foreground ml-1.5 font-normal">
                          ({resultUrls.length})
                        </span>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {resultUrls.map((url, index) => (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          title={resultTitle}
                          onClick={() =>
                            setLightboxItem({
                              id: `result-${selectedTask.id}-${index}`,
                              mediaType: isVideoTask ? 'video' : 'image',
                              prompt: selectedTask.prompt || '',
                              url,
                              createdAt: Date.now(),
                            })
                          }
                          className="border-border bg-muted/40 hover:border-primary/50 focus-visible:ring-ring max-h-56 max-w-full overflow-hidden rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-none sm:max-w-xs"
                        >
                          {isVideoTask ? (
                            <video
                              src={url}
                              preload="metadata"
                              muted
                              playsInline
                              {...{ referrerPolicy: 'no-referrer' }}
                              className="pointer-events-none max-h-56 w-auto max-w-full object-contain"
                            />
                          ) : (
                            <img
                              src={url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="max-h-56 w-auto max-w-full object-contain"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Prompt Block with Copy */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <h4 className="text-foreground text-xs font-semibold">
                    Prompt
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      handleCopy(selectedTask.prompt, 'dialog-prompt')
                    }
                  >
                    <Copy className="mr-1 size-3" />
                    Copy
                  </Button>
                </div>
                <div className="bg-card text-foreground max-h-48 overflow-y-auto rounded-md border p-3 font-mono text-xs break-all whitespace-pre-wrap select-text">
                  {selectedTask.prompt}
                </div>
              </div>

              {/* Reference images (image-to-image) */}
              {(() => {
                const referenceUrls = getReferenceImageUrls(selectedTask);
                if (referenceUrls.length === 0) return null;
                return (
                  <div>
                    <h4 className="text-foreground mb-1.5 text-xs font-semibold">
                      {m['admin.ai_tasks.reference_images']()}
                      <span className="text-muted-foreground ml-1.5 font-normal">
                        ({referenceUrls.length})
                      </span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {referenceUrls.map((url, index) => (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          title={m['admin.ai_tasks.reference_images']()}
                          onClick={() =>
                            setLightboxItem({
                              id: `ref-${selectedTask.id}-${index}`,
                              mediaType: 'image',
                              prompt: selectedTask.prompt || '',
                              url,
                              createdAt: Date.now(),
                            })
                          }
                          className="border-border bg-muted/40 hover:border-primary/50 focus-visible:ring-ring size-20 shrink-0 overflow-hidden rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-24"
                        >
                          <img
                            src={url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="size-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Options */}
              {selectedTask.options && (
                <div>
                  {(() => {
                    const formattedOptions = (() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(selectedTask.options),
                          null,
                          2
                        );
                      } catch {
                        return selectedTask.options;
                      }
                    })();
                    return (
                      <>
                        <div className="mb-1.5 flex items-center justify-between">
                          <h4 className="text-foreground text-xs font-semibold">
                            Options
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              handleCopy(formattedOptions, 'dialog-options')
                            }
                          >
                            <Copy className="mr-1 size-3" />
                            Copy
                          </Button>
                        </div>
                        <pre className="bg-muted/30 max-h-44 overflow-auto rounded-md border p-3 font-mono text-xs break-all whitespace-pre-wrap select-text">
                          {formattedOptions}
                        </pre>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Task Info */}
              {selectedTask.taskInfo && (
                <div>
                  {(() => {
                    const formattedTaskInfo = (() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(selectedTask.taskInfo),
                          null,
                          2
                        );
                      } catch {
                        return selectedTask.taskInfo;
                      }
                    })();
                    return (
                      <>
                        <div className="mb-1.5 flex items-center justify-between">
                          <h4 className="text-foreground text-xs font-semibold">
                            Task Info
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              handleCopy(formattedTaskInfo, 'dialog-taskinfo')
                            }
                          >
                            <Copy className="mr-1 size-3" />
                            Copy
                          </Button>
                        </div>
                        <pre className="bg-muted/30 max-h-56 overflow-auto rounded-md border p-3 font-mono text-xs break-all whitespace-pre-wrap select-text">
                          {formattedTaskInfo}
                        </pre>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Task Result */}
              {selectedTask.taskResult && (
                <div>
                  {(() => {
                    const formattedTaskResult = (() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(selectedTask.taskResult),
                          null,
                          2
                        );
                      } catch {
                        return selectedTask.taskResult;
                      }
                    })();
                    return (
                      <>
                        <div className="mb-1.5 flex items-center justify-between">
                          <h4 className="text-foreground text-xs font-semibold">
                            Task Result
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              handleCopy(
                                formattedTaskResult,
                                'dialog-taskresult'
                              )
                            }
                          >
                            <Copy className="mr-1 size-3" />
                            Copy
                          </Button>
                        </div>
                        <pre className="bg-muted/30 max-h-64 overflow-auto rounded-md border p-3 font-mono text-xs break-all whitespace-pre-wrap select-text">
                          {formattedTaskResult}
                        </pre>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RecentCreationsLightbox item={lightboxItem} onClose={closeLightbox} />
    </div>
  );
}

export const Route = createFileRoute('/admin/ai-tasks')({
  validateSearch: (
    s: Record<string, unknown>
  ): {
    type?: string;
    mediaType?: string;
    status?: string;
    page?: number;
    search?: string;
  } => ({
    type: typeof s.type === 'string' ? s.type : undefined,
    mediaType: typeof s.mediaType === 'string' ? s.mediaType : undefined,
    status: typeof s.status === 'string' ? s.status : undefined,
    page: s.page ? Number(s.page) : undefined,
    search: typeof s.search === 'string' ? s.search : undefined,
  }),
  component: AITasksPage,
});
