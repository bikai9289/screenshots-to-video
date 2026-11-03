'use client';

import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Clapperboard,
  Image as ImageIcon,
  Play,
  Sparkles,
  Wand2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

interface ShowcasePair {
  title: string;
  titleZh: string;
  prompt: string;
  promptZh: string;
  originalImage: string;
  videoSrc: string;
  type: 'image_to_video' | 'text_to_video';
}

const SHOWCASE_PAIRS: ShowcasePair[] = [
  {
    title: 'Dynamic Product Motion',
    titleZh: '商业产品动态运镜',
    prompt:
      'Smoothly rotate this sneaker, keeping the background static and lighting realistic.',
    promptZh: '平滑 360 度旋转该球鞋，保持背景纯净且光影真实细腻。',
    originalImage:
      'https://img-template-ai-video.16781678.xyz/uploads/video/macpaint.png',
    videoSrc:
      'https://img-template-ai-video.16781678.xyz/uploads/video/macpaint.mp4',
    type: 'image_to_video',
  },
  {
    title: 'Cinematic Atmosphere',
    titleZh: '威尼斯电影级氛围运镜',
    prompt:
      'Sunset over Venetian ruins with a weathered gondolier rowing through quiet waters.',
    promptZh:
      '落日余晖洒在威尼斯水城遗迹上，老船夫摇橹划过静谧的水面，水波粼粼。',
    originalImage:
      'https://img-template-ai-video.16781678.xyz/uploads/video/gondola.jpg',
    videoSrc:
      'https://img-template-ai-video.16781678.xyz/uploads/video/gondola.mp4',
    type: 'image_to_video',
  },
  {
    title: 'Surreal Art Transformation',
    titleZh: '超现实艺术流体演变',
    prompt:
      'Instantly capture the transformation process of the picture into vibrant liquid motion.',
    promptZh: '定格插画演变为绚丽多彩流体动效的奇幻过程。',
    originalImage:
      'https://img-template-ai-video.16781678.xyz/uploads/video/woman-city-doodle.jpg',
    videoSrc:
      'https://img-template-ai-video.16781678.xyz/uploads/video/woman-city-doodle.mp4',
    type: 'image_to_video',
  },
];

export function ShowcaseSection() {
  const [activeTab, setActiveTab] = useState<
    'image_to_video' | 'text_to_video'
  >('image_to_video');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isZh = getLocale() === 'zh';
  const currentItem = SHOWCASE_PAIRS[selectedIndex] || SHOWCASE_PAIRS[0];
  const currentTitle = isZh ? currentItem.titleZh : currentItem.title;
  const currentPrompt = isZh ? currentItem.promptZh : currentItem.prompt;

  return (
    <section className="bg-background relative py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/10 text-primary mb-3.5 px-3 py-1 text-xs font-semibold"
          >
            <Sparkles className="mr-1.5 size-3" />
            <span>{m['app.generator.showcase_badge']()}</span>
          </Badge>
          <h2 className="text-foreground font-serif text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {m['landing.showcase.image_to_video.title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {m['landing.showcase.image_to_video.desc']()}
          </p>
        </div>

        {/* Interactive Comparison Card */}
        <div className="bg-card border-border/80 relative overflow-hidden rounded-3xl border shadow-xl backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Original Still Image */}
            <div className="border-border/60 relative flex flex-col items-center justify-center border-b p-6 sm:p-8 lg:col-span-5 lg:border-r lg:border-b-0">
              <div className="mb-3 flex w-full items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                  <ImageIcon className="size-3.5" />
                  <span>{m['app.generator.original_image']()}</span>
                </span>
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[11px] font-medium">
                  {m['app.generator.input_tag']()}
                </span>
              </div>
              <div className="group border-border/60 bg-muted/30 relative aspect-[4/3] w-full overflow-hidden rounded-2xl border shadow-inner">
                <img
                  src={currentItem.originalImage}
                  alt={currentTitle}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Right: Output Generated Video */}
            <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 lg:col-span-7">
              <div className="mb-3 flex w-full items-center justify-between">
                <span className="text-primary flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                  <Clapperboard className="size-3.5" />
                  <span>{m['app.generator.generated_motion']()}</span>
                </span>
                <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-[11px] font-semibold">
                  {m['app.generator.motion_quality']()}
                </span>
              </div>

              <div className="border-border/60 relative aspect-[16/9] w-full overflow-hidden rounded-2xl border bg-black shadow-lg">
                <video
                  key={currentItem.videoSrc}
                  src={currentItem.videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Prompt & Action Bar */}
              <div className="bg-muted/40 border-border/60 mt-5 flex w-full flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                    {m['app.generator.prompt']()}
                  </span>
                  <p className="text-foreground line-clamp-2 text-xs leading-relaxed font-medium sm:text-sm">
                    "{currentPrompt}"
                  </p>
                </div>

                <Link
                  to="/ai-video-generator"
                  search={{
                    prompt: currentPrompt,
                    startImageUrl: currentItem.originalImage,
                    model: undefined,
                  }}
                  className={buttonVariants({
                    size: 'sm',
                    className:
                      'shrink-0 gap-1.5 rounded-lg text-xs font-semibold',
                  })}
                >
                  <Wand2 className="size-3.5" />
                  <span>{m['app.generator.create_similar']()}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Thumbnails Selection Bar */}
          <div className="border-border/60 bg-muted/20 border-t p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {SHOWCASE_PAIRS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all duration-200',
                    selectedIndex === idx
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  <img
                    src={item.originalImage}
                    alt={isZh ? item.titleZh : item.title}
                    className="size-6 rounded-md object-cover"
                  />
                  <span>{isZh ? item.titleZh : item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
