'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  placeholderSrc?: string;
  fallbackSrc?: string;
  wrapperClassName?: string;
  effect?: 'blur' | 'opacity' | 'none';
  rootMargin?: string;
}

export function LazyImage({
  src,
  alt = '',
  className = '',
  placeholderSrc,
  fallbackSrc,
  wrapperClassName = '',
  effect = 'opacity',
  rootMargin = '200px',
  style,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  const effectiveSrc = hasError
    ? fallbackSrc || placeholderSrc || src
    : isIntersecting
      ? src
      : placeholderSrc;

  const effectClass =
    effect === 'blur'
      ? `transition-all duration-500 ease-out ${isLoaded ? 'blur-0 opacity-100 scale-100' : 'blur-sm opacity-0 scale-105'}`
      : effect === 'opacity'
        ? `transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-102'}`
        : '';

  return (
    <div
      ref={imgRef as any}
      className={`relative min-h-px overflow-hidden ${wrapperClassName}`}
    >
      {/* Loading Shimmer Placeholder Skeleton */}
      {!isLoaded && !hasError && (
        <div className="lazy-shimmer bg-muted/70 absolute inset-0 z-0 flex items-center justify-center dark:bg-white/[0.06]">
          <ImageIcon className="text-muted-foreground/30 size-6 animate-pulse" />
        </div>
      )}

      {effectiveSrc && (
        <img
          src={effectiveSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={style}
          className={`relative z-1 ${className} ${effectClass}`}
          {...props}
        />
      )}
    </div>
  );
}
