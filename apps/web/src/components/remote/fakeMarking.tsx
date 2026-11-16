'use client';

import { useMemo, useState } from 'react';

import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { showToast } from '@/components/ui/toast/showToast';
import { episodeCode, markedMessage } from '@/lib/marking/copy';

import type { RemoteMarking, UseRemoteMarking } from './marking';
import type { EpisodeRef, ListStatus, MarkingList } from './types';

type FakeConfig = Readonly<{
  /** Milliseconds each request takes (the board's Fast / Slow 900 ms). */
  delayMs?: () => number;
  /** The last aired episode of `nextEpisode`'s season: marking it ends the run. */
  lastEpisode: number;
  nextEpisode: EpisodeRef | null;
  /** Called by Hide. */
  onHide?: () => void;
  /** Called by Unhide (a hidden tile's latched H). */
  onRestore?: () => void;
  status: ListStatus | null;
}>;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const LIST_KEY = {
  favorites: 'isFavorited',
  watchlist: 'isWatchlisted',
} as const;

const NOT_PENDING = { favorites: false, watchlist: false } as const;
const OFF: ListStatus = { isFavorited: false, isWatchlisted: false };

const markedIcon = <Icon active glyph={eyeGlyph} size={16} />;

/**
 * An in-memory adapter for the style guide and the tests (no store, no
 * actions): optimistic like the core, with the core's toast copy. Returns a
 * module-level hook for `RemoteMarkingProvider`. State lives in the open
 * Remote, so a fake starts over when the Remote reopens; good enough to show
 * every state.
 */
export function createFakeMarking(config: FakeConfig): UseRemoteMarking {
  let nextEpisode = config.nextEpisode;
  let status = config.status;
  const delay = () => wait(config.delayMs?.() ?? 0);

  // biome-ignore lint/correctness/noComponentHookFactories: a fake is created outside render (the style guide at module scope, tests per case), so its hook identity is stable
  return function useFakeMarking() {
    const [next, setNext] = useState(nextEpisode);
    const [lists, setLists] = useState(status);
    const [listPending, setListPending] =
      useState<Readonly<Record<MarkingList, boolean>>>(NOT_PENDING);

    return useMemo<RemoteMarking>(
      () => ({
        hide: () => config.onHide?.(),
        listPending,
        markNext: async () => {
          if (!next) {
            return null;
          }
          await delay();
          nextEpisode =
            next.episodeNumber < config.lastEpisode
              ? { ...next, episodeNumber: next.episodeNumber + 1 }
              : null;
          setNext(nextEpisode);
          showToast({
            action: {
              label: 'Undo',
              onClick: () => {
                nextEpisode = next;
              },
            },
            icon: markedIcon,
            id: 'marking',
            title: markedMessage({ what: episodeCode(next), when: 'Just now' }),
          });
          return next;
        },
        nextEpisode: next,
        restore: () => config.onRestore?.(),
        status: lists,
        toggleList: (list: MarkingList) => {
          const current = lists ?? OFF;
          status = { ...current, [LIST_KEY[list]]: !current[LIST_KEY[list]] };
          setLists(status);
          setListPending((pending) => ({ ...pending, [list]: true }));
          void delay().then(() =>
            setListPending((pending) => ({ ...pending, [list]: false })),
          );
        },
      }),
      [listPending, lists, next],
    );
  };
}
