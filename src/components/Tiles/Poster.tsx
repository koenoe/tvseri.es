'use client';

import { memo, useCallback } from 'react';

import { cva, cx, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { type ListItem } from '@/lib/db/list';
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
        medium: [
          'h-[250px]',
          'w-[167px]',
          'lg:h-[275px]',
          'lg:w-[183px]',
          'xl:h-[325px]',
          'xl:w-[217px]',
        ],
        large: [
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
      size: 'large',
    },
  },
);

export type PosterVariantProps = VariantProps<typeof posterStyles>;

type PosterProps = {
  className?: string;
  item: ListItem;
  mediaType?: 'tv' | 'movie';
  priority?: boolean;
  onRemove?: (item: ListItem) => void;
};

function Poster({
  className,
  item,
  mediaType = 'tv',
  onRemove,
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
        <span className="sr-only">{item.title}</span>
      </div>
    );
  }, [item.posterImage, item.title, priority]);

  if (mediaType === 'movie') {
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
      {onRemove && (
        <>
          <div className="absolute -top-1 left-0 h-2/5 w-full bg-gradient-to-b from-black/60 to-transparent" />
          <motion.button
            className="!absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur"
            onClick={(e) => {
              e.preventDefault();
              onRemove(item);
            }}
            whileTap="tap"
            whileHover="hover"
            initial={false}
            animate="inactive"
            variants={{
              active: {
                borderColor: 'rgba(255, 255, 255, 1)',
                color: 'rgba(255, 255, 255, 1)',
                transition: {
                  duration: 0.6,
                },
              },
              inactive: {
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.6)',
              },
              hover: {
                borderColor: 'rgba(255, 255, 255, 0.4)',
              },
            }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="size-2"
              fill="currentColor"
              variants={{
                tap: { scale: 0.6 },
              }}
            >
              <path d="m24 2.4-2.4-2.4-9.6 9.6-9.6-9.6-2.4 2.4 9.6 9.6-9.6 9.6 2.4 2.4 9.6-9.6 9.6 9.6 2.4-2.4-9.6-9.6z" />
            </motion.svg>
          </motion.button>
        </>
      )}
    </MotionLink>
  );
}

export default memo(Poster);
