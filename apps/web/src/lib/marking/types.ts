import type { EpisodeCode, EpisodeRef } from '@tvseri.es/schemas';

export type { EpisodeCode, EpisodeRef };

/** One watched episode as the store keeps it (the API's progress view). */
export type WatchRecord = Readonly<{
  /** Epoch ms; for "I don't remember" the moment it was marked. */
  watchedAt: number;
  /** "I don't remember" (Watched · don't remember when). */
  dateUnknown?: true;
  /** Minutes; 0 until the API answers for an optimistic mark. */
  runtime: number;
  /** Where it was watched ("Plex", "Disney+"), when the record carries it. */
  source?: string;
  /** The import that wrote it: Undo of an unmark puts it back in there. */
  importId?: string;
}>;

/** What the store knows about a season (from `TvSeries.seasons`). */
export type SeasonInfo = Readonly<{
  seasonNumber: number;
  /** Announced episodes. */
  episodeCount: number;
  /** Aired episodes: numbered 1…airedEpisodeCount within the season. */
  airedEpisodeCount: number;
}>;

export type ListStatus = Readonly<{
  isFavorited: boolean;
  isWatchlisted: boolean;
}>;

export type MarkingPrefs = Readonly<{
  firstTrackingAnsweredAt: number | null;
  neverAskBefore: boolean;
}>;

/** The server's truth about one show for the viewer. */
export type SeriesBase = Readonly<{
  seriesId: number;
  seasons: ReadonlyArray<SeasonInfo>;
  watched: Readonly<Record<EpisodeCode, WatchRecord>>;
  /** Sorted episode codes. */
  skipped: ReadonlyArray<EpisodeCode>;
  /** `null` while unknown (signed out, or the status read failed). */
  status: ListStatus | null;
  prefs: MarkingPrefs | null;
  /**
   * The viewer's read failed (signed in, marks unknown): controls draw a
   * quiet unavailable state and every command refuses the show until a
   * newer seed (the retry) replaces this one.
   */
  unavailable?: true;
}>;

/** An optimistic change, applied on top of the base until the server answers. */
export type MarkingOp = Readonly<
  | { kind: 'mark'; records: Readonly<Record<EpisodeCode, WatchRecord>> }
  | { kind: 'unmark'; codes: ReadonlyArray<EpisodeCode> }
  | { kind: 'skip'; codes: ReadonlyArray<EpisodeCode> }
  | { kind: 'unskip'; codes: ReadonlyArray<EpisodeCode> }
  | { kind: 'list'; list: 'favorites' | 'watchlist'; value: boolean }
  | { kind: 'prefs'; patch: Partial<MarkingPrefs> }
>;

/**
 * What a page passes to seed the store (`SeedSeries`), straight from its
 * loaders: the season summary of `GET /series/:id`, plus, signed in,
 * `GET /user/:id/watched/series/:id?view=track` and `GET /me/series/:id/status`.
 */
export type SeriesSeed = Readonly<{
  seriesId: number;
  /**
   * Server time (epoch ms) taken before the viewer reads: orders seeds
   * against each other and against settled writes. Signed-out and
   * seasons-only seeds leave it out (they never replace a seeded show).
   */
  fetchedAt?: number;
  seasons: ReadonlyArray<SeasonInfo>;
  /** Signed in, but the viewer's reads failed: marks unknown (no `fetchedAt`). */
  unavailable?: true;
  watched?: ReadonlyArray<
    Readonly<{
      seasonNumber: number;
      episodeNumber: number;
      watchedAt: number;
      dateUnknown?: true;
      runtime?: number;
      watchProviderName?: string | null;
      importId?: string;
    }>
  >;
  status?: Readonly<{
    isFavorited: boolean;
    isWatchlisted: boolean;
    prefs: Readonly<{
      skipped: ReadonlyArray<EpisodeCode>;
      firstTrackingAnsweredAt: number | null;
      neverAskBefore: boolean;
    }>;
  }> | null;
}>;

/** A watched episode's state as every marking control draws it. */
export type EpisodeState = 'watched' | 'unknown' | 'skipped' | 'none';
