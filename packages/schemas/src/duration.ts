export const DURATION_BUCKETS = [
  'under-6-hours',
  'one-weekend',
  'one-season',
  'long-haul',
  'complete-stories',
] as const;

export type DurationBucket = (typeof DURATION_BUCKETS)[number];

/** A show as the Duration lens draws it: title, episodes, year, length */
export type DurationShow = Readonly<{
  backdropImage: string;
  id: number;
  /** The network listed first on TMDB (Country's Where to start meta line); null when none */
  network: Readonly<{ id: number; name: string }> | null;
  numberOfEpisodes: number;
  numberOfSeasons: number;
  posterImage: string;
  slug: string;
  title: string;
  /** Typical episode length times episodes; null when TMDB has no runtime */
  totalMinutes: number | null;
  /** First air year, null when unknown */
  year: number | null;
}>;

export type DurationTile = Readonly<{
  bucket: DurationBucket;
  /** Shows to dress the tile with (three posters) */
  preview: ReadonlyArray<DurationShow>;
  /** The number on the tile */
  count: number;
  /** false: an estimate scaled up from a sample of popular shows */
  exact: boolean;
  /**
   * How many shows the tile's list holds (up to 20): under `MIN_POSTERS`
   * the hub leaves the tile out
   */
  listed: number;
}>;

/** `GET /duration`: the five tiles */
export type DurationTiles = Readonly<{
  tiles: ReadonlyArray<DurationTile>;
}>;

/**
 * `GET /duration/:bucket?page=`: the tile's list for the day (up to 20
 * shows, read from as many discover pages as it takes, at most 8), all on
 * page 1; `nextPage` is null.
 */
export type DurationPage = Readonly<{
  bucket: DurationBucket;
  items: ReadonlyArray<DurationShow>;
  /** The next page to ask for, null at the end */
  nextPage: number | null;
  page: number;
}>;

/** `GET /duration/weekend`: ended shows under 6 hours */
export type FinishThisWeekend = Readonly<{
  items: ReadonlyArray<DurationShow>;
}>;

export type WhereToStartPick = Readonly<{
  /** A line about the pick, built from its numbers, e.g. "4 episodes, 4h 10m in all" */
  why: string;
  /** `favourite` (the most-voted show) replaces `night` on a country's picks */
  kind: 'favourite' | 'long-haul' | 'night' | 'weekend';
  show: DurationShow;
}>;

/**
 * `GET /duration/where-to-start?genre=<slug>` (or `theme=<slug>`,
 * `country=<ISO2>`): up to three picks, in this order. Exactly one of the
 * three is set, naming what the picks are for.
 */
export type WhereToStart = Readonly<{
  genre?: string;
  theme?: string;
  country?: string;
  picks: ReadonlyArray<WhereToStartPick>;
  /**
   * The next best shows per slot that has a pick (up to five each, slot
   * order, never a pick): a page whose rows above already show a pick fills
   * that slot from these. Absent in answers cached before it existed.
   */
  backups?: ReadonlyArray<WhereToStartPick>;
}>;
