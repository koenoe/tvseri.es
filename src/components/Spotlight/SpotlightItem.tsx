/* eslint-disable @next/next/no-img-element */
'use client';

import { forwardRef, memo } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import useRgbString from '@/hooks/useRgbString';
import type { TvSeries } from '@/types/tv-series';

import BackgroundImage from '../Background/BackgroundImage';

type Props = Readonly<{
  item: TvSeries;
  index: number;
}>;

const SpotlightItem = forwardRef<HTMLAnchorElement, Props>(
  ({ item, index }, ref) => {
    const rgbString = useRgbString(item.backdropColor);

    return (
      <Link
        ref={ref}
        href={`/tv/${item.id}/${item.slug}`}
        className="relative flex h-full w-full flex-shrink-0 items-end overflow-hidden"
        draggable={false}
      >
        {item.backdropImage && (
          <div className="absolute inset-0">
            <BackgroundImage src={item.backdropImage} />
            <div
              className="absolute inset-0 opacity-70"
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
                unoptimized
              />
              <span className="hidden">{item.title}</span>
            </h1>
          ) : (
            <h1 className="relative mb-6 w-full text-center text-3xl font-bold !leading-tight md:w-3/5 md:text-left md:text-4xl lg:text-5xl xl:text-6xl">
              {item.title}
            </h1>
          )}

          <div className="flex gap-4 md:gap-12">
            <div className="flex w-full justify-center gap-2 text-xs opacity-60 md:justify-start md:text-[0.8rem]">
              <div className="after:ml-2 after:content-['·']">
                {item.releaseYear}
              </div>
              <div className="after:ml-2 after:content-['·']">
                {item.numberOfSeasons}{' '}
                {item.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
              </div>
              <div>{item.genres[0].name}</div>
            </div>
          </div>
        </div>
        <div className="absolute right-[-1.75rem] top-[-1.75rem] text-[12.5rem] font-bold leading-none opacity-20 md:right-[-4.05rem] md:top-[-5rem] md:text-[30rem]">
          {index + 1}
        </div>
      </Link>
    );
  },
);

SpotlightItem.displayName = 'SpotlightItem';

export default memo(SpotlightItem);
