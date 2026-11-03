'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { flushSync } from 'react-dom';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsDarkMode(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const changeTheme = async () => {
    if (!buttonRef.current) return;
    const nextTheme = isDarkMode ? 'light' : 'dark';

    if (
      typeof document === 'undefined' ||
      typeof (document as any).startViewTransition !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTheme(nextTheme);
      setIsDarkMode(nextTheme === 'dark');
      return;
    }

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const y = top + height / 2;
    const x = left + width / 2;

    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    const transition = (document as any).startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
        setIsDarkMode(nextTheme === 'dark');
      });
    });

    try {
      await transition.ready;
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRad}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 400,
          easing: 'linear',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    } catch {
      // View transition fallback
    }
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-9', className)}
        aria-label="Toggle theme"
        disabled
      >
        <Moon className="size-4.5 text-slate-700" />
      </Button>
    );
  }

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      onClick={changeTheme}
      className={cn(
        'size-9 cursor-pointer transition-transform duration-200 active:scale-90',
        className
      )}
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="size-4.5 rotate-0 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="size-4.5 rotate-0 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
      )}
    </Button>
  );
}
