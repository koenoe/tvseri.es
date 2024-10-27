'use client';

import { memo, useCallback } from 'react';

import { cva, cx, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { type Movie } from '@/types/movie';
import { type TvSeries } from '@/types/tv-series';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

const MotionLink = motion.create(Link);

export const posterStyles = cva(
  [
    'relative',
    'flex-shrink-0',
    'overflow-clip',
    'rounded-lg',
    'shadow-lg',
    'after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)]',
    'after:absolute',
    'after:inset-0',
    'after:rounded-lg',
    'after:content-[""]',
  ],
  {
    variants: {
      size: {
        small: [
          'md:w-[126px]',
          'md:h-[189px]',
          'h-[225px]',
          'w-[150px]',
          'lg:h-[225px]',
          'lg:w-[150px]',
        ],
        default: [
          'h-[275px]',
          'w-[183px]',
          'lg:h-[300px]',
          'lg:w-[200px]',
          'xl:h-[375px]',
          'xl:w-[250px]',
        ],
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export type PosterVariantProps = VariantProps<typeof posterStyles>;

type PosterProps = {
  className?: string;
  item: TvSeries | Movie;
  priority?: boolean;
};

function Poster({
  className,
  item,
  priority,
  size,
}: Readonly<PosterProps> & PosterVariantProps) {
  const poster = useCallback(() => {
    return (
      <div className="relative w-full pt-[150%]">
        <Image
          className="rounded-lg object-contain"
          draggable={false}
          src={item.posterImage}
          alt={item.title}
          fill
          priority={priority}
          placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(300, 450)}`}
          unoptimized
        />
      </div>
    );
  }, [item.posterImage, item.title, priority]);

  // TODO: typeguard doesn't work properly
  // figure out why
  if (!('firstAirDate' in item)) {
    return (
      <motion.div
        key={item.id}
        className={cx(posterStyles({ size }), 'cursor-not-allowed', className)}
        draggable={false}
        whileHover={{ scale: 1.075 }}
        animate={{ scale: 1 }}
        layout
      >
        {poster()}
      </motion.div>
    );
  }

  return (
    <MotionLink
      key={item.id}
      className={cx(posterStyles({ size }), className)}
      draggable={false}
      href={`/tv/${item.id}/${item.slug}`}
      whileHover={{ scale: 1.075 }}
      animate={{ scale: 1 }}
      layout
    >
      {poster()}
    </MotionLink>
  );
}

export default memo(Poster);
