'use client';

import { memo, type MouseEvent } from 'react';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import { type TvSeries } from '@/types/tv-series';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

const MotionLink = motion.create(Link);
const MotionImage = motion.create(Image);

function SearchResults({
  className,
  isPending,
  results,
  itemHref = (series) => `/tv/${series.id}/${series.slug}`,
  itemClick = () => {},
  mode = 'light',
}: Readonly<{
  className?: string;
  results: TvSeries[] | null;
  isPending: boolean;
  itemHref?: (series: TvSeries) => string;
  itemClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  mode?: 'light' | 'dark';
}>) {
  const mergedClassName = twMerge(
    'grid grid-cols-2 gap-4 md:grid-cols-4',
    className,
  );

  return (
    <>
      {isPending ? (
        <div className={mergedClassName}>
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="flex h-full w-full flex-col items-center justify-center gap-2"
            >
              <div className="relative w-full pt-[150%]">
                <div
                  className={twMerge(
                    'absolute inset-0 h-full w-full overflow-hidden rounded-lg',
                    mode === 'light' ? 'bg-black/10' : 'bg-white/5',
                  )}
                >
                  <div
                    className={twMerge(
                      'absolute inset-0 h-full w-full animate-shimmer',
                      mode === 'light'
                        ? 'bg-gradient-to-r from-transparent via-white/30 to-transparent'
                        : 'bg-gradient-to-r from-transparent via-white/5 to-transparent',
                    )}
                  />
                </div>
              </div>
              <span
                className={twMerge(
                  'h-3 w-full animate-pulse',
                  mode === 'light' ? 'bg-black/5' : 'bg-white/5',
                )}
              />
            </div>
          ))}
        </div>
      ) : results?.length === 0 ? (
        <div className="text-center">No results found</div>
      ) : (
        <div className={mergedClassName}>
          {results?.map((series) => (
            <MotionLink
              key={series.id}
              className="flex h-full w-full flex-col items-center justify-center gap-2"
              href={itemHref(series)}
              onClick={itemClick}
              whileHover="active"
              layout
            >
              <div className="relative w-full pt-[150%]">
                <MotionImage
                  variants={{
                    inactive: { scale: 1 },
                    active: { scale: 1.04 },
                  }}
                  className="rounded-lg object-contain shadow-lg"
                  src={series.posterImage}
                  alt={series.title}
                  fill
                  priority
                  unoptimized
                  placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(100, 150)}`}
                />
              </div>
              <span className="w-full truncate text-ellipsis text-center text-xs">
                {series.title}
              </span>
            </MotionLink>
          ))}
        </div>
      )}
    </>
  );
}

export default memo(SearchResults);
