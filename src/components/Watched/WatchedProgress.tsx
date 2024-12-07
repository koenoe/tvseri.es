'use client';

import { type TvSeries } from '@/types/tv-series';
import formatRuntime from '@/utils/formatRuntime';
import { useWatchedStore } from './WatchedStoreProvider';
import { motion } from 'framer-motion';

export default function WatchedProgress({
  tvSeries,
}: Readonly<{
  tvSeries: TvSeries;
}>) {
  const totalRuntime = useWatchedStore(
    (store) => store.getWatchedProgress(tvSeries.id).totalRuntime,
  );
  const numberOfWatched = useWatchedStore(
    (store) => store.getWatchedProgress(tvSeries.id).numberOfWatched,
  );
  const progress = useWatchedStore(
    (store) => store.getWatchedProgress(tvSeries.id).progress,
  );

  return (
    <div className="relative my-6 flex h-9 w-full items-center gap-x-2 overflow-hidden whitespace-nowrap rounded-3xl bg-white/5 px-6 tracking-wide backdrop-blur lg:w-9/12">
      <div className="text-xs font-medium">{progress}% watched</div>
      <div className="text-[0.7rem] opacity-80 before:mr-2 before:content-['–']">
        {numberOfWatched}/{tvSeries.numberOfEpisodes} episodes{' '}
        {totalRuntime > 0 && `(${formatRuntime(totalRuntime)})`}
      </div>
      <motion.div
        initial={false}
        animate={{ scaleX: progress / 100 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute left-0 top-0 h-full w-full bg-white/15"
        style={{ transformOrigin: 'left' }}
      />
    </div>
  );
}
