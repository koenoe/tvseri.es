import type { Page } from '@playwright/test';
import type { SeriesViewerState } from '@tvseri.es/schemas';

import { type StubViewer, stubFault } from './session';

/**
 * Fixtures for the marking control's read (`GET /me/series-states`): one
 * per state the API answers. `answerStates` makes this test's read answer
 * them for the given ids (after `delayMs`: the ghost's moment on screen).
 */
export const STATES = {
  finished: { onWatchlist: false, state: 'finished' },
  new: { onWatchlist: false, state: 'new' },
  'up-to-date': {
    nextAirDate: '2026-11-19',
    onWatchlist: false,
    state: 'up-to-date',
  },
  watching: {
    next: { episodeNumber: 4, seasonNumber: 1 },
    onWatchlist: false,
    seasonTotal: 8,
    seasonWatched: 3,
    state: 'watching',
  },
  watchlist: { onWatchlist: true, state: 'watchlist' },
} as const satisfies Readonly<Record<string, SeriesViewerState>>;

export type StateName = keyof typeof STATES;

export async function answerStates(
  viewer: StubViewer,
  states: Readonly<Record<number, SeriesViewerState>>,
  delayMs = 0,
): Promise<void> {
  await stubFault(viewer, {
    body: { states },
    delayMs,
    mode: 'answer',
    path: '/me/series-states',
  });
}

/** A show's id from a link to it (`/{id}/{slug}`) */
export const idOfHref = (href: string | null): number =>
  Number(href?.split('/')[1] ?? Number.NaN);

/** An element's box in document coordinates, rounded */
export const boxOf = (page: Page, selector: string) =>
  page.evaluate((css) => {
    const element = [...document.querySelectorAll(css)].find(
      (candidate) => candidate.getClientRects().length > 0,
    );
    if (!element) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return {
      height: Math.round(rect.height),
      width: Math.round(rect.width),
      x: Math.round(rect.x + window.scrollX),
      y: Math.round(rect.y + window.scrollY),
    };
  }, selector);
