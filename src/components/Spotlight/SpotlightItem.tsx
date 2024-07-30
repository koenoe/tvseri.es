'use client';

import { forwardRef, memo } from 'react';
import type { Movie } from '@/types/movie';
import Image from 'next/image';
import formatRuntime from '@/utils/formatRuntime';
import hexToRgb from '@/utils/hexToRgb';
import { motion } from 'framer-motion';
import Link from 'next/link';

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
  item: Movie;
  index: number;
}>;

const SpotlightItem = forwardRef<HTMLElement, Props>(({ item, index }, ref) => {
  const [r, g, b] = hexToRgb(item.backdropColor);
  const rgbString = `${r},${g},${b}`;

  return (
    <MotionLink
      ref={ref}
      href={`https://www.themoviedb.org/movie/${item.id}`}
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

      <div className="relative w-full p-8 md:w-4/5 md:p-14 lg:p-20">
        <h1 className="relative mb-6 h-20 w-full md:mb-8 md:h-36 md:w-96">
          {item.titleTreatmentImage ? (
            <Image
              className="object-contain object-bottom md:object-left-bottom"
              src={item.titleTreatmentImage}
              alt=""
              priority
              fill
              draggable={false}
            />
          ) : (
            item.title
          )}
        </h1>
        <div className="flex gap-4 md:gap-12">
          <div className="flex w-full justify-center gap-2 text-xs md:justify-start md:text-base">
            <div className="after:content-['_·_']">
              {formatRuntime(item.runtime)}
            </div>
            <div className="after:content-['_·_']">
              {item.genres
                ?.slice(0, 2)
                .map((genre) => genre.name)
                .join(', ')}
            </div>
            <div>{item.releaseYear}</div>
          </div>
        </div>
      </div>
      <div className="absolute right-[-1.5rem] top-[-1.5rem] text-[10rem] font-bold leading-none opacity-20 md:right-[-4rem] md:top-[-5rem] md:text-[30rem]">
        {index + 1}
      </div>
    </MotionLink>
  );
});

SpotlightItem.displayName = 'SpotlightItem';

export default memo(SpotlightItem);
