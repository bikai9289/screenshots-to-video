'use client';

import React, { useEffect, useRef, useState } from 'react';

let activeAudio: HTMLAudioElement | null = null;

export interface LazyAudioProps extends React.AudioHTMLAttributes<HTMLAudioElement> {
  src?: string;
  className?: string;
  rootMargin?: string;
}

export function LazyAudio({
  src,
  className = '',
  rootMargin = '250px',
  controls = true,
  onPlay,
  children,
  ...props
}: LazyAudioProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
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

  useEffect(() => {
    return () => {
      if (activeAudio === audioRef.current) activeAudio = null;
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      src={isIntersecting ? src : undefined}
      preload={isIntersecting ? 'metadata' : 'none'}
      controls={controls}
      onPlay={(event) => {
        if (activeAudio && activeAudio !== event.currentTarget) {
          activeAudio.pause();
        }
        activeAudio = event.currentTarget;
        onPlay?.(event);
      }}
      className={className}
      {...props}
    >
      {isIntersecting ? children : null}
    </audio>
  );
}
