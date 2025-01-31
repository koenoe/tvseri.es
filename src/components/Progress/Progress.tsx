'use client';

import { memo } from 'react';

import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

import formatRuntime from '@/utils/formatRuntime';

function Progress({
  className,
  shouldAnimate = true,
  numberOfEpisodes,
  numberOfWatched,
  runtime,
}: Readonly<{
  className?: string;
  shouldAnimate?: boolean;
  numberOfEpisodes: number;
  numberOfWatched: number;
  runtime?: number;
}>) {
  const percentage =
    numberOfWatched > 0 && numberOfEpisodes > 0
      ? (() => {
          const raw = (numberOfWatched / numberOfEpisodes) * 100;
          const rounded = Math.round(raw);
          return rounded === 0 && raw > 0 ? 1 : rounded;
        })()
      : 0;

  return (
    <div
      className={twMerge(
        'relative flex h-9 w-full items-center gap-x-1 overflow-hidden whitespace-nowrap rounded-3xl bg-white/5 px-6 tracking-wide backdrop-blur md:gap-x-2',
        className,
      )}
    >
      <div className="text-xs font-medium">{percentage}% watched</div>
      <div className="text-nowrap text-[0.7rem] opacity-80 before:mr-1 before:content-['–'] md:before:mr-2">
        {numberOfWatched}/{numberOfEpisodes} episodes
        {runtime && runtime > 0 && ` (${formatRuntime(runtime)})`}
      </div>
      {shouldAnimate ? (
        <motion.div
          initial={false}
          animate={{ scaleX: percentage / 100 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="absolute left-0 top-0 h-full w-full origin-left bg-white/15"
        />
      ) : (
        <div
          style={{ transform: `scaleX(${percentage / 100})` }}
          className="absolute left-0 top-0 h-full w-full origin-left bg-white/15"
        />
      )}
    </div>
  );
}

export default memo(Progress);
