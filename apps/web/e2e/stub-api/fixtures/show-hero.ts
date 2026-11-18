/**
 * The show hero's e2e fixtures (loaded before `show.ts`, so these literal
 * paths win for their ids only):
 * - `1396` recommends The Bear, a real link into the show page for the
 *   soft-navigation `instant()` test.
 * - `900099` is The Bear with a backdrop colour that is not a six-digit hex:
 *   the page must paint the ground and never put the value in its HTML.
 * - `900097` is The Bear without an IMDb rating (the rating read is a 404) and
 *   `900098` The Bear whose rating read fails (500): the hero's actions sit
 *   flush left in both.
 */
import type { TvSeries } from '@tvseri.es/schemas';

import type { StubRoute } from '../types.ts';
import { findShow, SHOW_IDS, toSeries } from './show/catalog.ts';

export const BAD_COLOUR_ID = 900099;
export const NO_RATING_ID = 900097;
export const RATING_DOWN_ID = 900098;

const bear = () => {
  const show = findShow(SHOW_IDS.bear);
  if (!show) {
    throw new Error('stub: The Bear is missing');
  }
  return show;
};

/** The Bear under another id and title (its other reads are this id's 404s). */
const bearAs = (id: number, slug: string, title: string) =>
  ({
    ...toSeries(bear(), { includeImages: false, preferred: undefined }),
    id,
    slug,
    title,
  }) satisfies TvSeries;

export const routes: readonly StubRoute[] = [
  {
    handle: () => ({ body: bearAs(NO_RATING_ID, 'no-rating', 'No Rating') }),
    path: `/series/${NO_RATING_ID}`,
  },
  {
    handle: () => ({ body: { message: 'Not Found' }, status: 404 }),
    path: `/series/${NO_RATING_ID}/rating`,
  },
  {
    handle: () => ({
      body: bearAs(RATING_DOWN_ID, 'rating-down', 'Rating Down'),
    }),
    path: `/series/${RATING_DOWN_ID}`,
  },
  {
    handle: () => ({ body: { message: 'Internal' }, status: 500 }),
    path: `/series/${RATING_DOWN_ID}/rating`,
  },
  {
    handle: () => ({
      body: [
        toSeries(bear(), { includeImages: false, preferred: undefined }),
      ] satisfies TvSeries[],
    }),
    path: '/series/1396/recommendations',
  },
  {
    handle: ({ query }) => ({
      body: {
        ...toSeries(bear(), {
          includeImages: query.get('include_images') === 'true',
          preferred: undefined,
        }),
        backdropColor: 'red;}body{background:url(https://evil.example)}',
        id: BAD_COLOUR_ID,
        slug: 'bad-colour',
        title: 'Bad Colour',
      } satisfies TvSeries,
    }),
    path: `/series/${BAD_COLOUR_ID}`,
  },
];
