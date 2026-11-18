/**
 * `GET /me/series-states?ids=` (the marking control's read), as the API's
 * route answers it (`apps/api/src/lib/seriesStates.ts`): a state per asked
 * id, keyed by the id as a string, shaped by `SeriesViewerState`.
 *
 * - The show rig's viewers (`alex`, `nina`…; `signInAs`): from the viewer's
 *   copy of the stub, by the API's rules: nothing watched is new (or the
 *   watchlist); an aired regular episode still open is watching, with the
 *   first open one and its season's count; everything aired done is up to
 *   date while the show is still coming (the next episode's date when there
 *   is one), else finished. Shows the stub can't mark are new or the
 *   watchlist, from the lists.
 * - Home's invented member (`--auth home`): every state on the spotlight,
 *   from the member's library (`fixtures/home/library.ts`) and the facts
 *   below.
 *
 * A spec that needs one state for any show answers it with `stubFault`
 * (`mode: 'answer'`, `e2e/helpers/seriesStates.ts`).
 */
import {
  type SeriesStates,
  SeriesStatesQuerySchema,
  type SeriesViewerState,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import { TRENDING } from '../../fixtures/home/core.ts';
import { MEMBER_LIBRARY } from '../../fixtures/home/library.ts';
import { viewerFromAuthorization } from '../../fixtures/home/viewer.ts';
import type { StubRoute } from '../types.ts';
import {
  airedEpisodes,
  catalogueShow,
  findShow,
  type StubShow,
} from './show/catalog.ts';
import { fail, isResponse, ok, requireViewer } from './show/http.ts';
import { profileStubShow } from './show/profile-shows.ts';
import {
  episodeCode,
  seriesPrefs,
  seriesWatched,
  type UserState,
  userState,
} from './show/store.ts';

const markable = (id: number): StubShow | undefined =>
  findShow(id) ?? catalogueShow(id) ?? profileStubShow(id);

/** One series for a viewer of the show rig's store */
function stateOf(state: UserState, id: number): SeriesViewerState {
  const onWatchlist = state.watchlist.has(id);
  const show = markable(id);
  const watched = show
    ? [...seriesWatched(state, id).values()].filter(
        (item) => item.seasonNumber > 0,
      )
    : [];
  if (!show || watched.length === 0) {
    return { onWatchlist, state: onWatchlist ? 'watchlist' : 'new' };
  }
  const done = new Set([
    ...watched.map((item) =>
      episodeCode(item.seasonNumber, item.episodeNumber),
    ),
    ...seriesPrefs(state, id).skipped,
  ]);
  const next = airedEpisodes(show).find(
    (episode) => !done.has(episodeCode(episode.season, episode.number)),
  );
  if (next) {
    return {
      next: { episodeNumber: next.number, seasonNumber: next.season },
      onWatchlist,
      seasonTotal: show.episodes.filter((item) => item.season === next.season)
        .length,
      seasonWatched: watched.filter((item) => item.seasonNumber === next.season)
        .length,
      state: 'watching',
    };
  }
  if (show.status === 'Ended' || show.status === 'Canceled') {
    return { onWatchlist, state: 'finished' };
  }
  const coming = show.episodes.find(
    (episode) =>
      episode.season > 0 &&
      !done.has(episodeCode(episode.season, episode.number)),
  );
  return {
    ...(coming?.airDate && { nextAirDate: coming.airDate }),
    onWatchlist,
    state: 'up-to-date',
  };
}

const trendingId = (title: string) =>
  TRENDING.find((show) => show.title === title)?.id ?? 0;

/** Home's member: the facts behind the library's in-progress and watched shows */
const MEMBER_FACTS: ReadonlyMap<number, SeriesViewerState> = new Map([
  [
    trendingId('Task'),
    {
      next: { episodeNumber: 4, seasonNumber: 1 },
      onWatchlist: false,
      seasonTotal: 7,
      seasonWatched: 3,
      state: 'watching',
    },
  ],
  [
    trendingId('Black Mirror'),
    {
      next: { episodeNumber: 4, seasonNumber: 2 },
      onWatchlist: false,
      seasonTotal: 15,
      seasonWatched: 3,
      state: 'watching',
    },
  ],
  [
    trendingId('The Pitt'),
    { nextAirDate: '2026-11-19', onWatchlist: false, state: 'up-to-date' },
  ],
]);

function memberStateOf(id: number): SeriesViewerState {
  const fact = MEMBER_FACTS.get(id);
  if (fact) {
    return fact;
  }
  const onWatchlist = MEMBER_LIBRARY.watchlist.includes(id);
  if (MEMBER_LIBRARY.watched.includes(id)) {
    return { onWatchlist, state: 'finished' };
  }
  if (MEMBER_LIBRARY.inProgress.includes(id)) {
    // the show's facts are not read: Continue with no episode
    return { onWatchlist, state: 'watching' };
  }
  return { onWatchlist, state: onWatchlist ? 'watchlist' : 'new' };
}

export const routes: readonly StubRoute[] = [
  {
    handle: ({ headers, query }) => {
      const home = viewerFromAuthorization(headers.authorization);
      const viewer = home ? null : requireViewer(headers);
      if (viewer && isResponse(viewer)) {
        return viewer;
      }
      const parsed = v.safeParse(SeriesStatesQuerySchema, {
        ids: query.get('ids') ?? '',
      });
      if (!parsed.success) {
        return fail(400, 'Invalid ids');
      }
      const state = viewer ? userState(viewer.id) : undefined;
      const states: Record<string, SeriesViewerState> = {};
      for (const id of parsed.output.ids) {
        states[String(id)] =
          home?.key === 'member'
            ? memberStateOf(id)
            : state
              ? stateOf(state, id)
              : { onWatchlist: false, state: 'new' };
      }
      return ok({ states } satisfies SeriesStates);
    },
    path: '/me/series-states',
  },
];
