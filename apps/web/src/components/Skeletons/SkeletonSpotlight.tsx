'use client';

import { cx } from 'class-variance-authority';

import { carouselStyles } from '../Carousel/Carousel';

export default function SkeletonSpotlight({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div className={cx('container relative', className)}>
      <div className={cx(carouselStyles(), 'bg-white/5')}>
        <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
      <div className="mt-6 flex w-full items-center justify-center gap-2.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={'size-2.5 cursor-pointer rounded-full bg-white/10'}
          />
        ))}
      </div>
    </div>
  );
}
