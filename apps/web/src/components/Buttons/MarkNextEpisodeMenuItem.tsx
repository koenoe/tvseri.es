'use client';

import { useCallback, useTransition } from 'react';
import { toast } from 'sonner';

import {
  type ActionError,
  actionError,
  getActionErrorMessage,
} from '@/app/actionResult';
import { markNextEpisodeWatched } from '@/app/watchActions';
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

function getErrorMessage(error: ActionError) {
  return error === 'not-found'
    ? "You've already watched every aired episode"
    : getActionErrorMessage(error, 'Failed to mark next episode as watched');
}

/**
 * "Watched next episode" for a show's context menu. The server action picks
 * the episode, so every menu that renders this behaves the same.
 */
export default function MarkNextEpisodeMenuItem({
  onSelect,
  tvSeriesId,
}: Readonly<{
  onSelect?: () => void;
  tvSeriesId: number;
}>) {
  const [isPending, startTransition] = useTransition();

  const handleClick = useCallback(() => {
    onSelect?.();

    startTransition(async () => {
      // The action calls refresh(), so progress updates in the same round-trip.
      const promise = markNextEpisodeWatched(tvSeriesId)
        .catch(() => actionError('failed'))
        .then((result) => {
          if (!result.ok) {
            throw new Error(getErrorMessage(result.error));
          }
        });

      toast.promise(promise, {
        error: (error: Error) => error.message,
        loading: 'Marking next episode as watched...',
        success: 'Next episode marked as watched',
      });

      await promise.catch(() => {});
    });
  }, [onSelect, tvSeriesId]);

  return (
    <ContextMenuItem disabled={isPending} onClick={handleClick}>
      {checkIcon}
      <span>Watched next episode</span>
    </ContextMenuItem>
  );
}
