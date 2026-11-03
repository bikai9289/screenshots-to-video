'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Video } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="hero"
      className="relative flex h-screen min-h-[640px] items-center justify-center overflow-hidden pt-16 pb-8 md:pt-20"
    >
      {/* Background Image with feathered/blurred perimeter (四周发虚) */}
      <div className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden select-none">
        <img
          src="/imgs/bg/girl.jpeg"
          alt="hero background"
          className="h-full w-full [mask-image:radial-gradient(ellipse_90%_80%_at_50%_50%,#000_40%,transparent_100%)] object-cover object-center opacity-75 [-webkit-mask-image:radial-gradient(ellipse_90%_80%_at_50%_50%,#000_40%,transparent_100%)] dark:opacity-50"
        />
        {/* Soft edge blur and fade overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_92%)]" />
        <div className="from-background/50 to-background absolute inset-0 bg-gradient-to-b via-transparent" />
        <div className="from-background/40 to-background/40 absolute inset-0 bg-gradient-to-r via-transparent" />
      </div>

      <div className="relative z-10 container mx-auto max-w-5xl px-4 text-center sm:px-6">
        {/* Main Headline */}
        <h1 className="text-foreground mx-auto mb-6 max-w-4xl font-serif text-4xl leading-[1.15] font-bold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-primary font-bold">Nanobanana Joyflix</span>{' '}
          {m['landing.hero.title_part']()}
        </h1>

        {/* Subtitle Description */}
        <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-base leading-relaxed sm:text-lg md:text-xl">
          {m['landing.hero.description_full']()}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/ai-image-generator"
            className="bg-primary text-primary-foreground shadow-primary/20 inline-flex h-13 min-w-48 items-center justify-center gap-2.5 rounded-2xl px-8 text-base font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="size-4.5" />
            <span>{m['app.generator.start_image']()}</span>
          </Link>

          <Link
            href="/ai-video-generator"
            className="border-border/80 bg-background/90 text-foreground hover:bg-muted/80 inline-flex h-13 min-w-48 items-center justify-center gap-2.5 rounded-2xl border px-8 text-base font-semibold shadow-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <Video className="size-4.5" />
            <span>{m['app.generator.start_video']()}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
