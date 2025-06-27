'use client';

import { motion } from 'motion/react';
import { memo, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import calculateProgress from '@/utils/calculateProgress';
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
  const percentage = useMemo(
    () =>
      numberOfWatched > 0 && numberOfEpisodes > 0
        ? calculateProgress(numberOfWatched, numberOfEpisodes)
        : 0,
    [numberOfEpisodes, numberOfWatched],
  );

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
        {runtime && runtime > 0 ? ` (${formatRuntime(runtime)})` : ''}
      </div>
      {shouldAnimate ? (
        <motion.div
          animate={{ scaleX: percentage / 100 }}
          className="absolute left-0 top-0 h-full w-full origin-left bg-white/15"
          initial={false}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        />
      ) : (
        <div
          className="absolute left-0 top-0 h-full w-full origin-left bg-white/15"
          style={{ transform: `scaleX(${percentage / 100})` }}
        />
      )}
    </div>
  );
}

export default memo(Progress);
