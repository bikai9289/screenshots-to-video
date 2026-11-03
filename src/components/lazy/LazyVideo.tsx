'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Film } from 'lucide-react';

export interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
  className?: string;
  poster?: string;
  rootMargin?: string;
}

export function LazyVideo({
  src,
  className = '',
  poster,
  rootMargin = '250px',
  children,
  autoPlay,
  onLoadedData,
  ...props
}: LazyVideoProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (autoPlay && el.paused) {
            el.play().catch(() => {});
          }
        } else {
          if (autoPlay && !el.paused) {
            el.pause();
          }
        }
      },
      { rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, autoPlay]);

  const handleLoadedData = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    setIsLoaded(true);
    onLoadedData?.(e);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!isLoaded && (
        <div className="lazy-shimmer bg-muted/70 absolute inset-0 z-0 flex items-center justify-center dark:bg-white/[0.06]">
          <Film className="text-muted-foreground/30 size-6 animate-pulse" />
        </div>
      )}
      <video
        ref={videoRef}
        src={isIntersecting ? src : undefined}
        poster={poster}
        preload={isIntersecting ? 'auto' : 'none'}
        autoPlay={autoPlay && isIntersecting}
        onLoadedData={handleLoadedData}
        onLoadedMetadata={(e) => {
          if (!poster) {
            try {
              e.currentTarget.currentTime = 0.1;
            } catch {}
          }
          props.onLoadedMetadata?.(e);
        }}
        suppressHydrationWarning
        className={`relative z-1 transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...props}
      >
        {isIntersecting ? children : null}
      </video>
    </div>
  );
}
