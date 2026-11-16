/**
 * Stats cache key management - single source of truth for all stats cache keys.
 */

const STATS_CACHE_KEYS = [
  'favorites-count',
  'spotlight',
  'weekly',
  'genres',
  'providers',
  'countries',
  'watched-series',
  /** One year's StatsMetrics: the summary combines this year's and last year's */
  'metrics',
  // The stats page's segments
  'shows',
  'finished',
  'daily',
  'when',
  'new-or-back',
] as const;

/** Not per year: the years list and the first watch per series */
const ALL_TIME_KEY = 'all-time';

export type StatsCacheKey =
  | (typeof STATS_CACHE_KEYS)[number]
  | typeof ALL_TIME_KEY;

/**
 * A segment whose answer gained fields gets a new key version, so answers
 * cached before (without the fields) are never read again; they expire on
 * their TTL.
 */
const KEY_VERSIONS: Partial<Record<StatsCacheKey, string>> = {
  // `years[].months` and `undated`; counted in the user's zone, with
  // `timeZone`
  'all-time': 'v3',
  // Days in the user's zone, with `timeZone`
  daily: 'v2',
  providers: 'v2',
  // A tie (marked in one go) picks the highest episode last
  spotlight: 'v2',
  when: 'v2',
};

/**
 * Build a cache key for a specific stats type.
 */
export const buildStatsCacheKey = (
  userId: string,
  year: number,
  key: StatsCacheKey,
): string => {
  const version = KEY_VERSIONS[key];
  return `stats:${userId}:${year}:${key}${version ? `:${version}` : ''}`;
};

/**
 * Every cache key that can change when the user's watched items of `year`
 * change: all of that year's keys (next year's summary reads this year's
 * `metrics`).
 */
export const getStatsInvalidationKeys = (
  userId: string,
  year: number,
): string[] => [
  ...STATS_CACHE_KEYS.map((key) => buildStatsCacheKey(userId, year, key)),
  // Any year's watched items change the all-time years and first watches
  buildStatsCacheKey(userId, 0, ALL_TIME_KEY),
];
