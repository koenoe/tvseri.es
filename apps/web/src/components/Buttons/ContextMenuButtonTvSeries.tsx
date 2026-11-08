'use client';

import type { TvSeries } from '@tvseri.es/schemas';
import { useCallback, useRef } from 'react';

import { ClockIcon } from '@/components/Icons/ClockIcon';
import { EyeSolidIcon } from '@/components/Icons/EyeSolidIcon';
import { HeartIcon } from '@/components/Icons/HeartIcon';
import { useActionButtons } from './ActionButtonsProvider';
import ContextMenuButton, {
  type ContextMenuButtonHandle,
} from './ContextMenuButton';
import { ContextMenuItem, ContextMenuLink } from './ContextMenuItem';
import MarkNextEpisodeMenuItem from './MarkNextEpisodeMenuItem';

export default function ContextMenuButtonTvSeries({
  className,
  tvSeries,
}: Readonly<{
  className?: string;
  tvSeries: Pick<TvSeries, 'hasAired' | 'id' | 'slug'>;
}>) {
  const {
    isPending,
    state: { isFavorited, isWatchlisted },
    toggle,
  } = useActionButtons();
  const contextMenuButtonRef = useRef<ContextMenuButtonHandle>(null);
  const trackHref = `/track/${tvSeries.id}/${tvSeries.slug}`;

  const handleCloseMenu = useCallback(() => {
    contextMenuButtonRef.current?.close();
  }, []);

  const handleFavoriteClick = useCallback(() => {
    toggle('favorites');
  }, [toggle]);

  const handleWatchlistClick = useCallback(() => {
    toggle('watchlist');
  }, [toggle]);

  return (
    <ContextMenuButton
      className={className}
      isDisabled={isPending}
      ref={contextMenuButtonRef}
    >
      {tvSeries.hasAired ? (
        <MarkNextEpisodeMenuItem
          onSelect={handleCloseMenu}
          tvSeriesId={tvSeries.id}
        />
      ) : null}
      <ContextMenuLink href={trackHref} onClick={handleCloseMenu}>
        <EyeSolidIcon className="size-5" />
        <span>Edit watch history</span>
      </ContextMenuLink>
      <ContextMenuItem onClick={handleFavoriteClick}>
        <HeartIcon className="size-5 shrink-0" />
        <span>
          {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        </span>
      </ContextMenuItem>
      <ContextMenuItem onClick={handleWatchlistClick}>
        <ClockIcon className="size-5 shrink-0" />
        <span>
          {isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        </span>
      </ContextMenuItem>
    </ContextMenuButton>
  );
}
