import 'server-only';

import type { Keyword, Rating, Season, TvSeries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { loadSeries, loadSeriesCredits } from '@/lib/series/loaders';

import {
  type ShowSeasonEpisodes,
  toShowSeasonEpisodes,
} from '@/lib/series/seasonEpisodes';

/**
 * The show page's own cached reads, trimmed to what the page draws inside
 * the cached scope (primitive keys only). Shared sections prerender into the
 * show's static shell: each read goes through `tryApi`, and exactly one
 * `cacheLife` per run, the API's profile or `unavailable` (revalidated
 * after 30 s) when Unavailable.
 */

export type ShowResult =
  | Readonly<{ status: 'ok'; series: TvSeries }>
  | Readonly<{ status: 'not-found' }>
  | Unavailable;

/**
 * The show for the page and its metadata: found, not found (or adult), or
 * Unavailable. Built on the one cached `/series/:id` read (`loadSeries`,
 * which answers an outage itself), so it needs no cache scope of its own.
 */
export async function loadShow(id: number): Promise<ShowResult> {
  const series = await loadSeries(id);
  if (isUnavailable(series)) {
    return series;
  }
  return series && !series.isAdult
    ? { series, status: 'ok' }
    : { status: 'not-found' };
}

const CAST_SIZE = 10;

export type CastMember = Readonly<{
  id: number;
  name: string;
  character: string;
  image: string;
  slug: string;
}>;

/**
 * `GET /series/:id/credits` (the one cached read, `loadSeriesCredits`): the
 * first 10 of the cast.
 */
export async function loadCast(
  id: number,
): Promise<ReadonlyArray<CastMember> | Unavailable> {
  const credits = await loadSeriesCredits(id);
  if (isUnavailable(credits)) {
    return credits;
  }
  return (credits?.cast ?? []).slice(0, CAST_SIZE).map((person) => ({
    character: person.character,
    id: person.id,
    image: person.image,
    name: person.name,
    slug: person.slug,
  }));
}

/**
 * `GET /series/:id/season/:n`, trimmed inside the cache to what the page's
 * client parts read: the one cached read of a season's episodes for the
 * wall (shell and viewer hole), the Remote's titles and stills, and the
 * season route the client parts load other seasons from. Null when the API
 * doesn't know the season; `Unavailable` (the short `unavailable` life) on an
 * outage, so a prerender never fails on one.
 */
export async function loadSeasonEpisodes(
  seriesId: number,
  seasonNumber: number,
): Promise<ShowSeasonEpisodes | null | Unavailable> {
  'use cache';
  cacheTag(tags.series(seriesId));
  const season = await tryApi(() =>
    apiFetch<Season>('/series/:id/season/:season', {
      notFound: 'null',
      params: { id: seriesId, season: seasonNumber },
    }),
  );
  cacheLifeFor('short', season);
  if (isUnavailable(season)) {
    return season;
  }
  return season ? toShowSeasonEpisodes(season) : null;
}

/**
 * The season as the wall draws it (`loadSeasonEpisodes`): empty when the API
 * doesn't know it, null when the read failed (the wall's error state).
 */
export async function loadWallEpisodes(
  seriesId: number,
  seasonNumber: number,
): Promise<ShowSeasonEpisodes | null> {
  const season = await loadSeasonEpisodes(seriesId, seasonNumber);
  if (isUnavailable(season)) {
    return null;
  }
  return season ?? { episodes: [], seasonNumber };
}

/** `GET /series/:id/keywords`; [] when the show has none. */
export async function loadKeywords(
  id: number,
): Promise<ReadonlyArray<Keyword> | Unavailable> {
  'use cache';
  cacheTag(tags.series(id));
  const keywords = await tryApi(() =>
    apiFetch<Keyword[]>('/series/:id/keywords', {
      notFound: 'null',
      params: { id },
    }),
  );
  cacheLifeFor('medium', keywords);
  if (isUnavailable(keywords)) {
    return keywords;
  }
  return (keywords ?? []).map(({ id: keywordId, name }) => ({
    id: keywordId,
    name,
  }));
}

export type Recommendation = Readonly<{
  id: number;
  slug: string;
  title: string;
  poster: string;
}>;

/** `GET /series/:id/recommendations`, trimmed to the poster tile. */
export async function loadRecommendations(
  id: number,
): Promise<ReadonlyArray<Recommendation> | Unavailable> {
  'use cache';
  cacheTag(tags.series(id));
  const items = await tryApi(() =>
    apiFetch<TvSeries[]>('/series/:id/recommendations', {
      notFound: 'null',
      params: { id },
    }),
  );
  cacheLifeFor('short', items);
  if (isUnavailable(items)) {
    return items;
  }
  return (items ?? [])
    .filter((item) => !item.isAdult)
    .map((item) => ({
      id: item.id,
      poster: item.posterImage,
      slug: item.slug,
      title: item.title,
    }));
}

export type ShowRating = Readonly<{ value: number; votes: number }>;

/** `GET /series/:id/rating?source=imdb`; null without a rating. */
export async function loadRating(
  id: number,
): Promise<ShowRating | null | Unavailable> {
  'use cache';
  cacheTag(tags.series(id));
  const rating = await tryApi(() =>
    apiFetch<Rating | null>('/series/:id/rating', {
      notFound: 'null',
      params: { id },
      query: { source: 'imdb' },
    }),
  );
  cacheLifeFor('short', rating);
  if (isUnavailable(rating)) {
    return rating;
  }
  return rating && rating.value > 0
    ? { value: rating.value, votes: rating.votes }
    : null;
}

/**
 * `GET /series/:id/content-rating?region=` ("15", "TV-MA"), per region. Read
 * in the viewer's region hole (request time), so a failure isn't cached.
 */
export async function loadContentRating(
  id: number,
  region: string,
): Promise<string | null> {
  'use cache';
  cacheLife('medium');
  cacheTag(tags.series(id));
  const rating = await apiFetch<string | null>('/series/:id/content-rating', {
    notFound: 'null',
    params: { id },
    query: { region },
  });
  return rating || null;
}
