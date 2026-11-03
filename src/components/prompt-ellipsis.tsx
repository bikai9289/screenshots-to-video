'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { copyToClipboard } from '@/lib/copy';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function PromptEllipsis({
  value,
  className,
  enableCopy = true,
  copyLabel,
  copiedLabel,
}: {
  value?: string | null;
  className?: string;
  enableCopy?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className={className}>-</span>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      toast.success(copiedLabel || 'Prompt copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className || ''}`.trim()}>
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="text-foreground hover:text-primary max-w-[200px] cursor-pointer truncate text-left text-xs transition-colors select-all sm:max-w-[260px]">
              {value}
            </div>
          }
        />
        <TooltipContent
          side="top"
          className="bg-popover text-popover-foreground max-h-80 max-w-md overflow-y-auto border p-3 text-xs leading-relaxed font-normal break-words whitespace-pre-wrap shadow-xl select-all"
        >
          {value}
        </TooltipContent>
      </Tooltip>
      {enableCopy && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-5 shrink-0"
                onClick={handleCopy}
                aria-label={copyLabel || 'Copy Prompt'}
              >
                {copied ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Button>
            }
          />
          <TooltipContent side="top" className="px-2 py-1 text-[11px]">
            {copyLabel || 'Copy Prompt'}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
