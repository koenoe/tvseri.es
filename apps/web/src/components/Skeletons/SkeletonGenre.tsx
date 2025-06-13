'use client';

import { cx } from 'class-variance-authority';

import { genreStyles } from '../Tiles/Genre';

export default function SkeletonGenre() {
  return (
    <div className="flex flex-col gap-4">
      <div className={cx(genreStyles(), 'bg-white/5')}>
        <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
      <div className={cx(genreStyles(), 'bg-white/5')}>
        <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
    </div>
  );
}
