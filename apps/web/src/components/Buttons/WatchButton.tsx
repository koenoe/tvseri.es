'use client';

import type { WatchedItem } from '@tvseri.es/types';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  useCallback,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from 'react';
import SkeletonCircleButton from '../Skeletons/SkeletonCircleButton';
import { useWatchedStore } from '../Watched/WatchedStoreProvider';
import CircleButton from './CircleButton';

const watchButtonStyles = cva('', {
  defaultVariants: {
    size: 'medium',
  },
  variants: {
    size: {
      medium: ['size-10 md:size-12 [&_svg.icon]:size-5 md:[&_svg.icon]:size-6'],
      small: ['size-8 md:size-8 [&_svg.icon]:size-4 md:[&_svg.icon]:size-4'],
    },
  },
});

type ButtonVariantProps = VariantProps<typeof watchButtonStyles>;

export default function WatchButton({
  className,
  size,
  tvSeriesId,
  seasonNumber,
  episodeNumber,
}: ButtonVariantProps &
  Readonly<{
    className?: string;
    tvSeriesId: number;
    seasonNumber?: number;
    episodeNumber?: number;
  }>) {
  const [isHydrated, setIsHydrated] = useState(false);

  const isReady = useWatchedStore((store) => store.isReady(tvSeriesId));
  const isWatched = useWatchedStore((store) =>
    store.isWatched(tvSeriesId, {
      episodeNumber,
      seasonNumber,
    }),
  );
  const [optimisticIsWatched, setOptimisticIsWatched] = useOptimistic(
    isWatched,
    (_, optimisticValue: boolean) => optimisticValue,
  );

  const markAsWatched = useWatchedStore((store) => store.markAsWatched);
  const markAsUnwatched = useWatchedStore((store) => store.unmarkAsWatched);
  const [isPending, startTransition] = useTransition();
  const handleOnClick = useCallback(
    (value: boolean) => {
      startTransition(async () => {
        setOptimisticIsWatched(value);

        if (isPending) {
          return;
        }

        try {
          const response = await fetch(`/api/watch/tv/${tvSeriesId}`, {
            body: JSON.stringify({
              episodeNumber,
              seasonNumber,
              watched: value,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
            method: 'POST',
          });

          if (!response.ok) {
            return;
          }

          if (value) {
            const watchedItems = (await response.json()) as WatchedItem[];
            markAsWatched(tvSeriesId, watchedItems);
          } else {
            markAsUnwatched(tvSeriesId, {
              episodeNumber,
              seasonNumber,
            });
          }
        } catch (error) {
          console.error(error);
        }
      });
    },
    [
      episodeNumber,
      isPending,
      markAsUnwatched,
      markAsWatched,
      seasonNumber,
      setOptimisticIsWatched,
      tvSeriesId,
    ],
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated || !isReady) {
    return <SkeletonCircleButton size={size} />;
  }

  return (
    <CircleButton
      className={watchButtonStyles({ className, size })}
      initial={!isReady ? (optimisticIsWatched ? 'active' : 'inactive') : false}
      isActive={optimisticIsWatched}
      isDisabled={isPending}
      onClick={handleOnClick}
      title={optimisticIsWatched ? 'Mark as unwatched' : 'Mark as watched'}
    >
      <svg
        className="icon"
        fill="currentColor"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="256" cy="256" r="64" />
        <path d="M394.82,141.18C351.1,111.2,304.31,96,255.76,96c-43.69,0-86.28,13-126.59,38.48C88.52,160.23,48.67,207,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416c49,0,95.85-15.07,139.3-44.79C433.31,345,469.71,299.82,496,256,469.62,212.57,433.1,167.44,394.82,141.18ZM256,352a96,96,0,1,1,96-96A96.11,96.11,0,0,1,256,352Z" />
        {/* {isActive ? (
          <>
            <circle cx="256" cy="256" r="64" />
            <path d="M394.82,141.18C351.1,111.2,304.31,96,255.76,96c-43.69,0-86.28,13-126.59,38.48C88.52,160.23,48.67,207,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416c49,0,95.85-15.07,139.3-44.79C433.31,345,469.71,299.82,496,256,469.62,212.57,433.1,167.44,394.82,141.18ZM256,352a96,96,0,1,1,96-96A96.11,96.11,0,0,1,256,352Z" />
          </>
        ) : (
          <>
            <rect
              x="240.44"
              y="0.03"
              width="31.11"
              height="511.95"
              transform="translate(-106.04 256) rotate(-45)"
            />
            <path d="M259.34,192.09l60.57,60.57A64.07,64.07,0,0,0,259.34,192.09Z" />
            <path d="M252.66,319.91l-60.57-60.57A64.07,64.07,0,0,0,252.66,319.91Z" />
            <path d="M256,352a96,96,0,0,1-92.6-121.34L94.33,161.58C66.12,187.42,39.24,221.14,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416A233.47,233.47,0,0,0,335,402.2l-53.61-53.6A95.84,95.84,0,0,1,256,352Z" />
            <path d="M256,160a96,96,0,0,1,92.6,121.34L419.26,352c29.15-26.25,56.07-61.56,76.74-96-26.38-43.43-62.9-88.56-101.18-114.82C351.1,111.2,304.31,96,255.76,96a222.92,222.92,0,0,0-78.21,14.29l53.11,53.11A95.84,95.84,0,0,1,256,160Z" />
          </>
        )} */}
      </svg>
    </CircleButton>
  );
}
