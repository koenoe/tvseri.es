'use client';

import type { ListItem } from '@tvseri.es/schemas';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback } from 'react';
import { twMerge } from 'tailwind-merge';
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
    defaultVariants: {
      size: 'large',
    },
    variants: {
      size: {
        large: [
          'h-[275px]',
          'w-[183px]',
          'lg:h-[300px]',
          'lg:w-[200px]',
          'xl:h-[375px]',
          'xl:w-[250px]',
        ],
        medium: [
          'h-[250px]',
          'w-[167px]',
          'lg:h-[275px]',
          'lg:w-[183px]',
          'xl:h-[325px]',
          'xl:w-[217px]',
        ],
        small: [
          'md:w-[126px]',
          'md:h-[189px]',
          'h-[225px]',
          'w-[150px]',
          'lg:h-[225px]',
          'lg:w-[150px]',
        ],
      },
    },
  },
);

export type PosterVariantProps = VariantProps<typeof posterStyles>;

type PosterProps = {
  className?: string;
  item: ListItem;
  mediaType?: 'tv' | 'movie';
  priority?: boolean;
};

function Poster({
  className,
  item,
  mediaType = 'tv',
  priority,
  size,
}: Readonly<PosterProps> & PosterVariantProps) {
  const poster = useCallback(() => {
    return (
      <div className="relative w-full pt-[150%]">
        <Image
          alt={item.title}
          className="rounded-lg object-contain"
          draggable={false}
          fill
          placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(300, 450)}`}
          priority={priority}
          src={item.posterImage}
          unoptimized
        />
        <span className="sr-only">{item.title}</span>
      </div>
    );
  }, [item.posterImage, item.title, priority]);

  if (mediaType === 'movie') {
    return (
      <motion.div
        animate={{ scale: 1 }}
        className={twMerge(
          posterStyles({ size }),
          'cursor-not-allowed',
          className,
        )}
        draggable={false}
        key={item.id}
        layout
        whileHover={{ scale: 1.075 }}
      >
        {poster()}
      </motion.div>
    );
  }

  return (
    <MotionLink
      animate={{ scale: 1 }}
      className={twMerge(posterStyles({ size }), className)}
      draggable={false}
      href={{
        pathname: `/tv/${item.id}/${item.slug}`,
      }}
      key={item.id}
      layout
      whileHover={{ scale: 1.075 }}
    >
      {poster()}
    </MotionLink>
  );
}

export default memo(Poster);
