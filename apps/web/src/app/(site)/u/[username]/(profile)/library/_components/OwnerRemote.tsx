'use client';

import { useCallback } from 'react';

import { LazyShowRemote, LazyTileRemote } from '@/components/remote/LazyRemote';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import type { TileView } from '@/lib/profile/tileView';
import showPath from '@/lib/routing/showPath';
import { useTileContext } from './tileContext';

/** The ⋯ shows on hover, focus and while open; always on touch screens */
const MENU =
  'opacity-0 transition-opacity duration-160 group-hover/lt:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100';

/** Is the show still on the list the shelf shows? null while unknown */
function useStillOn() {
  const store = useMarkingStoreApi();
  return (id: number, list: 'favorites' | 'watchlist'): boolean | null => {
    // the library ids follow every toggle at once (a show's seed can land
    // after the toggle with the list as it was before)
    const { library, series } = store.getState();
    if (library.status === 'ready') {
      return library.ids[list].includes(id);
    }
    const status = series[id]?.view.status;
    if (!status) {
      return null;
    }
    return list === 'favorites' ? status.isFavorited : status.isWatchlisted;
  };
}

/**
 * The owner's ⋯: the tile Remote on Watching and Hidden, the show Remote
 * elsewhere; the ⋯ alone until a pointer or focus reaches it
 */
export default function OwnerRemote({ tile }: Readonly<{ tile: TileView }>) {
  const { leave, shelf } = useTileContext();
  const stillOn = useStillOn();
  const historyHref = `${showPath(tile.id, tile.slug)}?season=${tile.historySeason}&history`;
  const hidden = shelf === 'hidden';
  const onHide = useCallback(
    () => leave(tile.id, hidden ? 'unhide' : 'hide'),
    [hidden, leave, tile.id],
  );
  if (shelf === 'watching' || shelf === 'hidden') {
    return (
      <LazyTileRemote
        className={MENU}
        hidden={hidden}
        historyHref={historyHref}
        onHide={onHide}
        placement="below-start"
        seriesId={tile.id}
        seriesName={tile.title}
      />
    );
  }
  // W or F off on its own shelf: the tile goes when the Remote closes, not under the pointer
  const onClose =
    shelf === 'watchlist' || shelf === 'favourites'
      ? () => {
          const list = shelf === 'watchlist' ? 'watchlist' : 'favorites';
          if (stillOn(tile.id, list) === false) {
            leave(
              tile.id,
              shelf === 'watchlist' ? 'watchlist-remove' : 'favourites-remove',
            );
          }
        }
      : undefined;
  return (
    <LazyShowRemote
      className={MENU}
      hasAired={tile.hasAired}
      historyHref={historyHref}
      onClose={onClose}
      placement="below-start"
      seriesId={tile.id}
      seriesName={tile.title}
      size={32}
    />
  );
}
