import React from 'react';
import {
  ArrowUpRight,
  Image as ImageIcon,
  Sparkles,
  Video,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { LazyImage } from '@/components/lazy';

export function Features() {
  const features = [
    {
      title: m['landing.features.ai_video.title'](),
      badge: 'Video Studio',
      icon: Video,
      href: '/workspace/ai-video',
      image: '/oss/display/home/ai-video.webp',
      description:
        'Generate high-definition cinematic videos with realistic physics, lighting, and camera motion in seconds.',
    },
    {
      title: m['landing.features.ai_image.title'](),
      badge: 'Image Studio',
      icon: ImageIcon,
      href: '/workspace/ai-image',
      image: '/oss/display/home/ai-image.webp',
      description:
        'Produce photorealistic images, creative concepts, and stunning digital art with state-of-the-art diffusion models.',
    },
  ];

  return (
    <section className="bg-background border-border/60 relative w-full border-t py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <div className="border-border/80 bg-muted/60 text-muted-foreground mb-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Creative AI Suite</span>
          </div>
          <h2 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-5xl">
            {m['landing.features.title']()}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              {m['landing.features.title_suffix']()}
            </span>
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
            {m['landing.features.description']()}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.href}
                href={feat.href}
                className="group border-border/80 bg-card/60 hover:border-primary/50 dark:bg-card/40 relative flex flex-col overflow-hidden rounded-3xl border p-2 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-black/5">
                  <LazyImage
                    src={feat.image}
                    alt={feat.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    wrapperClassName="h-full w-full"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <Icon className="size-3.5" />
                    <span>{feat.badge}</span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="text-foreground text-xl font-bold tracking-tight">
                      {feat.title}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                      {feat.description}
                    </p>
                  </div>

                  <div className="text-primary mt-5 flex items-center gap-1.5 text-xs font-semibold group-hover:underline">
                    <span>Launch studio</span>
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
