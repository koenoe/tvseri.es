import * as v from 'valibot';

import { IsoDateSchema } from './discover';
import { idListSchema } from './id-list-query';
import { EpisodeRefSchema } from './marking';

/** Most ids one `GET /me/series-states` takes */
export const SERIES_STATES_MAX_IDS = 60;

/** `GET /me/series-states?ids=1234,5678`: 1 to 60 distinct series ids */
export const SeriesStatesQuerySchema = v.object({
  ids: idListSchema(SERIES_STATES_MAX_IDS),
});

export type SeriesStatesQuery = v.InferOutput<typeof SeriesStatesQuerySchema>;

const count = v.pipe(v.number(), v.integer(), v.minValue(0));

const onWatchlist = v.boolean();

/**
 * The signed-in viewer's relationship with one series (the "+ Watchlist /
 * Seen it" control). `onWatchlist` is set in every state; a show being
 * watched has its watchlist entry parked, so it is usually false there.
 *
 * - `new`: in none of the viewer's lists and nothing watched
 * - `watchlist`: on the watchlist, not started
 * - `watching`: In progress with an aired regular episode still open.
 *   `next` is the episode Continue opens (the profile's Up next rule) and
 *   `seasonWatched` of `seasonTotal` the progress in its season; the three
 *   are all there, or all absent when the show's facts couldn't be read
 * - `up-to-date`: everything aired is watched and the show is still coming
 *   (not Ended or Canceled, as Waiting for counts it); `nextAirDate` when
 *   TMDB has a date for the next episode
 * - `finished`: everything watched and nothing more expected (also a
 *   finished show whose facts couldn't be read)
 */
export const SeriesViewerStateSchema = v.variant('state', [
  v.object({ onWatchlist, state: v.literal('new') }),
  v.object({ onWatchlist, state: v.literal('watchlist') }),
  v.object({
    next: v.optional(EpisodeRefSchema),
    onWatchlist,
    seasonTotal: v.optional(count),
    seasonWatched: v.optional(count),
    state: v.literal('watching'),
  }),
  v.object({
    nextAirDate: v.optional(IsoDateSchema),
    onWatchlist,
    state: v.literal('up-to-date'),
  }),
  v.object({ onWatchlist, state: v.literal('finished') }),
]);

export type SeriesViewerState = Readonly<
  v.InferOutput<typeof SeriesViewerStateSchema>
>;

/** `GET /me/series-states`: a state for every asked id, keyed by the id as a string */
export const SeriesStatesSchema = v.object({
  states: v.record(v.string(), SeriesViewerStateSchema),
});

export type SeriesStates = Readonly<{
  states: Readonly<Record<string, SeriesViewerState>>;
}>;
