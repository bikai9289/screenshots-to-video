'use client';

import React from 'react';

import { m } from '@/paraglide/messages.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import { ModelConfig } from './models';

interface ModelSelectProps {
  models: ModelConfig[];
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

export function ModelSelect({
  models,
  value,
  onChange,
  className = '',
}: ModelSelectProps) {
  const current = models.find((mItem) => mItem.id === value) || models[0];

  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger
        className={`bg-muted/50 border-border/80 hover:border-primary/40 flex h-10 min-w-[130px] items-center justify-between gap-2 rounded-xl px-3 text-xs font-medium transition-colors sm:min-w-[180px] dark:border-white/15 dark:bg-white/[0.05] dark:hover:border-white/30 dark:hover:bg-white/[0.08] ${className}`}
      >
        {current ? (
          <div className="flex min-w-0 items-center gap-2">
            {current.icon && (
              <img
                src={current.icon}
                alt=""
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            )}
            <span className="text-foreground truncate text-xs font-semibold">
              {current.name}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">
            {m['stp.common.select_model']()}
          </span>
        )}
      </SelectTrigger>
      <SelectContent className="max-h-80 min-w-[280px] p-1.5">
        {models.map((mItem) => (
          <SelectItem
            key={mItem.id}
            value={mItem.id}
            className="px-2.5 py-2.5 pr-9"
          >
            <div className="flex w-full items-center gap-2.5">
              {mItem.icon && (
                <img
                  src={mItem.icon}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded-full object-cover"
                />
              )}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground text-xs font-semibold">
                    {mItem.name}
                  </span>
                  {mItem.badge && (
                    <span className="py-0.2 rounded border border-blue-500/30 bg-blue-500/10 px-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                      {mItem.badge}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-muted-foreground ml-auto shrink-0 pl-3 font-mono text-[11px]">
                {mItem.credits} cr
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
