'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback } from 'react';
import { twMerge } from 'tailwind-merge';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';
import type { PosterItem } from '@/utils/toPosterItem';

const MotionLink = motion.create(Link);

export const posterStyles = cva(
  [
    'relative',
    'flex-shrink-0',
    'overflow-clip',
    'rounded-xl',
    'shadow-lg',
    'after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)]',
    'after:absolute',
    'after:inset-0',
    'after:rounded-xl',
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

// Matches the `posterStyles` widths per breakpoint
const posterSizes = {
  large: '(min-width: 1280px) 250px, (min-width: 1024px) 200px, 183px',
  medium: '(min-width: 1280px) 217px, (min-width: 1024px) 183px, 167px',
  small: '(min-width: 1024px) 150px, (min-width: 768px) 126px, 150px',
} as const;

type PosterProps = {
  className?: string;
  item: PosterItem;
  mediaType?: 'tv' | 'movie';
  /** Above the fold (e.g. a grid's first row): load right away, not lazily */
  eager?: boolean;
  /** Overrides the `size` widths, e.g. when a grid stretches the poster */
  sizes?: string;
};

function Poster({
  className,
  eager = false,
  item,
  mediaType = 'tv',
  sizes,
  size,
}: Readonly<PosterProps> & PosterVariantProps) {
  const imageSizes = sizes ?? posterSizes[size ?? 'large'];
  const loading = eager ? 'eager' : undefined;

  const poster = useCallback(() => {
    return (
      <div className="relative w-full pt-[150%]">
        <Image
          alt={item.title}
          className="rounded-lg object-contain"
          draggable={false}
          fill
          loading={loading}
          placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(300, 450)}`}
          sizes={imageSizes}
          src={item.posterImage}
        />
        <span className="sr-only">{item.title}</span>
      </div>
    );
  }, [imageSizes, item.posterImage, item.title, loading]);

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

Poster.displayName = 'Poster';

export default memo(Poster);
