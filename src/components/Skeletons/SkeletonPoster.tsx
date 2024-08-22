'use client';

import { cx } from 'class-variance-authority';

import { posterStyles } from '../Tiles/Poster';

export default function SkeletonPoster({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <div className={cx(posterStyles(), className, 'bg-white/5')}>
      <div className="relative w-full pt-[150%]">
        <div className="absolute inset-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
    </div>
  );
}
