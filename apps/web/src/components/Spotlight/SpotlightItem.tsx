'use client';

import { memo } from 'react';

import Link from 'next/link';

import type { TvSeries } from '@/types/tv-series';

import SpotlightBackground from './SpotlightBackground';
import SpotlightTitle from './SpotlightTitle';

type Props = Readonly<{
  item: TvSeries;
  index: number;
}>;

const SpotlightItem = ({ item, index }: Props) => {
  return (
    <Link
      href={`/tv/${item.id}/${item.slug}`}
      className="relative flex h-full w-full flex-shrink-0 items-end overflow-hidden"
      draggable={false}
    >
      {item.backdropImage && <SpotlightBackground item={item} />}

      <div className="lg:p-18 relative w-full p-8 md:w-4/5 md:p-14">
        <SpotlightTitle item={item} className="mb-6" />

        <div className="flex gap-4 md:gap-12">
          <div className="flex w-full justify-center gap-2 text-xs opacity-60 md:justify-start md:text-[0.8rem]">
            <div className="after:ml-2 after:content-['·']">
              {item.releaseYear}
            </div>
            <div className="after:ml-2 after:content-['·']">
              {item.numberOfSeasons}{' '}
              {item.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
            </div>
            <div>{item.genres[0]?.name}</div>
          </div>
        </div>
        {item.tagline && (
          <div className="mt-4 text-center text-sm md:mt-6 md:text-left md:text-base">
            {item.tagline}
          </div>
        )}
      </div>
      <div className="absolute right-[-1.75rem] top-[-1.75rem] text-[12.5rem] font-bold leading-none opacity-20 md:right-[-4.05rem] md:top-[-5rem] md:text-[30rem]">
        {index + 1}
      </div>
    </Link>
  );
};

export default memo(SpotlightItem);
