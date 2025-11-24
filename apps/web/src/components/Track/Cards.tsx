'use client';

import type { Season, WatchedItem, WatchProvider } from '@tvseri.es/schemas';
import { useSearchParams } from 'next/navigation';
import {
  memo,
  useCallback,
  useOptimistic,
  useReducer,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import SeasonCard from './SeasonCard';

export type WatchedAction = Readonly<{
  type: 'delete' | 'update';
  items: Partial<WatchedItem>[];
}>;

const reducer = (
  state: Partial<WatchedItem>[],
  { type, items }: WatchedAction,
) => {
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
  watchProvider,
  watchedItems: watchedItemsFromProps,
  deleteAction,
  saveAction,
}: Readonly<{
  seasons: Season[];
  watchProvider?: WatchProvider | null;
  watchedItems: WatchedItem[];
  deleteAction: (items: Partial<WatchedItem>[]) => void;
  saveAction: (items: Partial<WatchedItem>[]) => void;
}>) {
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [watchedItems, dispatch] = useReducer(reducer, watchedItemsFromProps);
  const [optimisticWatchedItems, optimisticDispatch] = useOptimistic(
    watchedItems,
    reducer,
  );
  const seasonNumberFromSearchParams = searchParams.get('season');

  const updateItems = useCallback(
    ({ type, items }: WatchedAction) => {
      startTransition(async () => {
        optimisticDispatch({ items, type });

        try {
          await (type === 'delete' ? deleteAction(items) : saveAction(items));
          dispatch({ items, type });
        } catch (_) {
          toast.error('Something went wrong. Please try again.');
        }
      });
    },
    [deleteAction, saveAction, optimisticDispatch],
  );

  return (
    <div className="flex flex-col gap-4">
      {seasons.map((season) => (
        <SeasonCard
          isExpanded={
            String(season.seasonNumber) === seasonNumberFromSearchParams
          }
          key={season.id}
          season={season}
          updateItems={updateItems}
          watchedItems={optimisticWatchedItems.filter(
            (item) => item.seasonNumber === season.seasonNumber,
          )}
          watchProvider={watchProvider}
        />
      ))}
    </div>
  );
}

export default memo(TrackForm);
