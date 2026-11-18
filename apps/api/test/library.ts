import { db } from './db';

const pad = (value: number) => String(value).padStart(3, '0');

/** A list item as the API writes it (gsi1 by title, gsi2 by `createdAt`) */
export const listItem = (
  userId: string,
  list: string,
  id: number,
  createdAt = 1,
) => ({
  createdAt,
  gsi1pk: `LIST#${userId}#${list}`,
  gsi1sk: `show ${id}`,
  gsi2pk: `LIST#${userId}#${list}`,
  gsi2sk: createdAt,
  id,
  pk: `USER#${userId}`,
  posterPath: `/p${id}.jpg`,
  sk: `LIST#${list}#ITEM#${id}`,
  slug: `show-${id}`,
  title: `Show ${id}`,
});

/**
 * Seeds a user's lists: `{ FAVORITES: [1, 2] }`. Earlier ids are newer
 * (higher `createdAt`), like a list read newest first.
 */
export const seedLibrary = (
  userId: string,
  lists: Readonly<Record<string, ReadonlyArray<number>>>,
) =>
  db.seed(
    'Lists',
    Object.entries(lists).flatMap(([list, ids]) =>
      ids.map((id, index) => listItem(userId, list, id, 10_000 - index)),
    ),
  );

/** Seeds watched episodes (`[season, episode]`), a second apart from `at` */
export const seedWatched = (
  userId: string,
  seriesId: number,
  episodes: ReadonlyArray<readonly [number, number]>,
  at = '2026-11-10T20:00:00Z',
  runtime?: number,
) =>
  db.seed(
    'Watched',
    episodes.map(([season, episode], index) => ({
      ...(runtime !== undefined && { runtime }),
      episodeNumber: episode,
      gsi1pk: `USER#${userId}#SERIES#${seriesId}`,
      gsi1sk: `S${pad(season)}#E${pad(episode)}`,
      pk: `USER#${userId}`,
      seasonNumber: season,
      seriesId,
      sk: `SERIES#${seriesId}#S${pad(season)}#E${pad(episode)}`,
      userId,
      watchedAt: Date.parse(at) + index * 1000,
    })),
  );

/** `[season, from]` to `[season, to]` */
export const episodes = (season: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => [season, from + i] as const);

/** A TMDB episode object (for `next_episode_to_air` / `last_episode_to_air`) */
export const tmdbEpisode = (
  season: number,
  number: number,
  airDate: string,
) => ({
  air_date: airDate,
  episode_number: number,
  id: season * 100 + number,
  name: 'E',
  season_number: season,
});
