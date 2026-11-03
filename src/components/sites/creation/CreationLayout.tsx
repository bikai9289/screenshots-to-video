'use client';

import React, { useEffect, useRef, useState } from 'react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { SiteUserMenu } from '@/components/site-user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

import { CreationSidebar } from './CreationSidebar';

interface CreationLayoutProps {
  children: React.ReactNode;
}

export function CreationLayout({ children }: CreationLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 路由切换时自动重置滚动条至页面顶部（若是生成意图则交由生成控制器自动定位至近期创作）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const isGenerateIntent =
        search.includes('intent=generate') ||
        search.includes('auto=1') ||
        search.includes('autoGenerate=true') ||
        window.location.hash === '#recent-creations';
      if (isGenerateIntent) {
        return;
      }
    }
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <SidebarProvider
      className="h-dvh min-h-0 overflow-hidden"
      suppressHydrationWarning
    >
      <CreationSidebar />
      <SidebarInset className="workspace-studio-bg flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
        <header
          className="border-border/40 bg-background/60 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur-xl sm:px-6 dark:bg-black/20"
          suppressHydrationWarning
        >
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="flex items-center gap-2" suppressHydrationWarning>
            <ThemeToggle />
            {mounted && user && (
              <SiteUserMenu
                name={user.name || 'User'}
                email={user.email}
                image={user.image}
              />
            )}
            {mounted && !user && (
              <Link
                href={
                  pathname
                    ? `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
                    : '/sign-in'
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              >
                {m['stp.nav.sign_in']()}
              </Link>
            )}
          </div>
        </header>
        <div ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
