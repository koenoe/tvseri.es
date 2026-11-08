'use client';

import type { WatchedItem } from '@tvseri.es/schemas';
import { useCallback, useTransition } from 'react';
import { toast } from 'sonner';

import { getActionErrorMessage } from '@/app/actionResult';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';
import requestWatch from '../Watched/requestWatch';
import { useWatchedStore } from '../Watched/WatchedStoreProvider';
import { ContextMenuItem } from './ContextMenuItem';

const checkIcon = (
  <svg
    className="size-5"
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polyline
      points="416 128 192 384 96 288"
      style={{
        fill: 'none',
        stroke: 'currentColor',
        strokeLinecap: 'square',
        strokeMiterlimit: 10,
        strokeWidth: '44px',
      }}
    />
  </svg>
);

/**
 * "Watched next episode" for a show's context menu. The next episode comes
 * from the watched store (same rule everywhere), is marked optimistically,
 * and is rolled back if the request fails.
 */
export default function MarkNextEpisodeMenuItem({
  onSelect,
  tvSeriesId,
}: Readonly<{
  onSelect?: () => void;
  tvSeriesId: number;
}>) {
  const [isPending, startTransition] = useTransition();
  const getNextEpisode = useWatchedStore((store) => store.getNextEpisode);
  const markAsWatched = useWatchedStore((store) => store.markAsWatched);
  const unmarkAsWatched = useWatchedStore((store) => store.unmarkAsWatched);

  const handleClick = useCallback(() => {
    onSelect?.();

    const episode = getNextEpisode(tvSeriesId);
    if (!episode) {
      toast.error("You've already watched every aired episode");
      return;
    }

    // Runtime is filled in from the response.
    markAsWatched(tvSeriesId, [{ ...episode, runtime: 0 }]);

    startTransition(async () => {
      const response = await requestWatch(tvSeriesId, {
        ...episode,
        watched: true,
      }).catch(() => null);

      if (!response?.ok) {
        unmarkAsWatched(tvSeriesId, episode);
        toast.error(
          getActionErrorMessage(
            response?.status === 401 ? 'unauthenticated' : 'failed',
            'Failed to mark next episode as watched',
          ),
        );
        return;
      }

      const watchedItems = (await response.json()) as WatchedItem[];
      markAsWatched(tvSeriesId, watchedItems);
      toast.success(`${formatSeasonAndEpisode(episode)} marked as watched`);
    });
  }, [getNextEpisode, markAsWatched, onSelect, tvSeriesId, unmarkAsWatched]);

  return (
    <ContextMenuItem disabled={isPending} onClick={handleClick}>
      {checkIcon}
      <span>Watched next episode</span>
    </ContextMenuItem>
  );
}
