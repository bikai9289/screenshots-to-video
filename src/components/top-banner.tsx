'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { locales } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';

function isHomePage(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/') return true;
  return locales.some((locale) => normalized === `/${locale}`);
}

export function TopBanner() {
  const [mounted, setMounted] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { data: config } = usePublicConfig();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMock = config?.mock === '1';
  const isHome = isHomePage(location.pathname);
  const showBanner = mounted && isMock && isHome;

  useEffect(() => {
    const applyHeight = (height: number) => {
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty(
          '--top-banner-height',
          `${height}px`
        );
        document.querySelectorAll<HTMLElement>('header').forEach((header) => {
          if (!header.closest('.stv-site')) header.style.top = `${height}px`;
        });
      }
    };

    if (!showBanner) {
      applyHeight(0);
      return;
    }

    const updateHeight = () => {
      if (bannerRef.current) {
        const bannerHeight = bannerRef.current.offsetHeight;
        applyHeight(bannerHeight);
      }
    };

    updateHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (bannerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(bannerRef.current);
    }

    window.addEventListener('resize', updateHeight);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
      applyHeight(0);
    };
  }, [showBanner, location.pathname]);

  if (!showBanner) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed top-0 right-0 left-0 z-[60] flex items-center justify-center gap-2 border-b border-amber-500/35 bg-[#fff4e8] px-4 py-2 text-center text-xs font-medium text-amber-900 shadow-xs transition-all dark:border-amber-400/35 dark:bg-[#2a211b] dark:text-amber-200"
    >
      <Sparkles className="size-3.5 shrink-0 animate-pulse text-amber-500" />
      <span>{m['stp.common.mock_demo_banner']()}</span>
    </div>
  );
}
