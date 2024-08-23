'use client';

import { cx } from 'class-variance-authority';

import { avatarsStyles, avatarStyles } from '../Avatars/Avatars';

export default function SkeletonAvatars({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div className={cx(avatarsStyles(), className)}>
      {[...Array(10)].map((_, index) => (
        <div key={index} className={avatarStyles()}>
          <div className="relative aspect-square h-auto w-full overflow-hidden rounded-full bg-white/10 lg:h-24">
            <div className="absolute inset-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
          <div className="mt-2 flex flex-col items-center gap-1 lg:hidden">
            <div className="h-4 w-10/12 bg-white/20" />
            <div className="h-4 w-8/12 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
