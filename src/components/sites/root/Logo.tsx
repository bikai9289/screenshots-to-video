import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = 'size-8', size = 32 }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Nanobanana Joyflix"
      width={size}
      height={size}
      className={`rounded-lg object-contain ${className}`}
    />
  );
}
