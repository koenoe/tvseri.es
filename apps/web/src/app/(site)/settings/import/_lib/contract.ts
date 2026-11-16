/**
 * The import's wire contract: what the browser sends to the
 * import route (`/api/account/import`) and the NDJSON events it streams back.
 * Shared by the importer UI (`import/_components`) and the route
 * (`app/api/account/import`), so it is types and constants only: no runtime
 * imports, safe on both sides.
 *
 * Flow:
 * 1. Upload (browser): PapaParse reads the file; the header row picks the
 *    preset (Netflix `Title,Date`) or the columns are mapped by name.
 * 2. Check (writes nothing): `prepareRows` (browser) turns mapped rows into
 *    `ImportRow`s, dropping films/extras and repeats and reading dates (the
 *    "dates were assumed" notice comes from here, before anything is
 *    written). Rows go to `POST /api/account/import?dryRun=1` in chunks of
 *    `IMPORT_CHUNK_SIZE`; the route matches them and asks the API which are
 *    already watched (`POST /me/imports/check`), streaming `CheckEvent`s.
 * 3. Import: the browser creates the import (server action → `POST
 *    /me/imports`), then sends the same chunks with the `importId`; the route
 *    matches again and writes through `POST /me/imports/:importId/batch` in
 *    batches of `IMPORT_WRITE_BATCH_SIZE`, streaming `ImportEvent`s. A doubtful
 *    match is never written: it comes back as a problem with candidates; the
 *    user picks one (the rows are re-sent with `seriesId`) or skips it.
 */

/** Rows per request the browser sends (one chunk). */
export const IMPORT_CHUNK_SIZE = 50;
/** Hard cap the route enforces per request. */
export const IMPORT_MAX_ROWS_PER_REQUEST = 100;
/** Rows per write the route sends to the API (`ImportBatchSchema` allows ≤ 100). */
export const IMPORT_WRITE_BATCH_SIZE = 25;
/** Longest show, season or episode text the route takes (longer: the row is flagged in Check). */
export const IMPORT_MAX_TEXT_LENGTH = 1000;
/** Longest service name the route takes (longer: dropped, "not recorded"). */
export const IMPORT_MAX_SERVICE_LENGTH = 100;
/** The largest file the drop zone accepts. */
export const IMPORT_MAX_FILE_BYTES = 4 * 1024 * 1024;

export const IMPORT_ENDPOINT = '/api/account/import';

/** Season/episode cells: a number from a numeric column, or text. */
export type ImportCell = string | number;

/** One row as the browser understood it (sent to the route). */
export type ImportRow = Readonly<{
  /** Position in the prepared rows: problems point back at it. */
  index: number;
  /** The show's name as written ("Stranger Things"). */
  title: string;
  /** "Season 2", "Limited Series", 2, or '' (any season, by episode title). */
  season: ImportCell;
  /** 3, "Episode 3", or an episode title ("Chapter One: The Crawl"). */
  episode: ImportCell;
  /** Epoch ms (noon local time of the day read), or null: "I don't remember". */
  watchedAt: number | null;
  /** A service name from the file or the fixed "Same for all rows" value. */
  watchProvider?: string;
  /**
   * The user's answer to a doubtful match ("Two shows with this name",
   * Search manually): match this TMDB series, no title search.
   */
  seriesId?: number;
  /** With `seriesId`: the episode picked by hand (Search manually). */
  seasonNumber?: number;
  episodeNumber?: number;
}>;

/** A series the user can pick for a doubtful match. */
export type SeriesCandidate = Readonly<{
  id: number;
  title: string;
  /** First air year, when known ("2019") */
  year: string | null;
  /** The network or origin, for "2019 · Netflix" */
  network: string | null;
  posterImage: string | null;
}>;

/** An episode the user can pick (Search manually → the episode). */
export type EpisodeOption = Readonly<{
  seasonNumber: number;
  episodeNumber: number;
  title: string;
}>;

/**
 * Why a row wasn't imported, grouped by the UI:
 * - `ambiguous`: two or more series fit (same title, or only a similar or
 *   first-search-result title): "Two shows with this name" / check this.
 * - `series-not-found`, `episode-not-found`: Search manually or Skip.
 * - `failed`: the write failed (the row can be retried), or the route refused
 *   the row (a cell too long, a date out of range).
 */
export type ImportProblemKind =
  | 'ambiguous'
  | 'series-not-found'
  | 'episode-not-found'
  | 'failed';

export type ImportProblem = Readonly<{
  kind: ImportProblemKind;
  /** `ImportRow.index` */
  index: number;
  /** The row as written, for display */
  row: Readonly<{ title: string; season: string; episode: string }>;
  /** `ambiguous`: the series to pick from (best first, ≤ 4) */
  candidates?: ReadonlyArray<SeriesCandidate>;
  /** `episode-not-found`: the matched series and its episodes to pick from */
  series?: SeriesCandidate;
  episodes?: ReadonlyArray<EpisodeOption>;
}>;

/** A show that came in, for the success screen's top 8. */
export type ImportedShow = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterImage: string | null;
  /** Episodes of this show written by this request */
  count: number;
}>;

/** `?dryRun=1`: one per chunk. Nothing is written. */
export type CheckEvent =
  | Readonly<{
      status: 'checked';
      /** Rows matched to an episode (not yet watched + already watched) */
      matched: number;
      /** Of those, already in the history: skipped, their dates kept */
      alreadyWatched: number;
      problems: ReadonlyArray<ImportProblem>;
      /** Distinct series matched in this chunk */
      seriesIds: ReadonlyArray<number>;
    }>
  | ErrorEvent;

/** The import: one per write batch. */
export type ImportEvent =
  | Readonly<{
      status: 'progress';
      /** New episodes written */
      written: number;
      /** Matched but already watched: skipped, dates kept */
      skipped: number;
      problems: ReadonlyArray<ImportProblem>;
      shows: ReadonlyArray<ImportedShow>;
      /** The show being imported now ("Stranger Things") */
      current: string | null;
    }>
  | ErrorEvent;

export type ErrorEvent = Readonly<{
  status: 'error';
  /**
   * `unauthenticated`: the session ended (the board's "Stopped (session)":
   * sign in and Continue from the last chunk). `conflict`: the import is no
   * longer the user's last one, or it is being undone. `failed`: anything else.
   */
  error: 'unauthenticated' | 'conflict' | 'failed';
}>;

/** The request body: `{ importId?, rows }` (`importId` absent on a dry run). */
export type ImportRequest = Readonly<{
  importId?: string;
  rows: ReadonlyArray<ImportRow>;
}>;
