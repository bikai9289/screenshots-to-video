'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

export interface RecentCreationsPaginationProps {
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}

export function RecentCreationsPagination({
  total,
  currentPage,
  totalPages,
  onPageChange,
}: RecentCreationsPaginationProps) {
  return (
    <div className="border-border/80 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
      <p className="text-muted-foreground text-xs sm:text-sm">
        {m['common.table.total']({ count: total })} &middot;{' '}
        {m['common.table.page_info']({
          current: currentPage,
          total: totalPages,
        })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-8 gap-1 rounded-lg px-2.5 text-xs font-medium"
        >
          <ChevronLeft className="size-3.5" />
          {m['common.table.previous']()}
        </Button>
        <span className="text-muted-foreground px-2 text-xs font-semibold">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-8 gap-1 rounded-lg px-2.5 text-xs font-medium"
        >
          {m['common.table.next']()}
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
