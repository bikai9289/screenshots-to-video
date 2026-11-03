'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Coins,
  LogOutIcon,
  SettingsIcon,
  ShieldIcon,
  Sparkles,
} from 'lucide-react';

import { signOut } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { clearLocalCreations } from '@/modules/creations/store';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * 顶部导航栏用户头像下拉菜单
 * 包含当前用户点数余额、管理后台入口（管理员专属）、设置以及退出登录
 */
export function SiteUserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image?: string | null;
}) {
  const router = useRouter();
  const { data } = useUserPermissions();
  const isAdmin = data?.isAdmin === true;

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2">
        <Avatar className="size-9">
          <AvatarImage src={image || undefined} alt={name} />
          <AvatarFallback className="text-xs">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56" align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8">
                <AvatarImage src={image || undefined} alt={name} />
                <AvatarFallback className="text-xs">
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
        <DropdownMenuItem render={<Link href="/settings/creations" />}>
          <Sparkles className="size-4" />
          {m['settings.nav.creations']()}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <SettingsIcon className="size-4" />
          {m['common.nav.settings']()}
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <ShieldIcon className="size-4" />
            {m['common.systems.admin']()}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon className="size-4" />
          {m['common.sign.sign_out_title']()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
