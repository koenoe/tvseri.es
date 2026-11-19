import type { ActionError } from '@/lib/actions/result';

import type { PlexState } from '../../_lib/plexState';

/**
 * Every app card's states: Plex's five (not connected, waiting for the
 * first data, receiving, paused, broken) plus `unavailable`, for an app this
 * browser can't connect (dimmed, no brand edge). Colour means data is
 * flowing: only `on` and `paused` get the brand-tinted panel and the filled
 * pill.
 */
export type AppState = PlexState | 'unavailable';

/** The mark before the status line's text. */
export type StatusDot = 'dash' | 'none' | 'paused' | 'receiving' | 'wait';

export const STATE_DOT: Readonly<Record<AppState, StatusDot>> = {
  broken: 'none',
  none: 'none',
  on: 'receiving',
  paused: 'paused',
  unavailable: 'dash',
  wait: 'wait',
};

/** The tinted panel, the filled pill: something has arrived. */
export const isLive = (state: AppState): boolean =>
  state === 'on' || state === 'paused';

/** A card's surface, and its state pill's look */
export type AppSurface = 'available' | 'connected' | 'unavailable';

/** The surface for a state: colour only while live, dimmed where it can't connect */
export const appSurface = (state: AppState): AppSurface => {
  if (state === 'unavailable') {
    return 'unavailable';
  }
  return isLive(state) ? 'connected' : 'available';
};

/** The state pill's word: only a live card says Connected. */
export const statePill = (state: AppState): string => {
  if (state === 'unavailable') {
    return 'Unavailable';
  }
  return isLive(state) ? 'Connected' : 'Available';
};

/** What a failed write on an app's card says (never the API's own text). */
export const appErrorText = (
  app: string,
): Readonly<Record<ActionError, string>> => ({
  failed: 'That didn’t save. Try again.',
  invalid: `${app} doesn’t allow that right now.`,
  'not-found': `${app} isn’t connected any more.`,
  unauthenticated: 'Sign in again to change this.',
});
