'use client';

import { memo } from 'react';
import { cva, cx } from 'class-variance-authority';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TvSeries } from '@/types/tv-series';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

const MotionLink = motion(Link);

export const posterStyles = cva(
  'relative h-[275px] w-[183px] flex-shrink-0 overflow-clip rounded-lg shadow-lg lg:h-[300px] lg:w-[200px] xl:h-[375px] xl:w-[250px]',
);

function Poster({
  className,
  item,
  priority,
}: Readonly<{ className?: string; item: TvSeries; priority?: boolean }>) {
  return (
    <MotionLink
      key={item.id}
      className={cx(posterStyles(), className)}
      draggable={false}
      href={`https://www.themoviedb.org/tv/${item.id}`}
      prefetch={false}
      target="_blank"
      whileHover={{ scale: 1.075 }}
      animate={{ scale: 1 }}
    >
      <Image
        className="object-contain"
        draggable={false}
        src={item.posterImage}
        alt={item.title}
        fill
        priority={priority}
        placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(300, 450)}`}
      />
    </MotionLink>
  );
}

export default memo(Poster);
