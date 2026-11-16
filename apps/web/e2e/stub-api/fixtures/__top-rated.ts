import type { TvSeries } from '@tvseri.es/schemas';

import { PICK_DECK } from '../../fixtures/home/premieres.ts';
import type { StubRoute } from '../types';
import { SHOWS } from './discover/shows';

/** As the API reads the owner's MDBList list (`LIST_SIZES.topRated`) */
const LIST_SIZE = 24;

const deckIds = new Set(PICK_DECK.map((series) => series.id));

/**
 * `GET /collection/top-rated`: the owner's MDBList list as the API sends it
 * (posters only, in the list's order). Discover's numbered All-time
 * favourites draws its first 20; Home's pick deck rotates through all of
 * it. The catalogue's best rated first, then a fixed deck. Sorts before
 * `_home.ts`, so this list answers for both.
 */
export const TOP_RATED: ReadonlyArray<TvSeries> = [
  ...SHOWS.map((entry) => entry.series)
    .filter((series) => !deckIds.has(series.id))
    .sort((a, b) => b.voteAverage - a.voteAverage),
  ...PICK_DECK,
].slice(0, LIST_SIZE);

export const routes: readonly StubRoute[] = [
  { handle: () => ({ body: TOP_RATED }), path: '/collection/top-rated' },
];
