'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';

/**
 * The page's overlay URLs, read client-side only (`useSearchParams` inside a
 * Suspense-wrapped island) and written with the native History API (Next
 * syncs `useSearchParams` with it: no server round trip, no page render):
 * - `?history` (`&season=N`): the watch-history sheet
 * - `?season=N&episode=M`: the episode modal; stepping between episodes
 *   replaces its entry
 * - `?season=N` alone: the season the episodes section shows
 *
 * Both overlays work the same way (`openOverlay`, `closeOverlay`): opening
 * one from the page pushes one entry, so Back closes it and Forward reopens
 * it; switching from one to the other (the stub's "Edit watch history")
 * reuses that entry. Closing with ✕ or Escape goes back when this page pushed
 * the entry, so no dead entry stays behind; opened from a direct URL, the
 * URL loses the overlay in place. Everything else replaces the current
 * entry, so the page stays one entry.
 */

/** Marks the entry an overlay pushed (kept while an overlay shows). */
const OVERLAY_ENTRY = 'tvOverlay';

/** Whether this tab's current entry is one an overlay pushed on this page. */
function isOverlayEntry(): boolean {
  const state: unknown = window.history.state;
  return (
    typeof state === 'object' &&
    state !== null &&
    OVERLAY_ENTRY in state &&
    state[OVERLAY_ENTRY] === true
  );
}

const hasOverlay = (query: URLSearchParams) =>
  query.has('episode') || query.has('history');

function writeQuery(
  update: (query: URLSearchParams) => void,
  mode: 'push' | 'replace' = 'replace',
) {
  const url = new URL(window.location.href);
  update(url.searchParams);
  const search = url.searchParams
    .toString()
    .replace(/history=(&|$)/, 'history$1');
  const href = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
  // Only our own key: Next copies its internal state onto it (and would
  // skip syncing the router if we passed its keys back).
  const marked =
    mode === 'push' || (isOverlayEntry() && hasOverlay(url.searchParams));
  const data = marked ? { [OVERLAY_ENTRY]: true } : null;
  if (mode === 'push') {
    window.history.pushState(data, '', href);
  } else {
    window.history.replaceState(data, '', href);
  }
}

const replaceQuery = (update: (query: URLSearchParams) => void) =>
  writeQuery(update);

/** A new entry when no overlay shows yet, else the overlay's own entry. */
function openOverlay(update: (query: URLSearchParams) => void) {
  const showing = hasOverlay(new URL(window.location.href).searchParams);
  writeQuery(update, showing ? 'replace' : 'push');
}

/** Back when this page pushed the overlay's entry, else in place. */
function closeOverlay(update: (query: URLSearchParams) => void) {
  if (isOverlayEntry()) {
    window.history.back();
    return;
  }
  replaceQuery(update);
}

/** Opens the watch-history sheet (on a season's section, when given). */
export function openHistory(seasonNumber?: number) {
  openOverlay((query) => {
    query.delete('episode');
    query.set('history', '');
    if (seasonNumber === undefined) {
      query.delete('season');
    } else {
      query.set('season', String(seasonNumber));
    }
  });
}

/** Closes the sheet (✕, Escape, the backdrop); Back closes it too. */
export function closeHistory() {
  closeOverlay((query) => {
    query.delete('history');
    query.delete('season');
  });
}

/** Opens the modal on an episode, or steps it to another one. */
export function openEpisode(ref: EpisodeRef) {
  openOverlay((query) => {
    query.delete('history');
    query.set('season', String(ref.seasonNumber));
    query.set('episode', String(ref.episodeNumber));
  });
}

/**
 * Closes the modal (×, Escape, the backdrop). `?season` stays when it
 * closes in place, so the wall keeps its season.
 */
export function closeEpisode() {
  closeOverlay((query) => {
    query.delete('episode');
  });
}

/** The season the episodes section shows (`?season=N`). */
export function selectSeason(seasonNumber: number) {
  replaceQuery((query) => {
    query.set('season', String(seasonNumber));
  });
}

export { toNumberParam } from './numberParam';
