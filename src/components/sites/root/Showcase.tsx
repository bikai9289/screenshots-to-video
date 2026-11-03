import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { LazyImage, LazyVideo } from '@/components/lazy';

function TryButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group bg-foreground text-background dark:bg-primary dark:text-primary-foreground relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl"
    >
      <span>{m['landing.showcase.try_free']()}</span>
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

export function Showcase() {
  return (
    <div className="w-full">
      {/* 1. Text to Image */}
      <section className="border-border/60 bg-background border-t px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Sparkles className="size-3.5" />
              <span>Prompt to High-Res Art</span>
            </div>
            <h2 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              {m['landing.showcase.text_to_image.title']()}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
              {m['landing.showcase.text_to_image.desc']()}
            </p>
            <div className="pt-2">
              <TryButton href="/workspace/text-to-image" />
            </div>
          </div>
          <div className="border-border/80 relative aspect-[3/2] w-full overflow-hidden rounded-3xl border bg-black/5 shadow-2xl">
            <LazyVideo
              autoPlay
              loop
              muted
              playsInline
              poster="/oss/display/home/text-to-image-ai-cover.webp"
              className="h-full w-full object-cover"
            >
              <source
                src="/oss/display/home/text-to-image-ai.mp4"
                type="video/mp4"
              />
            </LazyVideo>
          </div>
        </div>
      </section>

      {/* 2. Image to Image */}
      <section className="border-border/60 bg-muted/20 dark:bg-muted/10 border-t px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
              <Sparkles className="size-3.5" />
              <span>Style Transfer & Remix</span>
            </div>
            <h2 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              {m['landing.showcase.image_to_image.title']()}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
              {m['landing.showcase.image_to_image.desc']()}
            </p>
            <div className="pt-2">
              <TryButton href="/workspace/image-to-image" />
            </div>
          </div>
          <div className="relative flex aspect-[3/2] w-full items-center justify-center gap-4">
            <LazyImage
              src="/oss/display/home/image-to-image-ai-1.webp"
              alt="Original photo"
              className="h-full w-full object-cover"
              wrapperClassName="h-full w-1/2 rounded-3xl border border-border/80 shadow-lg overflow-hidden"
            />
            <LazyImage
              src="/oss/display/home/image-to-image-ai-2.webp"
              alt="Transformed photo"
              className="h-full w-full object-cover"
              wrapperClassName="h-full w-1/2 rounded-3xl border border-border/80 shadow-lg overflow-hidden"
            />
          </div>
        </div>
      </section>

      {/* 3. Text to Video */}
      <section className="border-border/60 bg-background border-t px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="size-3.5" />
              <span>Cinematic Video Generation</span>
            </div>
            <h2 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              {m['landing.showcase.text_to_video.title']()}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
              {m['landing.showcase.text_to_video.desc']()}
            </p>
            <div className="pt-2">
              <TryButton href="/workspace/text-to-video" />
            </div>
          </div>
          <div className="border-border/80 relative aspect-[3/2] w-full overflow-hidden rounded-3xl border bg-black/5 shadow-2xl">
            <LazyVideo
              autoPlay
              loop
              muted
              playsInline
              poster="/oss/display/home/text-to-video-ai-cover.webp"
              className="h-full w-full object-cover"
            >
              <source
                src="/oss/display/home/text-to-video-ai.mp4"
                type="video/mp4"
              />
            </LazyVideo>
          </div>
        </div>
      </section>

      {/* 4. Image to Video */}
      <section className="border-border/60 bg-muted/20 dark:bg-muted/10 border-t px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-3.5" />
              <span>Photo Animation & Camera Motion</span>
            </div>
            <h2 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              {m['landing.showcase.image_to_video.title']()}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
              {m['landing.showcase.image_to_video.desc']()}
            </p>
            <div className="pt-2">
              <TryButton href="/workspace/image-to-video" />
            </div>
          </div>
          <div className="border-border/80 relative aspect-[3/2] w-full overflow-hidden rounded-3xl border bg-black/5 shadow-2xl">
            <LazyVideo
              autoPlay
              loop
              muted
              playsInline
              poster="/oss/display/home/text-to-video-ai-cover.webp"
              className="h-full w-full object-cover"
            >
              <source src="/oss/palix-ai.mp4" type="video/mp4" />
            </LazyVideo>
          </div>
        </div>
      </section>
    </div>
  );
}
