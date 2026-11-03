'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { downloadFile, getCreationFilename } from '@/lib/download';
import { cn } from '@/lib/utils';

export interface DownloadButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
> {
  url?: string;
  filename?: string;
  item?: { id?: string; url: string; mediaType?: string; title?: string };
  iconClassName?: string;
  showIcon?: boolean;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
}

export function DownloadButton({
  url,
  filename,
  item,
  className,
  iconClassName = 'size-4',
  showIcon = true,
  children,
  disabled,
  title,
  onDownloadStart,
  onDownloadComplete,
  ...props
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const targetUrl = url || item?.url;
  const targetFilename =
    filename || (item ? getCreationFilename(item) : undefined);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isDownloading || disabled || !targetUrl) return;

    setIsDownloading(true);
    onDownloadStart?.();
    try {
      await downloadFile(targetUrl, targetFilename);
    } catch {
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
      onDownloadComplete?.();
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || isDownloading || !targetUrl}
      onClick={handleClick}
      className={cn(
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-70',
        className
      )}
      title={title}
      {...props}
    >
      {showIcon &&
        (isDownloading ? (
          <Loader2 className={cn('shrink-0 animate-spin', iconClassName)} />
        ) : (
          <Download className={cn('shrink-0', iconClassName)} />
        ))}
      {children}
    </button>
  );
}
