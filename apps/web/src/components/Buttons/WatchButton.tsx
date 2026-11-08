'use client';

import type { WatchedItem } from '@tvseri.es/schemas';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  useCallback,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from 'react';
import { EyeSolidIcon } from '@/components/Icons/EyeSolidIcon';
import SkeletonCircleButton from '../Skeletons/SkeletonCircleButton';
import requestWatch from '../Watched/requestWatch';
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
          const response = await requestWatch(tvSeriesId, {
            episodeNumber,
            seasonNumber,
            watched: value,
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
      <EyeSolidIcon className="icon" />
    </CircleButton>
  );
}
