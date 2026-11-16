import 'server-only';

import type {
  StatsCountries,
  StatsDaily,
  StatsFavoritesCount,
  StatsFinished,
  StatsGenreItem,
  StatsNewOrBack,
  StatsProviderItem,
  StatsShows,
  StatsSpotlight,
  StatsSummary,
  StatsWatchedSeriesItem,
  StatsWeeklyItem,
  StatsWhen,
  TvSeries,
} from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { type ProfileCounts, readProfileCounts } from '@/lib/profile/counts';
import { loadProfileUser, type ProfileUser } from '@/lib/profile/user';
import { loadSeries } from '@/lib/series/loaders';
import { statsTag, usernameTag, userTag } from '@/lib/stats/tags';

import { memberSince } from '../../../(profile)/_lib/format';

/**
 * The Stats page's reads. Everything is public and about the profile owner,
 * so every loader is `'use cache'` (tags `user:{id}` and `stats:{id}`; the
 * year sections on the `stats` profile, the counts on `statsCurrent`), never reads the viewer, and never throws during a
 * prerender: an API failure is `Unavailable` with `cacheLife('unavailable')`.
 */

export type Loaded<T> = T | Unavailable;

export { isUnavailable };

/** The public identity the sidebar draws */
export type StatsUser = Readonly<{
  id: string;
  username: string;
  /** ISO date */
  createdAt: string;
  /**
   * "today" or "Nov 2024" ("Member since …", the profile's rule), read when
   * the user is: the page can't read the clock outside a cache scope.
   */
  memberSince: string;
  watchProviders: ReadonlyArray<
    Readonly<{ id: number; name: string; logo: string }>
  >;
}>;

const toStatsUser = (user: ProfileUser): StatsUser => ({
  createdAt: user.createdAt,
  id: user.id,
  memberSince: memberSince(user.createdAt, Date.now()),
  username: user.username,
  watchProviders: user.watchProviders.map(({ id, logo, name }) => ({
    id,
    logo,
    name,
  })),
});

/**
 * `/u/{username}` → the public user, `null` for an unknown username,
 * `Unavailable` when the API doesn't answer. Both kept briefly: an unknown
 * name 30 s, so a new sign-up's page appears soon; a found user 5 minutes,
 * not the sections' day, because the lookup it reads is the CDN's copy (a
 * minute, ten more stale): a visit right after an account deletion can
 * still find the user there, and must not keep the deleted user's page for
 * a day. A rename drops the `username:{u}` tag.
 */
export async function getStatsUser(
  username: string,
): Promise<Loaded<StatsUser | null>> {
  'use cache';
  cacheTag(usernameTag(username));
  const user = await tryApi(() => loadProfileUser(username));
  if (isUnavailable(user)) {
    cacheLife('unavailable');
    return user;
  }
  if (!user) {
    cacheLife('unavailable');
    return null;
  }
  cacheLife('statsCurrent');
  cacheTag(userTag(user.id), statsTag(user.id));
  return toStatsUser(user);
}

/**
 * One public read about the user, cached with `stats` (fresh a day, served
 * stale up to a week, as the API's CDN copy lives as long).
 */
async function readStats<T>(
  userId: string,
  path: string,
  params: Readonly<Record<string, string | number>>,
): Promise<Loaded<T>> {
  'use cache';
  cacheTag(userTag(userId), statsTag(userId));
  const result = await tryApi(() =>
    apiFetch<T>(path, { params: { ...params, id: userId } }),
  );
  if (isUnavailable(result)) {
    cacheLife('unavailable');
  } else {
    cacheLife('stats');
  }
  return result;
}

const segment =
  <T>(name: string) =>
  (userId: string, year: number): Promise<Loaded<T>> =>
    readStats<T>(userId, `/user/:id/stats/:year/${name}`, { year });

export const getSummary = segment<StatsSummary>('summary');
export const getFavoritesCount =
  segment<StatsFavoritesCount>('favorites-count');
export const getSpotlight = segment<StatsSpotlight>('spotlight');
export const getWeekly = segment<ReadonlyArray<StatsWeeklyItem>>('weekly');
export const getGenres = segment<ReadonlyArray<StatsGenreItem>>('genres');
export const getProviders =
  segment<ReadonlyArray<StatsProviderItem>>('providers');
export const getCountries = segment<StatsCountries>('countries');
export const getWatchedSeries =
  segment<ReadonlyArray<StatsWatchedSeriesItem>>('watched-series');
export const getShows = segment<StatsShows>('shows');
export const getFinished = segment<StatsFinished>('finished');
export const getDaily = segment<StatsDaily>('daily');
export const getWhen = segment<StatsWhen>('when');
export const getNewOrBack = segment<StatsNewOrBack>('new-or-back');

/**
 * The sidebar's counts ("5,341 episodes, 218 finished", followers). They
 * live 5 minutes (not the year sections' day): a page regenerated
 * right after a first mark, before the stream had counted it, would
 * otherwise keep "0 episodes" for a day; a mark also expires `stats:{id}`.
 */
export async function getProfileCounts(
  userId: string,
): Promise<Loaded<ProfileCounts>> {
  'use cache';
  cacheTag(userTag(userId), statsTag(userId));
  const counts = await tryApi(() => readProfileCounts(userId));
  if (isUnavailable(counts)) {
    cacheLife('unavailable');
    return counts;
  }
  cacheLife('statsCurrent');
  return counts;
}

/** The art and season sizes a stats block needs from a show */
export type SeriesArt = Readonly<{
  id: number;
  title: string;
  slug: string;
  backdropImage: string | null;
  backdropColor: string | null;
  titleTreatmentImage: string | null;
  posterImage: string | null;
  /** Regular seasons: number → episode count */
  seasons: ReadonlyArray<Readonly<{ number: number; episodes: number }>>;
}>;

/** `GET /series/:id` trimmed to `SeriesArt`; null when the show is gone */
export async function getSeriesArt(
  id: number,
): Promise<Loaded<SeriesArt | null>> {
  'use cache';
  cacheTag(`series:${id}`);
  // `loadSeries` answers an outage itself: `tryApi` around a cached loader
  // never sees one (its error crosses the cache as a plain `Error`)
  const series = await loadSeries(id);
  if (isUnavailable(series)) {
    cacheLife('unavailable');
    return series;
  }
  cacheLife('short');
  return series ? toSeriesArt(series) : null;
}

const toSeriesArt = (series: TvSeries): SeriesArt => ({
  backdropColor: series.backdropColor ?? null,
  backdropImage: series.backdropImage ?? null,
  id: series.id,
  posterImage: series.posterImage ?? null,
  seasons: (series.seasons ?? [])
    .filter((season) => season.seasonNumber > 0)
    .map((season) => ({
      episodes: season.numberOfEpisodes ?? 0,
      number: season.seasonNumber,
    })),
  slug: series.slug,
  title: series.title,
  titleTreatmentImage: series.titleTreatmentImage ?? null,
});

/** A poster for "Popular unwatched" */
export type PopularItem = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterImage: string | null;
  genre: string | null;
  episodes: number | null;
}>;

/** `GET /popular/:year` (the catalogue's popular shows of the year) */
export async function getPopular(
  year: number,
): Promise<Loaded<ReadonlyArray<PopularItem>>> {
  'use cache';
  cacheTag(`popular:${year}`);
  const items = await tryApi(() =>
    apiFetch<ReadonlyArray<TvSeries>>('/popular/:year', { params: { year } }),
  );
  if (isUnavailable(items)) {
    cacheLife('unavailable');
    return items;
  }
  cacheLife('medium');
  return items.map((series) => ({
    episodes: series.numberOfEpisodes ?? null,
    genre: series.genres[0]?.name ?? null,
    id: series.id,
    posterImage: series.posterImage ?? null,
    slug: series.slug,
    title: series.title,
  }));
}
