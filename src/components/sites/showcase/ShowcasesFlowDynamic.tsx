'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  Play,
  Wand2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export type ShowcaseItem = {
  id: string;
  title: string;
  description?: string | null;
  prompt?: string | null;
  image: string;
  videoUrl?: string | null;
  tags?: string | null;
  model?: string | null;
  type?: string;
  createdAt: string | Date;
};

function ShowcaseImage({
  src,
  alt,
  className,
  placeholderClassName,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'bg-muted flex aspect-[4/3] w-full items-center justify-center',
          placeholderClassName
        )}
      >
        <ImageIcon className="text-muted-foreground size-8 opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

interface ShowcasesFlowDynamicProps {
  id?: string;
  title?: string;
  description?: string;
  className?: string;
  containerClassName?: string;
  tags?: string;
  excludeTags?: string;
  searchTerm?: string;
  hideCreateButton?: boolean;
  sortOrder?: 'asc' | 'desc';
  initialItems?: ShowcaseItem[];
  usePrompts?: boolean;
  type?: string;
}

function getShowcaseModelName(item: ShowcaseItem): string | null {
  if (item.model?.trim()) return item.model.trim();
  if (item.tags) {
    const tags = item.tags
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
    const matched = tags.find((t: string) =>
      [
        'minimax',
        'hailuo',
        'wan',
        'kling',
        'sora',
        'seedance',
        'runway',
        'luma',
        'pika',
        'veo',
        'midjourney',
        'flux',
        'nanobanana',
        'nano banana',
        'stable diffusion',
        'sdxl',
        'dall-e',
        'recraft',
        'ideogram',
      ].some((k) => t.toLowerCase().includes(k))
    );
    if (matched) return matched;
  }
  return null;
}

export function ShowcasesSkeleton({
  count = 8,
  containerClassName,
}: {
  count?: number;
  containerClassName?: string;
}) {
  const aspectRatios = [
    'aspect-[3/4]',
    'aspect-[1/1]',
    'aspect-[4/5]',
    'aspect-[16/9]',
    'aspect-[3/4]',
    'aspect-[4/3]',
    'aspect-[1/1]',
    'aspect-[16/9]',
  ];

  return (
    <div
      className={cn(
        'container mx-auto columns-1 gap-4 space-y-4 px-4 sm:columns-2 lg:columns-3 xl:columns-4',
        containerClassName
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-border/60 bg-card break-inside-avoid overflow-hidden rounded-2xl border shadow-xs"
        >
          <div
            className={cn(
              'bg-muted/30 relative w-full overflow-hidden',
              aspectRatios[i % aspectRatios.length]
            )}
          >
            <Skeleton className="h-full w-full rounded-none" />
            <div className="absolute top-2.5 right-2.5 z-10">
              <Skeleton className="bg-background/50 h-4.5 w-14 rounded-full border border-white/10" />
            </div>
            <div className="from-background/90 via-background/40 absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t to-transparent p-3.5">
              <Skeleton className="bg-background/60 h-4 w-3/4" />
              <Skeleton className="bg-background/50 h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShowcaseCard({
  item,
  index,
  hideCreateButton,
  onClick,
}: {
  item: ShowcaseItem;
  index: number;
  hideCreateButton?: boolean;
  onClick: () => void;
}) {
  const navigate = useNavigate();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const isVideo =
    item.type === 'video' ||
    Boolean(item.videoUrl) ||
    /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(item.image || '');
  const videoSrc =
    item.videoUrl ||
    (isVideo && /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(item.image || '')
      ? item.image
      : null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const modelBadge = getShowcaseModelName(item);

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group border-border/60 bg-card hover:border-primary/50 relative cursor-pointer break-inside-avoid overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl"
    >
      <div
        className={cn(
          'relative w-full overflow-hidden',
          isVideo ? 'aspect-video bg-black/90' : 'aspect-auto'
        )}
      >
        {isVideo && videoSrc ? (
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el) {
                el.muted = true;
                el.volume = 0;
              }
            }}
            src={videoSrc}
            poster={
              item.image && !/\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(item.image)
                ? item.image
                : undefined
            }
            loop
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(event) => {
              try {
                event.currentTarget.currentTime = 0.1;
              } catch {}
            }}
            suppressHydrationWarning
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : item.image ? (
          <ShowcaseImage
            src={item.image}
            alt={item.title || 'Showcase'}
            className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
            placeholderClassName="aspect-video"
          />
        ) : (
          <div className="bg-muted flex aspect-video w-full items-center justify-center">
            <ImageIcon className="text-muted-foreground size-8" />
          </div>
        )}

        {/* 右上角模型药丸（图片与视频统一；若无模型数据则隐藏） */}
        {modelBadge ? (
          <span className="pointer-events-none absolute top-2.5 right-2.5 z-10 rounded-full border border-white/10 bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-xs">
            {modelBadge}
          </span>
        ) : null}

        {/* Gradient overlay */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:p-4">
          <h3 className="line-clamp-2 text-xs font-semibold text-white sm:text-sm">
            {item.title || item.prompt}
          </h3>

          {!hideCreateButton && (
            <div
              className="mt-2.5 sm:mt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetRoute = isVideo
                    ? '/ai-video-generator'
                    : '/ai-image-generator';
                  const promptText =
                    item.prompt || item.description || item.title || '';

                  try {
                    sessionStorage.setItem(
                      'nanobanana_joyflix_pending_generation_draft',
                      JSON.stringify({
                        generationRequested: false,
                        prompt: promptText,
                        modelId: item.model || undefined,
                        mode: isVideo ? 'text-to-video' : 'text-to-image',
                        image: !isVideo ? item.image || undefined : undefined,
                        refImageUrl: !isVideo
                          ? item.image || undefined
                          : undefined,
                        startImageUrl: isVideo
                          ? item.image || undefined
                          : undefined,
                        imagePreview: !isVideo
                          ? item.image || undefined
                          : undefined,
                        createdAt: Date.now(),
                      })
                    );
                  } catch {}

                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                      new CustomEvent('nanobanana_joyflix_select_prompt', {
                        detail: {
                          prompt: promptText,
                          model: item.model,
                          image: !isVideo ? item.image : undefined,
                          startImageUrl: !isVideo ? item.image : undefined,
                        },
                      })
                    );
                  }

                  const currentPath =
                    typeof window !== 'undefined'
                      ? window.location.pathname
                      : '';
                  if (currentPath.includes(targetRoute)) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    void navigate({
                      to: targetRoute as any,
                      search: {} as any,
                    });
                  }
                }}
                className="h-8 w-full cursor-pointer gap-1.5 rounded-lg text-xs font-semibold shadow-sm"
              >
                <Wand2 className="size-3.5" />
                <span>{m['app.generator.create_similar']()}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShowcasesFlowDynamic({
  id,
  title,
  description,
  className,
  containerClassName,
  tags,
  excludeTags,
  searchTerm,
  hideCreateButton = false,
  sortOrder = 'desc',
  initialItems,
  usePrompts = false,
  type,
}: ShowcasesFlowDynamicProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ShowcaseItem[]>(initialItems || []);
  const [loading, setLoading] = useState(
    !initialItems || initialItems.length === 0
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (tags) params.append('tags', tags);
      if (excludeTags) params.append('excludeTags', excludeTags);
      if (searchTerm) params.append('searchTerm', searchTerm);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (type) params.append('type', type);
      if (usePrompts) params.append('usePrompts', 'true');
      params.append('limit', '30');

      const res = await fetch(`/api/showcases/latest?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch showcases');
      const json = await res.json();
      if (json.code === 0 && Array.isArray(json.data)) {
        const filtered = json.data.filter((item: ShowcaseItem) => {
          const url = item.videoUrl || item.image || '';
          return (
            !item.id?.startsWith('mock_') &&
            !url.includes('palix-ai.mp4') &&
            !url.includes('1778247593756-bdtvb0.png')
          );
        });
        setItems(filtered);
      }
    } catch (err) {
      console.error('Fetch showcases error:', err);
    } finally {
      setLoading(false);
    }
  }, [tags, excludeTags, searchTerm, sortOrder, type, usePrompts]);

  useEffect(() => {
    if (!initialItems || initialItems.length === 0) {
      fetchItems();
    }
  }, [fetchItems, initialItems]);

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;

  const handleCopyPrompt = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(m['app.generator.copied']());
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrevious = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! > 0 ? prev! - 1 : items.length - 1));
  }, [selectedIndex, items.length]);

  const handleNext = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! < items.length - 1 ? prev! + 1 : 0));
  }, [selectedIndex, items.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIndex, handlePrevious, handleNext]);

  return (
    <section id={id} className={cn('relative py-12 md:py-16', className)}>
      {(title || description) && (
        <div className="container mx-auto mb-8 px-4 text-center md:mb-12">
          {title && (
            <h2 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl md:text-5xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-muted-foreground mx-auto mt-2.5 max-w-2xl text-sm sm:text-base md:text-lg">
              {description}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <ShowcasesSkeleton containerClassName={containerClassName} />
      ) : items.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          {m['app.generator.no_items']()}
        </div>
      ) : (
        <div
          className={cn(
            'container mx-auto columns-1 gap-4 space-y-4 px-4 sm:columns-2 lg:columns-3 xl:columns-4',
            containerClassName
          )}
        >
          {items.map((item, index) => (
            <ShowcaseCard
              key={item.id || index}
              item={item}
              index={index}
              hideCreateButton={hideCreateButton}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>
      )}

      {/* Lightbox / Video Modal */}
      {selectedItem && mounted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md transition-opacity duration-200 sm:p-6"
          onClick={() => setSelectedIndex(null)}
        >
          <div
            className="bg-card border-border relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border shadow-2xl md:flex-row md:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media Preview Area */}
            <div className="flex flex-1 items-center justify-center bg-black/95 p-2 sm:p-4">
              {selectedItem.videoUrl ? (
                <video
                  src={selectedItem.videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[45vh] w-full object-contain sm:max-h-[60vh] md:max-h-[80vh]"
                />
              ) : selectedItem.image ? (
                <ShowcaseImage
                  src={selectedItem.image}
                  alt={selectedItem.title}
                  className="max-h-[45vh] w-full object-contain sm:max-h-[60vh] md:max-h-[80vh]"
                  placeholderClassName="min-h-[40vh] rounded-xl"
                />
              ) : null}
            </div>

            {/* Sidebar Info */}
            <div className="flex w-full flex-col justify-between p-4 sm:p-6 md:w-80">
              <div>
                <div className="flex items-center justify-between">
                  <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase">
                    {selectedItem.type === 'video'
                      ? m['app.generator.videos']()
                      : m['app.generator.images']()}
                  </span>
                  <button
                    onClick={() => setSelectedIndex(null)}
                    className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <h3 className="text-foreground mt-3 text-base font-bold sm:mt-4 sm:text-lg">
                  {selectedItem.title}
                </h3>

                {selectedItem.prompt && (
                  <div className="bg-muted/50 border-border/60 mt-3 rounded-xl border p-3">
                    <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs font-medium">
                      <span>{m['app.generator.prompt']()}</span>
                      <button
                        onClick={() =>
                          handleCopyPrompt(selectedItem.prompt || '')
                        }
                        className="hover:text-foreground flex items-center gap-1 text-xs"
                      >
                        {copied ? (
                          <Check className="size-3 text-green-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        {copied
                          ? m['app.generator.copied']()
                          : m['app.generator.copy_prompt']()}
                      </button>
                    </div>
                    <p className="text-foreground line-clamp-6 text-xs leading-relaxed">
                      {selectedItem.prompt}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:gap-2.5">
                <Button
                  type="button"
                  className="w-full cursor-pointer gap-2"
                  onClick={() => {
                    const isVideo =
                      selectedItem.type === 'video' ||
                      Boolean(selectedItem.videoUrl);
                    const targetRoute = isVideo
                      ? '/ai-video-generator'
                      : '/ai-image-generator';
                    const promptText =
                      selectedItem.prompt ||
                      selectedItem.description ||
                      selectedItem.title ||
                      '';

                    try {
                      sessionStorage.setItem(
                        'nanobanana_joyflix_pending_generation_draft',
                        JSON.stringify({
                          generationRequested: false,
                          prompt: promptText,
                          modelId: selectedItem.model || undefined,
                          mode: isVideo ? 'text-to-video' : 'text-to-image',
                          image: !isVideo
                            ? selectedItem.image || undefined
                            : undefined,
                          refImageUrl: !isVideo
                            ? selectedItem.image || undefined
                            : undefined,
                          startImageUrl: isVideo
                            ? selectedItem.image || undefined
                            : undefined,
                          imagePreview: !isVideo
                            ? selectedItem.image || undefined
                            : undefined,
                          createdAt: Date.now(),
                        })
                      );
                    } catch {}

                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('nanobanana_joyflix_select_prompt', {
                          detail: {
                            prompt: promptText,
                            model: selectedItem.model,
                            image: !isVideo ? selectedItem.image : undefined,
                            startImageUrl: !isVideo
                              ? selectedItem.image
                              : undefined,
                          },
                        })
                      );
                    }

                    setSelectedIndex(null);

                    const currentPath =
                      typeof window !== 'undefined'
                        ? window.location.pathname
                        : '';
                    if (currentPath.includes(targetRoute)) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      void navigate({
                        to: targetRoute as any,
                        search: {} as any,
                      });
                    }
                  }}
                >
                  <Wand2 className="size-4" />
                  <span>{m['app.generator.create_similar']()}</span>
                </Button>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    className="gap-1 text-xs"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>{m['app.generator.prev']()}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    className="gap-1 text-xs"
                  >
                    <span>{m['app.generator.next']()}</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
