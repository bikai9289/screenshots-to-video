'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Film,
  Home,
  Image as ImageIcon,
  Images,
  Scissors,
  Sparkles,
  Video,
} from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { useAppName } from '@/hooks/use-public-config';
import { Logo } from '@/components/sites/root/Logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { UserMenu } from '@/components/user-menu';

export function CreationSidebar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isMobile, setOpenMobile } = useSidebar();
  const user = session?.user;
  const appName = useAppName();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    if (path === '/workspace') {
      return pathname === '/workspace';
    }
    return pathname === path || pathname.startsWith(path + '/');
  };
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/"
              onClick={closeMobile}
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm"
            >
              <Logo className="size-6 shrink-0" />
              <span className="flex-1 font-serif text-lg leading-none font-bold italic">
                {appName}
              </span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Workspace Home */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/workspace" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.workspace']()}
                  isActive={isActive('/workspace')}
                >
                  <Home />
                  <span>{m['stp.nav.workspace']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Creation Studios */}
        <SidebarGroup>
          <SidebarGroupLabel>{m['stp.nav.creation']()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/workspace/ai-video" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.ai_video']()}
                  isActive={isActive('/workspace/ai-video')}
                >
                  <Film />
                  <span>{m['stp.nav.ai_video']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/workspace/ai-image" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.ai_image']()}
                  isActive={isActive('/workspace/ai-image')}
                >
                  <ImageIcon />
                  <span>{m['stp.nav.ai_image']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Features / Quick Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>{m['stp.nav.features']()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/workspace/text-to-video" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.text_to_video']()}
                  isActive={isActive('/workspace/text-to-video')}
                >
                  <Video />
                  <span>{m['stp.nav.text_to_video']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/workspace/image-to-video" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.image_to_video']()}
                  isActive={isActive('/workspace/image-to-video')}
                >
                  <Sparkles />
                  <span>{m['stp.nav.image_to_video']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/workspace/text-to-image" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.text_to_image']()}
                  isActive={isActive('/workspace/text-to-image')}
                >
                  <ImageIcon />
                  <span>{m['stp.nav.text_to_image']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/workspace/image-to-image" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.image_to_image']()}
                  isActive={isActive('/workspace/image-to-image')}
                >
                  <Images />
                  <span>{m['stp.nav.image_to_image']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/workspace/png-maker" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.png_maker']()}
                  isActive={isActive('/workspace/png-maker')}
                >
                  <Scissors />
                  <span>{m['stp.nav.png_maker']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pricing */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/pricing" />}
                  onClick={closeMobile}
                  tooltip={m['stp.nav.pricing']()}
                  isActive={pathname === '/pricing'}
                >
                  <CreditCard />
                  <span>{m['stp.nav.pricing']()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!mounted ? (
          <div className="h-10 w-full" />
        ) : user ? (
          <UserMenu
            name={user.name || 'User'}
            email={user.email}
            image={user.image}
            profileHref="/settings"
          />
        ) : (
          <Link
            href={
              pathname
                ? `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
                : '/sign-in'
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold transition-colors"
          >
            {m['stp.nav.sign_in']()}
          </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
