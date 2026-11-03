import { useQuery } from '@tanstack/react-query';
import {
  CheckIcon,
  Coins,
  EllipsisVerticalIcon,
  LanguagesIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SunIcon,
  UserIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { signOut } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { localeNames } from '@/config/locale';
import { clearLocalCreations } from '@/modules/creations/store';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import {
  getLocale,
  locales,
  localizeHref,
  setLocale,
} from '@/paraglide/runtime.js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useOptionalSidebar,
} from '@/components/ui/sidebar';

/**
 * 全局通用侧边栏/底部用户菜单组件
 * 适用于 AppSidebar 与 CreationSidebar，集合用户信息、点数余额、设置、多语言选择、主题切换与安全登出
 */
export function UserMenu({
  name,
  email,
  image,
  profileHref,
  side,
  sideOffset = 4,
  className,
}: {
  name: string;
  email: string;
  image?: string | null;
  profileHref?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  className?: string;
}) {
  const router = useRouter();
  const locale = getLocale();
  const { theme, setTheme } = useTheme();
  const sidebar = useOptionalSidebar();
  const isMobile = sidebar?.isMobile ?? false;

  const { data: creditsData } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => apiGet<{ balance: number }>('/api/credits?summary=1'),
  });
  const balance = creditsData?.balance;

  async function handleSignOut() {
    clearLocalCreations();
    await signOut();
    window.location.href = '/';
  }

  function handleLocaleSwitch(newLocale: string) {
    // Writes the locale cookie and reloads on the localized URL.
    setLocale(newLocale as typeof locale);
  }

  const dropdownTrigger = (
    <div
      className={cn(
        'hover:bg-muted/80 hover:text-foreground flex h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl p-2 text-left text-sm transition-colors',
        className
      )}
    >
      <Avatar className="size-8 rounded-lg">
        <AvatarImage src={image || undefined} alt={name} />
        <AvatarFallback className="rounded-lg text-xs font-semibold">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{name}</span>
        <span className="text-muted-foreground truncate text-xs">{email}</span>
      </div>
      <EllipsisVerticalIcon className="text-muted-foreground ml-auto size-4 shrink-0" />
    </div>
  );

  const menuContent = (
    <DropdownMenu>
      <DropdownMenuTrigger className="ring-sidebar-ring w-full rounded-xl outline-none focus-visible:ring-2 [&>div]:w-full">
        {dropdownTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56"
        side={side ?? (isMobile ? 'bottom' : 'right')}
        align="end"
        sideOffset={sideOffset}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8">
                <AvatarImage src={image || undefined} alt={name} />
                <AvatarFallback className="rounded-lg text-xs">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings/credits" />}>
          <Coins className="size-4 shrink-0 text-amber-500" />
          <span className="min-w-0 flex-1 truncate">
            {m['settings.nav.credits']()}
          </span>
          <span
            className="text-muted-foreground ml-2 max-w-[120px] truncate font-mono text-xs font-semibold"
            title={balance !== undefined ? balance.toLocaleString() : undefined}
          >
            {balance !== undefined ? balance.toLocaleString() : '...'}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <UserIcon className="size-4" />
          {m['common.nav.settings']()}
        </DropdownMenuItem>
        {profileHref && (
          <DropdownMenuItem
            onClick={() => {
              window.open(localizeHref(profileHref), '_blank');
            }}
          >
            <UserIcon className="size-4" />
            {m['common.nav.profile']()}
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 px-2 py-2">
            <LanguagesIcon className="size-4" />
            <span className="flex-1">{localeNames[locale] || locale}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {locales.map((loc) => (
              <DropdownMenuItem
                key={loc}
                onClick={() => handleLocaleSwitch(loc)}
              >
                <span className="flex-1">{localeNames[loc] || loc}</span>
                {loc === locale && <CheckIcon className="size-3.5" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 px-2 py-2">
            <PaletteIcon className="size-4" />
            <span className="flex-1">
              {theme === 'dark'
                ? m['common.nav.theme_dark']()
                : theme === 'light'
                  ? m['common.nav.theme_light']()
                  : m['common.nav.theme_system']()}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <SunIcon className="size-4" />
              <span className="flex-1">{m['common.nav.theme_light']()}</span>
              {theme === 'light' && <CheckIcon className="size-3.5" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <MoonIcon className="size-4" />
              <span className="flex-1">{m['common.nav.theme_dark']()}</span>
              {theme === 'dark' && <CheckIcon className="size-3.5" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <MonitorIcon className="size-4" />
              <span className="flex-1">{m['common.nav.theme_system']()}</span>
              {theme === 'system' && <CheckIcon className="size-3.5" />}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon className="size-4" />
          {m['common.sign.sign_out_title']()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (sidebar) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>{menuContent}</SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return menuContent;
}
