'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { CreationItem } from '@/modules/creations/store';
import { m } from '@/paraglide/messages.js';
import { DownloadButton } from '@/components/download-button';

export interface RecentCreationsLightboxProps {
  item: CreationItem | null;
  onClose: () => void;
  /** Render in place (needed inside Dialog to avoid inert/pointer-event traps). */
  disablePortal?: boolean;
}

export function RecentCreationsLightbox({
  item,
  onClose,
  disablePortal = false,
}: RecentCreationsLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [item, onClose]);

  if (!item || !mounted || typeof document === 'undefined') return null;

  const isVideo =
    item.mediaType === 'video' ||
    /\.(mp4|webm|mov|mkv|avi)($|\?)/i.test(item.url);

  const content = (
    <div
      className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl cursor-default overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={item.url}
            controls
            autoPlay
            playsInline
            {...{ referrerPolicy: 'no-referrer' }}
            className="h-full max-h-[85vh] w-full object-contain"
          />
        ) : (
          <img
            src={item.url}
            alt={item.prompt}
            referrerPolicy="no-referrer"
            className="h-full max-h-[85vh] w-full object-contain"
          />
        )}
        {item.prompt && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 text-white">
            <p className="max-h-32 max-w-3xl overflow-y-auto pr-2 text-xs leading-relaxed font-medium sm:max-h-40 sm:text-sm">
              {item.prompt}
            </p>
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <DownloadButton
            item={item}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80"
            iconClassName="size-4 text-white"
            title={m['stp.workspace.download']()}
          />
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (disablePortal) return content;
  return createPortal(content, document.body);
}
