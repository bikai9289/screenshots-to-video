'use client';

import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  Clapperboard,
  Image as ImageIcon,
  Menu,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { useAppName } from '@/hooks/use-public-config';
import { LocaleSelector } from '@/components/locale-selector';
import { SiteUserMenu } from '@/components/site-user-menu';
import { Logo } from '@/components/sites/root/Logo';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * 全站前台顶部导航栏
 * 包含 Screenshots to Video Logo 与名称、创作 (AI图像/AI视频)、提示词库 (图像/视频)、作品展厅 (图像/视频)、定价方案、多语言选择、主题切换与用户登录态
 */
export function Header() {
  const [mounted, setMounted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [showcasesOpen, setShowcasesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const signInHref =
    pathname && pathname !== '/sign-in' && pathname !== '/sign-up'
      ? `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
      : '/sign-in';

  // 挂载守卫：保证 SSR 与客户端初次水合 DOM 结构一致
  useEffect(() => {
    setMounted(true);
  }, []);

  // 锁定移动端菜单打开时的页面滚动
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const appName = useAppName() || 'Screenshots to Video';

  return (
    <header
      suppressHydrationWarning
      style={{ top: 'var(--top-banner-height, 0px)' }}
      className={`fixed right-0 left-0 z-50 transition-[top] duration-200 ${
        mobileMenuOpen
          ? 'bg-background inset-0 flex flex-col overflow-hidden dark:bg-[#0d0f14]'
          : 'bg-background/70 border-border/40 flex h-[65px] items-center border-b backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto flex h-[65px] w-full max-w-7xl shrink-0 items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 transition-transform hover:scale-102"
          onClick={() => setMobileMenuOpen(false)}
        >
          <Logo className="size-7 shrink-0 rounded-lg sm:size-8" size={32} />
          <span className="text-foreground text-sm font-extrabold tracking-tight whitespace-nowrap sm:text-lg md:text-xl">
            {appName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-7 lg:flex xl:gap-8">
          {/* 创作 (Create) Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setCreateOpen(true)}
            onMouseLeave={() => setCreateOpen(false)}
          >
            <button
              type="button"
              className="text-foreground/90 hover:text-primary flex cursor-pointer items-center gap-1.5 py-2 text-sm font-semibold transition-colors"
            >
              <Sparkles className="text-primary size-4" />
              <span>{mounted ? m['landing.nav.create']() : 'Create'}</span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${createOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {createOpen && (
              <div className="bg-popover/95 text-popover-foreground border-border/80 animate-in fade-in slide-in-from-top-1 absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl duration-150">
                <Link
                  href="/ai-image-generator"
                  className="text-foreground hover:bg-muted/80 hover:text-primary flex items-start gap-3 rounded-xl p-2.5 transition-colors"
                >
                  <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      {mounted
                        ? m['landing.nav.create_ai_image']()
                        : 'AI Image'}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                      {mounted
                        ? m['landing.nav.create_ai_image_desc']()
                        : 'Text to image, image editing'}
                    </div>
                  </div>
                </Link>
                <Link
                  href="/ai-video-generator"
                  onClick={() => {
                    sessionStorage.removeItem(
                      'nanobanana_joyflix_pending_generation_draft'
                    );
                    window.dispatchEvent(
                      new Event('nanobanana_joyflix_reset_video_generator')
                    );
                  }}
                  className="text-foreground hover:bg-muted/80 hover:text-primary flex items-start gap-3 rounded-xl p-2.5 transition-colors"
                >
                  <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Clapperboard className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      {mounted
                        ? m['landing.nav.create_ai_video']()
                        : 'AI Video'}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                      {mounted
                        ? m['landing.nav.create_ai_video_desc']()
                        : 'Text to video, image to video'}
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 提示词库 (Prompt Library) Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setPromptsOpen(true)}
            onMouseLeave={() => setPromptsOpen(false)}
          >
            <button
              type="button"
              className="text-foreground/90 hover:text-primary flex cursor-pointer items-center gap-1.5 py-2 text-sm font-semibold transition-colors"
            >
              <Wand2 className="text-primary size-4" />
              <span>
                {mounted ? m['landing.nav.prompts']() : 'Prompt Library'}
              </span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${promptsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {promptsOpen && (
              <div className="bg-popover/95 text-popover-foreground border-border/80 animate-in fade-in slide-in-from-top-1 absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl duration-150">
                <Link
                  href="/prompts?type=image"
                  className="text-foreground hover:bg-muted/80 hover:text-primary flex items-start gap-3 rounded-xl p-2.5 transition-colors"
                >
                  <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      {mounted
                        ? m['landing.nav.prompts_image']()
                        : 'AI Image Prompts'}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                      {mounted
                        ? m['landing.nav.prompts_image_desc']()
                        : 'Inspiring text to image prompts'}
                    </div>
                  </div>
                </Link>
                <Link
                  href="/prompts?type=video"
                  className="text-foreground hover:bg-muted/80 hover:text-primary flex items-start gap-3 rounded-xl p-2.5 transition-colors"
                >
                  <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Clapperboard className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      {mounted
                        ? m['landing.nav.prompts_video']()
                        : 'AI Video Prompts'}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                      {mounted
                        ? m['landing.nav.prompts_video_desc']()
                        : 'Creative text to video prompts'}
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 作品展厅 (Showcases) Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setShowcasesOpen(true)}
            onMouseLeave={() => setShowcasesOpen(false)}
          >
            <button
              type="button"
              className="text-foreground/90 hover:text-primary flex cursor-pointer items-center gap-1.5 py-2 text-sm font-semibold transition-colors"
            >
              <ImageIcon className="text-primary size-4" />
              <span>
                {mounted ? m['landing.nav.showcases']() : 'Showcases'}
              </span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${showcasesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {showcasesOpen && (
              <div className="bg-popover/95 text-popover-foreground border-border/80 animate-in fade-in slide-in-from-top-1 absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl duration-150">
                <Link
                  href="/showcases?type=image"
                  className="text-foreground hover:bg-muted/80 hover:text-primary flex items-start gap-3 rounded-xl p-2.5 transition-colors"
                >
                  <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      {mounted
                        ? m['landing.nav.showcases_image']()
                        : 'AI Image Showcases'}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                      {mounted
                        ? m['landing.nav.showcases_image_desc']()
                        : 'Excellent AI image generations'}
                    </div>
                  </div>
                </Link>
                <Link
                  href="/showcases?type=video"
                  className="text-foreground hover:bg-muted/80 hover:text-primary flex items-start gap-3 rounded-xl p-2.5 transition-colors"
                >
                  <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Clapperboard className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      {mounted
                        ? m['landing.nav.showcases_video']()
                        : 'AI Video Showcases'}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                      {mounted
                        ? m['landing.nav.showcases_video_desc']()
                        : 'Stunning AI video generations'}
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 定价方案 (Pricing) */}
          <Link
            href="/pricing"
            className="text-foreground/90 hover:text-primary text-sm font-semibold transition-colors"
          >
            {mounted ? m['landing.nav.pricing']() : 'Pricing'}
          </Link>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden items-center gap-1.5 sm:gap-3 lg:flex">
            <LocaleSelector />
            <ThemeToggle />
            {!mounted ? (
              <div className="h-8 w-20" />
            ) : user ? (
              <SiteUserMenu
                name={user.name || 'User'}
                email={user.email}
                image={user.image}
              />
            ) : (
              <Link
                href={signInHref}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all hover:scale-102"
              >
                {m['stp.nav.sign_in']()}
              </Link>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-foreground hover:text-primary cursor-pointer p-2 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
          <div className="text-foreground flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {/* 创作 */}
            <div className="border-border/60 space-y-2 border-b py-2">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                <Sparkles className="text-primary size-3.5" />
                {mounted ? m['landing.nav.create']() : 'Create'}
              </span>
              <div className="flex flex-col gap-2 pl-3">
                <Link
                  href="/ai-image-generator"
                  className="text-foreground/80 hover:text-primary text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {mounted ? m['landing.nav.create_ai_image']() : 'AI Image'}
                </Link>
                <Link
                  href="/ai-video-generator"
                  onClick={() => {
                    sessionStorage.removeItem(
                      'nanobanana_joyflix_pending_generation_draft'
                    );
                    window.dispatchEvent(
                      new Event('nanobanana_joyflix_reset_video_generator')
                    );
                    setMobileMenuOpen(false);
                  }}
                  className="text-foreground/80 hover:text-primary text-sm font-medium"
                >
                  {mounted ? m['landing.nav.create_ai_video']() : 'AI Video'}
                </Link>
              </div>
            </div>

            {/* 提示词库 */}
            <div className="border-border/60 space-y-2 border-b py-2">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                <Wand2 className="text-primary size-3.5" />
                {mounted ? m['landing.nav.prompts']() : 'Prompt Library'}
              </span>
              <div className="flex flex-col gap-2 pl-3">
                <Link
                  href="/prompts?type=image"
                  className="text-foreground/80 hover:text-primary text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {mounted
                    ? m['landing.nav.prompts_image']()
                    : 'AI Image Prompts'}
                </Link>
                <Link
                  href="/prompts?type=video"
                  className="text-foreground/80 hover:text-primary text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {mounted
                    ? m['landing.nav.prompts_video']()
                    : 'AI Video Prompts'}
                </Link>
              </div>
            </div>

            {/* 作品展厅 */}
            <div className="border-border/60 space-y-2 border-b py-2">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                <ImageIcon className="text-primary size-3.5" />
                {mounted ? m['landing.nav.showcases']() : 'Showcases'}
              </span>
              <div className="flex flex-col gap-2 pl-3">
                <Link
                  href="/showcases?type=image"
                  className="text-foreground/80 hover:text-primary text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {mounted
                    ? m['landing.nav.showcases_image']()
                    : 'AI Image Showcases'}
                </Link>
                <Link
                  href="/showcases?type=video"
                  className="text-foreground/80 hover:text-primary text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {mounted
                    ? m['landing.nav.showcases_video']()
                    : 'AI Video Showcases'}
                </Link>
              </div>
            </div>

            {/* 定价方案 */}
            <Link
              href="/pricing"
              className="text-foreground border-border/60 border-b py-3 text-base font-bold"
              onClick={() => setMobileMenuOpen(false)}
            >
              {mounted ? m['landing.nav.pricing']() : 'Pricing'}
            </Link>
          </div>

          <div className="border-border/60 bg-background/95 shrink-0 border-t px-6 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] backdrop-blur-md dark:bg-[#0d0f14]/95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LocaleSelector />
                <ThemeToggle />
              </div>
              {!mounted ? (
                <div className="h-8 w-20" />
              ) : user ? (
                <SiteUserMenu
                  name={user.name || 'User'}
                  email={user.email}
                  image={user.image}
                />
              ) : (
                <Link
                  href={signInHref}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold shadow-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {m['stp.nav.sign_in']()}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
