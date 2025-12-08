'use client';

import type { TvSeries } from '@tvseri.es/schemas';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { type MouseEvent, memo } from 'react';
import { twMerge } from 'tailwind-merge';

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
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden p-6 md:h-auto md:max-h-[calc(100vh-20rem)] md:border-t md:border-black/10">
      {isPending ? (
        <div className={mergedClassName}>
          {[...Array(8)].map((_, index) => (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-2"
              key={index}
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
                      'animate-shimmer absolute inset-0 h-full w-full',
                      mode === 'light'
                        ? 'bg-gradient-to-r from-transparent via-white/30 to-transparent'
                        : 'bg-gradient-to-r from-transparent via-white/5 to-transparent',
                    )}
                  />
                </div>
              </div>
              <span
                className={twMerge(
                  'h-3 w-4/5 animate-pulse',
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
              className="flex h-full w-full flex-col items-center justify-center gap-2"
              href={itemHref(series)}
              key={series.id}
              onClick={itemClick}
              whileHover="active"
            >
              <div className="relative w-full pt-[150%]">
                <MotionImage
                  alt={series.title}
                  className="rounded-lg object-contain shadow-lg"
                  fill
                  placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(100, 150)}`}
                  priority
                  src={series.posterImage}
                  unoptimized
                  variants={{
                    active: { scale: 1.04 },
                    inactive: { scale: 1 },
                  }}
                />
              </div>
              <span className="w-full truncate text-ellipsis text-center text-xs">
                {series.title}
              </span>
            </MotionLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(SearchResults);
