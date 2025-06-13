'use client';

import { cx } from 'class-variance-authority';

import { posterStyles, type PosterVariantProps } from '../Tiles/Poster';

export default function SkeletonPoster({
  className,
  size,
}: Readonly<{ className?: string }> & PosterVariantProps) {
  return (
    <div className={cx(posterStyles({ size }), className, 'bg-white/5')}>
      <div className="relative w-full pt-[150%]">
        <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
    </div>
  );
}
