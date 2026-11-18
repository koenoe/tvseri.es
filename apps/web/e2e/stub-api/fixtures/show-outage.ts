/**
 * Outages for the show page's data-down checks (`show-outage.spec.ts`).
 * Every id here is used by that spec only, so a cached failure never
 * reaches another test.
 *
 * - `OUTAGE_IDS.down`: the show's core read answers 503 at once.
 * - `OUTAGE_IDS.hang`: the core read never answers in time (the web's own
 *   fetch timeout ends it).
 * - `OUTAGE_IDS.sections`: the show loads, every other read of it (cast,
 *   seasons, recommendations, keywords, rating, credits) answers 503.
 */
import type { StubRequest, StubResponse, StubRoute } from '../types.ts';
import { findShow, SHOW_IDS, toSeries } from './show/catalog.ts';
import { fail, ok } from './show/http.ts';

export const OUTAGE_IDS = {
  down: 900090,
  hang: 900091,
  sections: 900092,
} as const;

/** Longer than the web's fetch timeout (10 s): the web gives up first. */
const HANG_MS = 25_000;

const UNAVAILABLE = fail(503, 'Service Unavailable');

const isOutage = (request: StubRequest, id: number) =>
  request.params.id === String(id);

const bear = findShow(SHOW_IDS.bear);

const hang = (): Promise<StubResponse> =>
  new Promise((resolve) => setTimeout(() => resolve(UNAVAILABLE), HANG_MS));

export const routes: readonly StubRoute[] = [
  {
    handle: (request) => {
      if (isOutage(request, OUTAGE_IDS.down)) {
        return UNAVAILABLE;
      }
      if (isOutage(request, OUTAGE_IDS.hang)) {
        return hang();
      }
      if (isOutage(request, OUTAGE_IDS.sections) && bear) {
        return ok(
          toSeries(
            {
              ...bear,
              id: OUTAGE_IDS.sections,
              slug: 'partial-outage',
              title: 'Partial Outage',
            },
            {
              includeImages: request.query.get('include_images') === 'true',
              preferred: undefined,
            },
          ),
        );
      }
      return undefined;
    },
    path: '/series/:id',
  },
  // Everything below the core read, for the one show whose sections fail
  ...[
    '/series/:id/season/:n',
    '/series/:id/runtimes',
    '/series/:id/season/:s/ratings',
    '/series/:id/season/:s/episode/:e',
    '/series/:id/credits',
    '/series/:id/recommendations',
    '/series/:id/keywords',
    '/series/:id/rating',
    '/series/:id/content-rating',
    '/series/:id/watch-providers',
  ].map(
    (path): StubRoute => ({
      handle: (request) =>
        isOutage(request, OUTAGE_IDS.sections) ? UNAVAILABLE : undefined,
      path,
    }),
  ),
];
