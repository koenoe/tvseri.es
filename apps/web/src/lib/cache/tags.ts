import type { LandingType } from '@tvseri.es/constants';

/**
 * Every cache tag the web app sets (`cacheTag`) or invalidates (`updateTag`,
 * `revalidateTag`). Readers and invalidations build their tags here, never
 * by hand, so an invalidation always names a tag a reader set. The strings
 * are part of every cached entry: renaming one orphans the entries under the
 * old one (`tags.test.ts` pins them).
 *
 * Invalidated today: `home` and `series:{id}` (the admin image picker),
 * `user:`, `stats:` and `username:` (renames, account deletes, the viewer's
 * own marks and imports). The rest only expire on their cacheLife.
 */
export const tags = {
  countryNew: (code: string) => `country-new:${code}`,
  discover: 'discover',
  duration: 'duration',
  genreBest: (slug: string) => `genre:${slug}:best`,
  genreNew: (slug: string) => `genre:${slug}:new`,
  goDeeper: 'go-deeper',
  /** Every Home read, the trending shows included */
  home: 'home',
  /** Home's "Top Picks for {month}" (`YYYY-MM`) */
  homeMonth: (month: string) => `home:month:${month}`,
  /** A landing's facts and count; the language and decade title walls */
  landing: (type: LandingType, slug: string) => `landing:${type}:${slug}`,
  landingCounts: (type: LandingType) => `landing-counts:${type}`,
  landingIndex: (type: LandingType) => `landing-index:${type}`,
  network: (id: number) => `network:${id}`,
  networkSpotlight: (networkId: number) => `network-spotlight:${networkId}`,
  person: (id: number) => `person:${id}`,
  /** The year's most popular shows on the Stats page */
  popular: (year: number) => `popular:${year}`,
  romanizedTitles: 'romanized-titles',
  /** Every cached read of a show */
  series: (id: number) => `series:${id}`,
  seriesSummaries: 'series-summaries',
  /**
   * A user's stats reads, for the owner's own marks and imports
   * (`revalidateViewerStats`): a mark expires nothing else of the user's
   */
  stats: (userId: string) => `stats:${userId}`,
  themeSpotlight: (slug: string) => `theme:${slug}:spotlight`,
  /** A user's public reads and share cards: renames and deletes drop them */
  user: (userId: string) => `user:${userId}`,
  /** The username → user lookup: renames drop it */
  username: (username: string) => `username:${username}`,
  whereToStart: (by: LandingType, value: string) =>
    `where-to-start:${by}:${value}`,
} as const;
