'use client';

import { memo, type MouseEvent } from 'react';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { type TvSeries } from '@/types/tv-series';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

const MotionLink = motion(Link);
const MotionImage = motion(Image);

function SearchResults({
  isPending,
  results,
  itemHref = (series) => `/tv/${series.id}/${series.slug}`,
  itemClick = () => {},
}: Readonly<{
  results: TvSeries[] | null;
  isPending: boolean;
  itemHref?: (series: TvSeries) => string;
  itemClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}>) {
  return (
    <>
      {isPending ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="flex h-full w-full flex-col items-center justify-center gap-2"
            >
              <div className="relative w-full pt-[150%]">
                <div className="absolute inset-0 h-full w-full overflow-hidden rounded-lg bg-black/10">
                  <div className="absolute inset-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
              </div>
              <span className="h-3 w-full animate-pulse bg-black/5" />
            </div>
          ))}
        </div>
      ) : results?.length === 0 ? (
        <div className="text-center">No results found</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
