import 'server-only';

import { cache } from 'react';

import { apiFetch } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';
import { type CountKey, readCount, showsWatched } from '@/lib/profile/counts';
import { getYears } from '@/lib/stats/getYears';

/**
 * The viewer's numbers for the hero, the profile preview and Your data. Every
 * one is per user and changes the moment something is marked or imported, so
 * none of them goes into a shared cache (the API doesn't CDN-cache them
 * either). A failed read is `null`: the line shows without that number
 * instead of failing the section. What each count means is said once, in
 * `@/lib/profile/counts`.
 */
export type SettingsCounts = Readonly<{
  episodes: number | null;
  /** Shows with a finish: the profile's "N finished" (the preview) */
  finished: number | null;
  /** Shows the viewer has watched anything of, finished or not (the header and Your data say "shows") */
  shows: number | null;
  followers: number | null;
  following: number | null;
}>;

const countOf = async (
  userId: string,
  key: CountKey,
): Promise<number | null> => {
  try {
    return await readCount(userId, key);
  } catch {
    return null;
  }
};

export const loadSettingsCounts = cache(
  async (userId: string): Promise<SettingsCounts> => {
    const [episodes, finished, watching, followers, following] =
      await Promise.all([
        countOf(userId, 'episodes'),
        countOf(userId, 'finished'),
        countOf(userId, 'watching'),
        countOf(userId, 'followers'),
        countOf(userId, 'following'),
      ]);
    const shows =
      finished === null || watching === null
        ? null
        : showsWatched(finished, watching);
    return { episodes, finished, followers, following, shows };
  },
);

/** All-time watch time in minutes (`/watched/runtime`). */
export const loadRuntimeMinutes = cache(
  async (userId: string): Promise<number | null> => {
    try {
      const { runtime } = await apiFetch<Readonly<{ runtime: number }>>(
        '/user/:id/watched/runtime',
        { params: { id: userId } },
      );
      return runtime;
    } catch {
      return null;
    }
  },
);

/**
 * The year of the first dated mark: the oldest year in `/stats/years`
 * (`getYears`: 5 minutes, and an import expires it), so an import that adds
 * older history shows here on the next read instead of a day later.
 */
export const loadFirstMarkYear = cache(
  async (userId: string): Promise<number | null> => {
    const answer = await getYears(userId);
    if (isUnavailable(answer)) {
      return null;
    }
    return answer.years.reduce<number | null>(
      (first, { year }) => (first === null || year < first ? year : first),
      null,
    );
  },
);
