'use client';

import { memo } from 'react';
import { cva, cx } from 'class-variance-authority';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TvSeries } from '@/types/tv-series';

const MotionLink = motion(Link);

export const posterStyles = cva(
  'relative h-[275px] w-[183px] flex-shrink-0 overflow-clip rounded-lg shadow-lg lg:h-[300px] lg:w-[200px] xl:h-[375px] xl:w-[250px]',
);

function Poster({
  className,
  item,
}: Readonly<{ className?: string; item: TvSeries }>) {
  return (
    <MotionLink
      key={item.id}
      className={cx(posterStyles(), className)}
      href={`https://www.themoviedb.org/tv/${item.id}`}
      prefetch={false}
      target="_blank"
      whileHover={{ scale: 1.075 }}
      animate={{ scale: 1 }}
    >
      <Image
        className="object-contain"
        src={item.posterImage}
        alt={item.title}
        fill
        priority
      />
    </MotionLink>
  );
}

export default memo(Poster);
