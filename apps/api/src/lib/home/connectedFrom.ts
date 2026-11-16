import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';
import type {
  ConnectedFrom,
  ConnectedPath,
  TvSeries,
} from '@tvseri.es/schemas';

import { DAY_BUILD_TTL, readDayBuild } from '@/lib/db/cache/readThroughDay';
import { hasTimeForAnother } from '@/lib/deadline';
import { fetchTrending } from '@/lib/mdblist';
import {
  fetchPersonTvCredits,
  fetchTvSeriesBase,
  fetchTvSeriesCredits,
} from '@/lib/tmdb';
import { PARTIAL_TTL } from '@/utils/cacheHeader';
import { logWarn } from '@/utils/logWarn';

import {
  type Connection,
  type ConnectionSource,
  findPathsFrom,
  type Link,
} from './connected';

/**
 * TMDB for the search: a show's aggregate cast (all seasons, main cast
 * first) and a person's shows as their TV credits list them (with a poster
 * and a genre; talk, news and reality left out), which carry everything a
 * chain draws, so no show is read on its own
 */
const source: ConnectionSource<TvSeries> = {
  castOf: async (showId) => (await fetchTvSeriesCredits(showId)).cast,
  hasTime: hasTimeForAnother,
  showsOf: async (personId) =>
    (await fetchPersonTvCredits(personId))?.cast.previous ?? [],
};

const personNode = ({ characters, person }: Link) =>
  ({
    person: {
      characters,
      id: person.id,
      image: person.image,
      name: person.name,
      slug: person.slug,
    },
    type: 'person',
  }) as const;

const toPath = (
  start: TvSeries,
  { bridge, end, links }: Connection<TvSeries>,
): ConnectedPath => ({
  nodes: [
    { series: start, type: 'show' },
    personNode(links[0]),
    { series: bridge, type: 'show' },
    personNode(links[1]),
    { series: end, type: 'show' },
  ],
  steps: 2,
});

type Cached = Readonly<{
  partial: boolean;
  /** undefined: no path from this show (or it isn't one) */
  result: ConnectedFrom | undefined;
}>;

/** This week's trending shows: an end is never one of them */
const trendingIds = async (): Promise<ReadonlySet<number> | undefined> => {
  try {
    return new Set(await fetchTrending());
  } catch (error) {
    logWarn('Connected by: trending list failed', error);
    return undefined;
  }
};

const build = async (from: number, date: string): Promise<Cached> => {
  const [start, trending] = await Promise.all([
    fetchTvSeriesBase(from).catch((error: unknown) => {
      logWarn(`Connected by: show ${from} failed`, error);
      return null;
    }),
    trendingIds(),
  ]);
  if (start === null) {
    return { partial: true, result: undefined };
  }
  if (!start) {
    return { partial: false, result: undefined };
  }
  const { connections, partial } = await findPathsFrom(from, source, {
    avoid: trending,
  });
  const paths = connections.map((connection) => toPath(start, connection));
  return {
    partial: partial || !trending,
    result: paths.length > 0 ? { date, from, paths } : undefined,
  };
};

/**
 * Kept a day; an incomplete build an hour; "no path from here" a day too
 * (so a show without paths isn't searched again on every read), unless it
 * came from failed lookups (not kept: the next read tries again)
 */
const cachedFor = ({ partial, result }: Cached) =>
  partial ? (result ? PARTIAL_TTL : false) : DAY_BUILD_TTL;

/**
 * The two-step paths from one start show (`findPathsFrom`: up to 8, best
 * first), built once a day per show and shared by every visitor whose start
 * it is: the signed-out toy's trending start and each signed-in viewer's
 * finished show. A cold build costs at most 30 TMDB calls (the start's
 * details and the search's 29) and the trending list (a stored MDBList
 * read); a warm one none (Cache table, then the CDN). Yesterday's build of
 * the same show stands in while today's is built or can't be.
 */
export const fetchConnectedFrom = (
  from: number,
  date: string,
): Promise<Cached> =>
  readDayBuild<Cached>({
    day: date,
    key: (day) => `home:connected:v${HOME_MOMENTS_VERSION}:${from}:${day}`,
    load: () => build(from, date),
    ttl: cachedFor,
  });
