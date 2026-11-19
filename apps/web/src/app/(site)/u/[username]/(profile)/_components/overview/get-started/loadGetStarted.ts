import 'server-only';

import {
  GetStartedStatusSchema,
  type LibraryIds,
  type TvSeries,
  type WatchProvider,
} from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';
import { streamingServices } from '@/lib/watchProviders/streamingServices';

import { loadViewerLibrary } from '../../../_data/library';
import { type Profile, withToken } from '../../../_data/profile';
import { loadTrending } from '../../../_data/trending';
import { orNull } from '../../../_lib/orNull';
import { loadStartDeck } from '../../sidebar/start/loadStart';
import { borrowedUpNextIds } from '../up-next/loadUpNext';

/** Providers shown as chips, six of them */
const PROVIDERS = 6;
/** Posters in Already seen: eight, a row on desktop */
const SHOWS = 8;
/** Trending shows read, so eight remain after leaving out the viewer's own */
const CANDIDATES = 20;
const DEFAULT_REGION = 'GB';

export type SeenShow = Pick<TvSeries, 'id' | 'posterImage' | 'title'>;

/**
 * Null when the read fails or its answer is not a status: the block then
 * hides. Deliberately not shared with Home's `getGetStarted`: a failure
 * there fails the whole slot, here it hides only this block.
 */
export const loadGetStartedStatus = (profile: Profile) =>
  orNull(
    apiFetch('/me/get-started', {
      ...withToken(profile),
      schema: GetStartedStatusSchema,
    }),
  );

/**
 * The services you can pick in your region, and the shows to mark as seen:
 * Popular this week, minus every show already in one of your lists (a show
 * you have any history of is never offered, so "seen" can't touch it), and
 * minus the shows Up next and Pick one borrowed: a show appears
 * in one day-one block only, and this grid comes last.
 */
export async function loadGetStartedChoices(
  profile: Profile,
  country: string | null | undefined,
): Promise<
  Readonly<{
    providers: ReadonlyArray<WatchProvider>;
    shows: ReadonlyArray<SeenShow>;
  }>
> {
  const region = country || DEFAULT_REGION;
  // The region's services are read uncached and without colours here, on
  // purpose: Settings' `loadRegionProviders` is cached and carries colours.
  const [providers, shows, library, taken] = await Promise.all([
    orNull(
      apiFetch<ReadonlyArray<WatchProvider>>('/discover/watch-providers', {
        query: { region },
      }),
    ),
    loadTrending(),
    loadViewerLibrary(profile),
    borrowedShowIds(profile),
  ]);
  return {
    providers: streamingServices(providers ?? []).slice(0, PROVIDERS),
    shows: unseenShows(shows ?? [], library, taken),
  };
}

/** The shows Up next and a borrowed Pick one deck show */
async function borrowedShowIds(profile: Profile): Promise<ReadonlySet<number>> {
  const [upNext, deck] = await Promise.all([
    borrowedUpNextIds(profile),
    loadStartDeck(profile),
  ]);
  const deckIds =
    deck.source === 'watchlist' ? [] : deck.cards.map((card) => card.id);
  return new Set([...upNext, ...deckIds]);
}

/**
 * The shows to offer: none the viewer has in a list, none another day-one
 * block shows (`taken`); without the library, none at all. Trimmed to what
 * a tile draws: they cross to the client, never whole shows.
 */
export function unseenShows(
  shows: ReadonlyArray<SeenShow>,
  library: LibraryIds | null,
  taken: ReadonlySet<number> = new Set(),
): ReadonlyArray<SeenShow> {
  if (!library) {
    return [];
  }
  const known = new Set([
    ...library.favorites,
    ...library.inProgress,
    ...library.watched,
    ...library.watchlist,
    ...taken,
  ]);
  return shows
    .slice(0, CANDIDATES)
    .filter((show) => !known.has(show.id))
    .slice(0, SHOWS)
    .map(({ id, posterImage, title }) => ({ id, posterImage, title }));
}
