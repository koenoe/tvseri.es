import type { TvSeries } from '@tvseri.es/schemas';
import { addIsoWeeks, mondayOfIsoWeek } from '@tvseri.es/utils';

import { getCacheItem } from '@/lib/db/cache';
import { readThrough } from '@/lib/db/cache/readThrough';
import { fetchDiscoverTvSeries } from '@/lib/tmdb';

import { pickHiddenGems } from './hiddenGemsPick';

/** TMDB pages in the pool: 80 shows, so weeks can avoid last week's 28 */
const POOL_PAGES = 4;
const POOL_TTL = 7 * 86_400;
/** A week's set outlives the next week, which reads it to avoid it */
const WEEK_TTL = 21 * 86_400;

/**
 * "Hidden gems": rated 8 or more by 50 to 1,000 voters, first aired
 * in the last ten years (from 1 January of the week's year), with a poster.
 * The same for everyone: one Cache-table entry per year, refreshed weekly
 * (4 TMDB calls a week, never per request).
 */
const fetchPool = (year: number) =>
  readThrough(`home:hidden-gems:pool:v1:${year}`, POOL_TTL, async () => {
    const pages = await Promise.all(
      Array.from({ length: POOL_PAGES }, (_, index) =>
        fetchDiscoverTvSeries({
          'first_air_date.gte': `${year - 10}-01-01`,
          page: index + 1,
          sort_by: 'vote_average.desc',
          'vote_average.gte': 8,
          'vote_count.gte': 50,
          'vote_count.lte': 1000,
        }),
      ),
    );
    const seen = new Set<number>();
    const pool = pages
      .flatMap((page) => page.items)
      .filter((item) => {
        const keep = Boolean(item.posterImage) && !seen.has(item.id);
        seen.add(item.id);
        return keep;
      });
    if (pool.length === 0) {
      // A failed read, not an answer: never cache it
      throw new Error('Hidden gems: TMDB returned no shows');
    }
    return pool;
  });

const weekKey = (week: string) => `home:hidden-gems:v1:${week}`;

/**
 * The week's Hidden gems (`YYYY-Www`, ISO, UTC), kept in the Cache table
 * under the week's key, so the set holds all week even when the pool
 * refreshes. Last week's set (its entry, or worked out again from the pool
 * when it is gone) is left out.
 */
export const fetchHiddenGems = (
  week: string,
): Promise<ReadonlyArray<TvSeries>> =>
  readThrough(weekKey(week), WEEK_TTL, async () => {
    const year = Number(mondayOfIsoWeek(week).slice(0, 4));
    const pool = await fetchPool(year);
    const lastWeek = addIsoWeeks(week, -1);
    const previous =
      (await getCacheItem<ReadonlyArray<TvSeries>>(weekKey(lastWeek)).catch(
        () => undefined,
      )) ?? pickHiddenGems(pool, lastWeek, []);
    return pickHiddenGems(
      pool,
      week,
      previous.map((item) => item.id),
    );
  });
