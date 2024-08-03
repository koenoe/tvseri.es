'use client';

import { cx } from 'class-variance-authority';

import { posterStyles } from '../Tiles/Poster';

export default function SkeletonPoster() {
  return (
    <div className={cx(posterStyles(), 'bg-white/5')}>
      <div className="absolute inset-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}
