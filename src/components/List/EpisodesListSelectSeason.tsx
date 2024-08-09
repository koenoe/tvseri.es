'use client';

import { memo, useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

import { type TvSeries } from '@/types/tv-series';

const variants = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 40 },
};

function SelectSeason({ item }: Readonly<{ item: TvSeries }>) {
  const [isVisible, setIsVisible] = useState(false);
  const searchParams = useSearchParams();
  const selectedSeason = useMemo(
    () =>
      item.seasons?.find(
        (season) =>
          season.seasonNumber.toString() ===
          (searchParams.get('season') ?? '1'),
      ),
    [item.seasons, searchParams],
  );

  return (
    <div className="relative z-10">
      <div
        className="flex cursor-pointer items-center gap-3 text-2xl font-medium"
        onClick={() => setIsVisible((previousState) => !previousState)}
      >
        <span>{selectedSeason?.title}</span>
        <motion.svg
          className="h-6 w-6"
          viewBox="0 0 20 20"
          fill="currentColor"
          animate={{
            rotate: isVisible ? 180 : 0,
          }}
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          ></path>
        </motion.svg>
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="select-season"
            className="absolute left-0 top-12 flex w-full flex-col gap-2 rounded-lg bg-white p-4 text-black"
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            exit="hidden"
            variants={variants}
          >
            {item.seasons?.map((item) => (
              <button
                key={item.id}
                className="text-nowrap p-2 text-left text-sm hover:underline"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('season', item.seasonNumber.toString());
                  window.history.pushState(null, '', `?${params.toString()}`);
                  setIsVisible(false);
                }}
              >
                <span className="drop-shadow-lg">{item.title}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(SelectSeason);
