'use client';

import React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

export interface RatioOption {
  value: string;
  label: string;
}

export const RATIO_OPTIONS: RatioOption[] = [
  { value: 'Auto', label: 'Auto' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

export function RatioIcon({ ratio }: { ratio: string }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      {ratio === 'Auto' && (
        <span className="border-muted-foreground h-4 w-4 rounded-[2px] border border-dashed dark:border-white/50" />
      )}
      {ratio === '16:9' && (
        <span className="border-foreground/70 h-[10px] w-[18px] rounded-[2px] border-[1.5px] dark:border-white/80" />
      )}
      {ratio === '9:16' && (
        <span className="border-foreground/70 h-[18px] w-[10px] rounded-[2px] border-[1.5px] dark:border-white/80" />
      )}
      {ratio === '1:1' && (
        <span className="border-foreground/70 h-[14px] w-[14px] rounded-[2px] border-[1.5px] dark:border-white/80" />
      )}
      {ratio === '4:3' && (
        <span className="border-foreground/70 h-[12px] w-[16px] rounded-[2px] border-[1.5px] dark:border-white/80" />
      )}
      {ratio === '3:4' && (
        <span className="border-foreground/70 h-[16px] w-[12px] rounded-[2px] border-[1.5px] dark:border-white/80" />
      )}
    </span>
  );
}

interface RatioSelectProps {
  value: string;
  onChange: (ratio: string) => void;
  className?: string;
}

export function RatioSelect({
  value,
  onChange,
  className = '',
}: RatioSelectProps) {
  const current =
    RATIO_OPTIONS.find((r) => r.value === value) || RATIO_OPTIONS[0];

  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger
        className={`bg-muted/50 border-border/80 hover:border-primary/40 flex h-10 min-w-[110px] items-center justify-between gap-2 rounded-xl px-3 text-xs font-medium transition-colors dark:border-white/15 dark:bg-white/[0.05] dark:hover:border-white/30 dark:hover:bg-white/[0.08] ${className}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <RatioIcon ratio={current.value} />
          <span className="text-foreground text-xs font-semibold dark:text-white">
            {current.label}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent className="min-w-[140px] p-1.5">
        {RATIO_OPTIONS.map((r) => (
          <SelectItem key={r.value} value={r.value} className="px-2.5 py-2">
            <div className="flex w-full items-center gap-2.5">
              <RatioIcon ratio={r.value} />
              <span className="text-foreground text-xs font-medium">
                {r.label}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
