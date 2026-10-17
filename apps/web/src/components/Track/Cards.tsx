'use client';

import type { Season, WatchProvider } from '@tvseri.es/schemas';
import { useSearchParams } from 'next/navigation';
import {
  memo,
  useCallback,
  useOptimistic,
  useReducer,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import { actionError, getActionErrorMessage } from '@/app/actionResult';
import { markWatchedEpisodes, unmarkWatchedEpisodes } from '@/app/watchActions';
import { useWatchedStore } from '@/components/Watched/WatchedStoreProvider';
import SeasonCard from './SeasonCard';
import type { TrackedEpisode, WatchedAction } from './types';

const reducer = (state: TrackedEpisode[], { type, items }: WatchedAction) => {
  switch (type) {
    case 'delete': {
      const updatedState = state.filter(
        (item) =>
          !items.some(
            (watchedItem) =>
              item.episodeNumber === watchedItem.episodeNumber &&
              item.seasonNumber === watchedItem.seasonNumber,
          ),
      );

      return updatedState;
    }
    default: {
      const updatedState = [...state];

      items.forEach((watchedItem) => {
        const existingIndex = updatedState.findIndex(
          (item) =>
            item.episodeNumber === watchedItem.episodeNumber &&
            item.seasonNumber === watchedItem.seasonNumber,
        );

        if (existingIndex !== -1) {
          updatedState[existingIndex] = {
            ...updatedState[existingIndex],
            ...watchedItem,
          };
        } else {
          updatedState.push(watchedItem);
        }
      });

      return updatedState;
    }
  }
};

function TrackForm({
  seasons,
  tvSeriesId,
  watchProvider,
  watchedItems: watchedItemsFromProps,
}: Readonly<{
  seasons: Season[];
  tvSeriesId: number;
  watchProvider?: WatchProvider | null;
  watchedItems: TrackedEpisode[];
}>) {
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [watchedItems, dispatch] = useReducer(reducer, watchedItemsFromProps);
  const [optimisticWatchedItems, optimisticDispatch] = useOptimistic(
    watchedItems,
    reducer,
  );
  const seasonFromSearchParams = searchParams.get('season');
  const expandedSeasonNumber =
    seasons.length === 1
      ? (seasons[0]?.seasonNumber ?? null)
      : seasonFromSearchParams
        ? Number(seasonFromSearchParams)
        : null;
  const markAsWatched = useWatchedStore((s) => s.markAsWatched);
  const unmarkAsWatched = useWatchedStore((s) => s.unmarkAsWatched);

  const updateItems = useCallback(
    ({ type, items }: WatchedAction) => {
      startTransition(async () => {
        optimisticDispatch({ items, type });

        // Update items are built by toTrackedEpisode; delete only needs keys.
        const result = await (type === 'delete'
          ? unmarkWatchedEpisodes(
              tvSeriesId,
              items.map(({ episodeNumber, seasonNumber }) => ({
                episodeNumber,
                seasonNumber,
              })),
            )
          : markWatchedEpisodes(tvSeriesId, items)
        ).catch(() => actionError('failed'));

        if (!result.ok) {
          toast.error(getActionErrorMessage(result.error));
          return;
        }

        dispatch({ items, type });

        if (type === 'delete') {
          for (const item of items) {
            unmarkAsWatched(tvSeriesId, {
              episodeNumber: item.episodeNumber,
              seasonNumber: item.seasonNumber,
            });
          }
        } else {
          markAsWatched(
            tvSeriesId,
            items.map((item) => ({
              episodeNumber: item.episodeNumber,
              runtime: item.runtime,
              seasonNumber: item.seasonNumber,
            })),
          );
        }
      });
    },
    [optimisticDispatch, tvSeriesId, markAsWatched, unmarkAsWatched],
  );

  return (
    <div className="flex flex-col gap-4">
      {seasons.map((season) => (
        <SeasonCard
          expandedSeasonNumber={expandedSeasonNumber}
          key={season.id}
          season={season}
          updateItems={updateItems}
          watchedItems={optimisticWatchedItems}
          watchProvider={watchProvider}
        />
      ))}
    </div>
  );
}

TrackForm.displayName = 'TrackForm';

export default memo(TrackForm);
