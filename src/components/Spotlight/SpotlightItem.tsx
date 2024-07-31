'use client';

import { forwardRef, memo, useMemo } from 'react';
import Image from 'next/image';
import hexToRgb from '@/utils/hexToRgb';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { TvSeries } from '@/types/tv-series';

export const variants = {
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

const MotionImage = motion(Image);
const MotionLink = motion(Link);

type Props = Readonly<{
  item: TvSeries;
  index: number;
}>;

const SpotlightItem = forwardRef<HTMLElement, Props>(({ item, index }, ref) => {
  const rgbString = useMemo(() => {
    return hexToRgb(item.backdropColor).join(',');
  }, [item.backdropColor]);

  const releaseYear = useMemo(() => {
    const firstAirYear = new Date(item.firstAirDate).getUTCFullYear();
    const lastAirYear = new Date(item.lastAirDate).getUTCFullYear();
    const currentYear = new Date().getUTCFullYear();

    if (firstAirYear === lastAirYear) {
      return firstAirYear;
    }

    if (lastAirYear < currentYear) {
      return `${firstAirYear}– ${lastAirYear}`;
    }

    return `${firstAirYear}–`;
  }, [item.firstAirDate, item.lastAirDate]);

  return (
    <MotionLink
      ref={ref}
      href={`https://www.themoviedb.org/tv/${item.id}`}
      prefetch={false}
      className="relative flex h-full w-full flex-shrink-0 items-end overflow-hidden"
      target="_blank"
      draggable={false}
      // Note: disable for now, explore later
      // whileHover="hover"
    >
      {item.backdropImage && (
        <div className="absolute inset-0">
          <MotionImage
            className="object-cover"
            src={item.backdropImage}
            alt=""
            priority
            fill
            draggable={false}
            variants={variants}
          />
          <div
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage: `linear-gradient(270deg, rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 0.4) 50%, rgba(${rgbString}, 1) 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 0.7) 100%)`,
            }}
          />
        </div>
      )}

      <div className="lg:p-18 relative w-full p-8 md:w-4/5 md:p-14">
        {item.titleTreatmentImage ? (
          <h1 className="relative mb-6 h-20 w-full md:h-36 md:w-96">
            <Image
              className="object-contain object-bottom md:object-left-bottom"
              src={item.titleTreatmentImage}
              alt=""
              priority
              fill
              draggable={false}
            />
          </h1>
        ) : (
          <h1 className="relative mb-6 w-full text-center text-3xl font-bold !leading-tight md:w-3/5 md:text-left md:text-4xl lg:text-5xl xl:text-6xl">
            {item.title}
          </h1>
        )}

        <div className="flex gap-4 md:gap-12">
          <div className="flex w-full justify-center gap-2 text-xs opacity-60 md:justify-start md:text-[0.8rem]">
            <div className="after:ml-2 after:content-['·']">{releaseYear}</div>
            <div className="after:ml-2 after:content-['·']">
              {item.numberOfSeasons}{' '}
              {item.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
            </div>
            <div>{item.genres[0].name}</div>
          </div>
        </div>
      </div>
      <div className="absolute right-[-1.75rem] top-[-1.75rem] text-[12.5rem] font-bold leading-none opacity-20 md:right-[-4rem] md:top-[-5rem] md:text-[30rem]">
        {index + 1}
      </div>
    </MotionLink>
  );
});

SpotlightItem.displayName = 'SpotlightItem';

export default memo(SpotlightItem);
