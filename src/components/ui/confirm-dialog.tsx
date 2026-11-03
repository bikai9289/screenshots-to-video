'use client';

import * as React from 'react';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'default';
  icon?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'destructive',
  icon,
  onConfirm,
  isLoading = false,
  className,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive';
  const isWarning = variant === 'warning';

  const defaultIcon = isDestructive ? (
    <Trash2 className="size-5" />
  ) : (
    <AlertCircle className="size-5" />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!isLoading}
        className={cn(
          'border-border/80 bg-background/95 max-w-[92vw] overflow-hidden rounded-3xl p-6 shadow-2xl backdrop-blur-2xl sm:max-w-md md:p-7 dark:bg-card/95',
          className
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4.5">
          {/* Accent Icon Container */}
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform',
              isDestructive &&
                'border-destructive/20 bg-destructive/10 text-destructive border',
              isWarning &&
                'border-amber-500/20 bg-amber-500/10 text-amber-600 border dark:text-amber-400',
              !isDestructive &&
                !isWarning &&
                'border-primary/20 bg-primary/10 text-primary border'
            )}
          >
            {icon ?? defaultIcon}
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5 pt-0.5">
            <DialogTitle className="text-foreground text-base font-bold tracking-tight sm:text-lg">
              {title ?? m['stp.workspace.delete']()}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="mt-4 flex-row justify-end gap-2.5 pt-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            className="hover:bg-muted/80 text-foreground cursor-pointer rounded-xl px-4 text-xs font-semibold sm:text-sm"
          >
            {cancelText ?? m['stp.common.cancel']()}
          </Button>

          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            disabled={isLoading}
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
            className={cn(
              'cursor-pointer rounded-xl px-4 text-xs font-semibold shadow-xs transition-all sm:text-sm',
              isDestructive &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-destructive/20 hover:shadow-md'
            )}
          >
            {isLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {confirmText ??
              (isDestructive
                ? m['stp.workspace.delete']()
                : m['stp.common.confirm']())}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
