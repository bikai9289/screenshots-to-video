'use client';

import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { SiteUserMenu } from '@/components/site-user-menu';
import { Logo } from '@/components/sites/root/Logo';
import { ThemeToggle } from '@/components/theme-toggle';

interface CreationHeaderProps {
  onToggleMobileMenu: () => void;
}

export function CreationHeader({ onToggleMobileMenu }: CreationHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const { data: configsData } = usePublicConfig();
  const appName = configsData?.app_name || envConfigs.app_name;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      suppressHydrationWarning
      className="border-border/40 bg-background/80 fixed top-0 right-0 left-0 z-40 flex items-center justify-between border-b px-6 py-3 backdrop-blur-md lg:hidden"
    >
      <Link href="/" className="flex items-center gap-2.5">
        <Logo className="h-8 w-8" />
        <span className="text-foreground text-xl font-bold tracking-tight">
          {appName}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {!mounted ? (
          <div className="h-7 w-12" />
        ) : user ? (
          <SiteUserMenu
            name={user.name || 'User'}
            email={user.email}
            image={user.image}
          />
        ) : (
          <Link
            href={
              pathname
                ? `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
                : '/sign-in'
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-2.5 py-1 text-xs font-bold shadow-xs transition-colors"
          >
            {m['stp.nav.sign_in']()}
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="bg-secondary text-foreground hover:bg-accent inline-flex cursor-pointer items-center justify-center rounded-md p-2 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="size-5" />
        </button>
      </div>
    </header>
  );
}
