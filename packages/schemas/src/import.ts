import * as v from 'valibot';

import { WatchedEpisodeEntrySchema } from './watched';

/**
 * The user's last import (the one Undo applies to), kept on the Users item.
 * Imported watched items carry the same `importId`.
 */
export const LastImportSchema = v.object({
  /** epoch ms */
  createdAt: v.number(),
  importId: v.string(),
  /** Episodes the import skipped because they were watched already; absent on imports from before this was counted */
  skipped: v.optional(v.number()),
  /** Set once Undo has finished */
  undoneAt: v.optional(v.number()),
  /** Set when Undo was asked for (the queue then deletes) */
  undoRequestedAt: v.optional(v.number()),
  /** Episodes written by the import (episodes watched before are skipped) */
  written: v.number(),
});

export type LastImport = v.InferOutput<typeof LastImportSchema>;

/** `POST /me/imports/:importId/batch` and `POST /me/imports/check` */
export const ImportBatchSchema = v.pipe(
  v.array(WatchedEpisodeEntrySchema),
  v.minLength(1, 'Batch cannot be empty.'),
  v.maxLength(100, 'Batch size too large. Maximum 100 items per request.'),
);

export type ImportBatch = v.InferOutput<typeof ImportBatchSchema>;

/** `POST /me/imports/:importId/batch`: episodes watched before are skipped */
export type ImportBatchResult = Readonly<{
  written: number;
  skipped: number;
}>;

/** `POST /me/imports/check`: what a batch would do, nothing written */
export type ImportCheckResult = ImportBatchResult &
  Readonly<{
    alreadyWatched: ReadonlyArray<Readonly<{ seriesId: number; code: string }>>;
  }>;

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
export const SeriesCandidateSchema = v.object({
  id: v.number(),
  /** The network or origin, for "2019 · Netflix" */
  network: v.nullable(v.string()),
  posterImage: v.nullable(v.string()),
  title: v.string(),
  /** First air year, when known ("2019") */
  year: v.nullable(v.string()),
});
export type SeriesCandidate = Readonly<
  v.InferOutput<typeof SeriesCandidateSchema>
>;

/** An episode the user can pick (Search manually → the episode). */
export const EpisodeOptionSchema = v.object({
  episodeNumber: v.number(),
  seasonNumber: v.number(),
  title: v.string(),
});
export type EpisodeOption = Readonly<v.InferOutput<typeof EpisodeOptionSchema>>;

/**
 * Why a row did not match (the web's import route adds `index` and `row`;
 * the Netflix sync keeps it for the review list). A doubtful match is never
 * a match.
 */
export type MatchProblem = Readonly<
  | { kind: 'ambiguous'; candidates: ReadonlyArray<SeriesCandidate> }
  | { kind: 'series-not-found' }
  | {
      kind: 'episode-not-found';
      series: SeriesCandidate;
      episodes: ReadonlyArray<EpisodeOption>;
    }
>;
