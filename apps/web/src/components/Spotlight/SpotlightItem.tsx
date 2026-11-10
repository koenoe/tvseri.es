'use client';

import Link from 'next/link';
import { memo } from 'react';

import type { SpotlightTvSeries } from '@/utils/toSpotlightTvSeries';

import SpotlightBackground from './SpotlightBackground';
import SpotlightShowMeta from './SpotlightShowMeta';
import SpotlightTitle from './SpotlightTitle';

type Props = Readonly<{
  item: SpotlightTvSeries;
  index: number;
  priority?: boolean;
}>;

const SpotlightItem = ({ item, index, priority = false }: Props) => {
  return (
    <Link
      className="relative flex h-full w-full flex-shrink-0 items-end overflow-hidden"
      draggable={false}
      href={{
        pathname: `/tv/${item.id}/${item.slug}`,
      }}
    >
      {item.backdropImage ? (
        <SpotlightBackground item={item} priority={priority} />
      ) : null}

      <div className="lg:p-18 relative w-full p-8 md:w-4/5 md:p-14">
        <SpotlightTitle className="mb-6" item={item} priority={priority} />

        <SpotlightShowMeta item={item} />
        {item.tagline ? (
          <div className="mt-4 text-center text-sm md:mt-6 md:text-left md:text-base">
            {item.tagline}
          </div>
        ) : null}
      </div>
      <div className="absolute right-[-1.75rem] top-[-1.75rem] text-[12.5rem] font-bold leading-none opacity-20 md:right-[-4.05rem] md:top-[-5rem] md:text-[30rem]">
        {index + 1}
      </div>
    </Link>
  );
};

export default memo(SpotlightItem);
