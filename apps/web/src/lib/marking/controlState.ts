import type {
  EpisodeRef,
  LibraryIds,
  SeriesViewerState,
} from '@tvseri.es/schemas';

import { librarySets } from './librarySets';
import {
  isStillComing,
  nextEpisode,
  seasonCountsOf,
  seriesProgress,
} from './progress';
import type { SeriesBase } from './types';

/*
 * Plain (no 'use client'): the server's loader maps the API's answer with it
 * and the controls derive their live state with it.
 */

/**
 * What the marking controls draw for one series (`MarkControl`,
 * `WatchlistToggle`): the viewer's state, reduced to what a control shows.
 * `onWatchlist` is kept in every state: the watchlist-only control is "on"
 * for a started show whose watchlist entry is parked.
 */
export type ControlState = Readonly<
  | { kind: 'new'; onWatchlist: boolean }
  | { kind: 'watchlist'; onWatchlist: boolean }
  | {
      kind: 'watching';
      /** the episode Continue opens; null when the show's facts couldn't be read */
      next: EpisodeRef | null;
      onWatchlist: boolean;
      seasonTotal: number | null;
      seasonWatched: number | null;
    }
  | {
      kind: 'up-to-date';
      /** `YYYY-MM-DD`, when the next episode has a date */
      nextAirDate: string | null;
      onWatchlist: boolean;
    }
  | { kind: 'finished'; onWatchlist: boolean }
>;

/** Every control's state on a page, by series id */
export type ControlStates = Readonly<Record<number, ControlState>>;

/**
 * The page's one read: the states, or `null` signed out (the static pair,
 * no read made)
 */
export type ControlStatesRead = Promise<ControlStates | null>;

/** New to you: the pair (also every id the read failed for) */
export const NEW_TO_YOU: ControlState = { kind: 'new', onWatchlist: false };

/** One series' state from `GET /me/series-states` */
export function toControlState(state: SeriesViewerState): ControlState {
  const { onWatchlist } = state;
  switch (state.state) {
    case 'new':
      // a listed series that isn't started is on the watchlist
      return onWatchlist
        ? { kind: 'watchlist', onWatchlist }
        : { kind: 'new', onWatchlist };
    case 'watchlist':
      return { kind: 'watchlist', onWatchlist: true };
    case 'watching':
      return {
        kind: 'watching',
        next: state.next ?? null,
        onWatchlist,
        seasonTotal: state.next ? (state.seasonTotal ?? null) : null,
        seasonWatched: state.next ? (state.seasonWatched ?? null) : null,
      };
    case 'up-to-date':
      return {
        kind: 'up-to-date',
        nextAirDate: state.nextAirDate ?? null,
        onWatchlist,
      };
    case 'finished':
      return { kind: 'finished', onWatchlist };
  }
}

/** The watchlist-only control's answer: on the watchlist, parked entry included */
export const isOnWatchlist = (state: ControlState): boolean =>
  state.kind === 'watchlist' || state.onWatchlist;

/** A state as a string: one primitive for store selectors, and for equality */
export const controlKey = (state: ControlState): string =>
  JSON.stringify(state);

/** The coarse place the library ids give a series */
type Membership = 'new' | 'watchlist' | 'watching' | 'done';

const membershipOf = (state: ControlState): Membership =>
  state.kind === 'up-to-date' || state.kind === 'finished'
    ? 'done'
    : state.kind;

function membershipIn(ids: LibraryIds, seriesId: number): Membership {
  const sets = librarySets(ids);
  if (sets.watched.has(seriesId)) {
    return 'done';
  }
  if (sets.inProgress.has(seriesId)) {
    return 'watching';
  }
  return sets.watchlist.has(seriesId) ? 'watchlist' : 'new';
}

/** The state a seeded show's marks give (the store's view) */
function stateOfView(view: SeriesBase, streamed: ControlState): ControlState {
  const progress = seriesProgress(view);
  if (!progress.started) {
    const listed = view.status?.isWatchlisted ?? streamed.onWatchlist;
    return listed
      ? { kind: 'watchlist', onWatchlist: true }
      : { kind: 'new', onWatchlist: false };
  }
  // a started show's watchlist entry is parked: only the server's read knows it
  const { onWatchlist } = streamed;
  const next = progress.isFinished ? null : nextEpisode(view);
  if (next) {
    const season = view.seasons.find(
      (item) => item.seasonNumber === next.seasonNumber,
    );
    return {
      kind: 'watching',
      next,
      onWatchlist,
      seasonTotal: season?.episodeCount ?? null,
      seasonWatched: seasonCountsOf(view, next.seasonNumber).watched,
    };
  }
  if (streamed.kind === 'up-to-date') {
    return streamed;
  }
  return isStillComing(view)
    ? { kind: 'up-to-date', nextAirDate: null, onWatchlist }
    : { kind: 'finished', onWatchlist };
}

const sameEpisode = (a: EpisodeRef | null, b: EpisodeRef | null) =>
  a?.seasonNumber === b?.seasonNumber && a?.episodeNumber === b?.episodeNumber;

/** Same state as far as a control can tell from the marks (kind and next episode) */
function sameAsStreamed(live: ControlState, streamed: ControlState): boolean {
  if (
    live.kind !== streamed.kind ||
    live.onWatchlist !== streamed.onWatchlist
  ) {
    return false;
  }
  return live.kind === 'watching' && streamed.kind === 'watching'
    ? sameEpisode(live.next, streamed.next)
    : true;
}

/**
 * The control's state now: the server's (`streamed`) until this tab knows
 * better. A seeded show (the store's `view`: a press, a hover warm-up, a
 * mark anywhere in the tab) decides, but while it agrees with the server on
 * the kind and the next episode the server's state stays, with its facts
 * (the next air date, the season's count), so a warm-up never redraws a
 * control. Without a view, the library ids can only move a series between
 * new and the watchlist (a list press); for the rest the server knows more.
 */
export function liveControlState(
  streamed: ControlState,
  view: SeriesBase | undefined,
  library: LibraryIds | null,
  seriesId: number,
): ControlState {
  if (view && !view.unavailable) {
    const live = stateOfView(view, streamed);
    return sameAsStreamed(live, streamed) ? streamed : live;
  }
  if (!library) {
    return streamed;
  }
  const membership = membershipIn(library, seriesId);
  const listOnly = (place: Membership) =>
    place === 'new' || place === 'watchlist';
  if (
    membership === membershipOf(streamed) ||
    !listOnly(membership) ||
    !listOnly(membershipOf(streamed))
  ) {
    return streamed;
  }
  const onWatchlist = membership === 'watchlist';
  return { kind: membership, onWatchlist };
}
