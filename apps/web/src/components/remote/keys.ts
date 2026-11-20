import { episodeCode } from '@tvseri.es/schemas';

import { formatMonthDayYear } from '@/lib/format/calendarDay';

import type { EpisodeRef, ListStatus, NextToAir, RemoteEpisode } from './types';

/**
 * The Remote's key model, pure:
 * which keys, their labels and states, from the marking state and what the
 * page knows about the episodes.
 */

/** “Season 3 has no date yet” / “S03E06 airs Jul 2, 2027”. */
function airNote(next: NextToAir): string {
  if (!next.airDate) {
    return `Season ${next.seasonNumber} has no date yet`;
  }
  const date = formatMonthDayYear(`${next.airDate}T00:00:00Z`);
  return `${episodeCode(next)} airs ${date}`;
}

export type BigKeyModel = Readonly<{
  disabled: boolean;
  /** The episode a press marks (the pending one while marking). */
  episode: EpisodeRef | null;
  label: string;
  /** “S03E05 · Children”, or the reason when disabled. */
  meta: string;
  pending: boolean;
  still: string | null;
}>;

export type BigKeyInput = Readonly<{
  episodes: ReadonlyArray<RemoteEpisode>;
  hasAired: boolean;
  /** Next up; null: nothing left; undefined: not known yet (an unseeded tile). */
  nextEpisode: EpisodeRef | null | undefined;
  nextToAir?: NextToAir | null;
  /**
   * The episode being marked (the key keeps naming it until the request
   * ends), or 'next' when it isn't known yet.
   */
  pending?: EpisodeRef | 'next' | null;
  /**
   * Next up is on its way (signed in: the Remote seeds an unseeded show as
   * it opens). The key waits, so a press always marks an episode it names.
   */
  resolving?: boolean;
}>;

const LABEL = 'Watched next episode';

const sameEpisode = (a: EpisodeRef) => (b: EpisodeRef) =>
  a.seasonNumber === b.seasonNumber && a.episodeNumber === b.episodeNumber;

function episodeKey(
  episode: EpisodeRef,
  episodes: ReadonlyArray<RemoteEpisode>,
  pending: boolean,
): BigKeyModel {
  const known = episodes.find(sameEpisode(episode));
  const code = episodeCode(episode);
  return {
    disabled: false,
    episode,
    label: pending ? `Marking ${code}…` : LABEL,
    meta: known ? `${code} · ${known.title}` : code,
    pending,
    still: known?.still ?? null,
  };
}

/** The big key: Watched next episode with the still of the episode it marks. */
export function bigKey({
  episodes,
  hasAired,
  nextEpisode,
  nextToAir,
  pending,
  resolving = false,
}: BigKeyInput): BigKeyModel {
  if (pending && pending !== 'next') {
    return episodeKey(pending, episodes, true);
  }
  if (!pending && resolving && hasAired && nextEpisode === undefined) {
    // one rule wherever it opens: no press until it names the episode
    return {
      disabled: true,
      episode: null,
      label: LABEL,
      meta: '',
      pending: true,
      still: null,
    };
  }
  if (pending === 'next' || (hasAired && nextEpisode === undefined)) {
    // signed out (a press asks to sign in), or a mark already sent unseeded
    return {
      disabled: false,
      episode: null,
      label: pending ? 'Marking…' : LABEL,
      meta: '',
      pending: Boolean(pending),
      still: null,
    };
  }
  if (!hasAired || !nextEpisode) {
    const reason = hasAired ? 'All caught up' : 'Not aired yet';
    return {
      disabled: true,
      episode: null,
      label: LABEL,
      meta: nextToAir ? `${reason} · ${airNote(nextToAir)}` : reason,
      pending: false,
      still: null,
    };
  }
  return episodeKey(nextEpisode, episodes, false);
}

export type SmallKeyId = 'favorites' | 'hide' | 'history' | 'watchlist';

export type SmallKeyModel = Readonly<{
  /** Toggles only: latched when true (`menuitemcheckbox`, `aria-checked`). */
  checked?: boolean;
  id: SmallKeyId;
  label: string;
  shortcut: string;
}>;

export type RemoteVariant = 'show' | 'tile';

const HISTORY: SmallKeyModel = {
  id: 'history',
  label: 'Edit watch history',
  shortcut: 'E',
};

/**
 * The small keys, in focus order. Show page: Edit watch history, favourites,
 * watchlist. In progress tile: Edit watch history, Hide from in progress;
 * on a hidden show (the Library's Hidden shelf) H is latched, "Hidden from
 * in progress", and pressing it brings the show back.
 * The toggles flip their label.
 */
export function smallKeys(
  variant: RemoteVariant,
  status: ListStatus | null,
  { hidden = false }: Readonly<{ hidden?: boolean }> = {},
): ReadonlyArray<SmallKeyModel> {
  if (variant === 'tile') {
    return [
      HISTORY,
      hidden
        ? {
            checked: true,
            id: 'hide',
            label: 'Hidden from in progress',
            shortcut: 'H',
          }
        : { id: 'hide', label: 'Hide from in progress', shortcut: 'H' },
    ];
  }
  const isFavorited = status?.isFavorited ?? false;
  const isWatchlisted = status?.isWatchlisted ?? false;
  return [
    HISTORY,
    {
      checked: isFavorited,
      id: 'favorites',
      label: isFavorited ? 'Remove from favourites' : 'Add to favourites',
      shortcut: 'F',
    },
    {
      checked: isWatchlisted,
      id: 'watchlist',
      label: isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist',
      shortcut: 'W',
    },
  ];
}
