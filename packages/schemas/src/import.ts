import * as v from 'valibot';

import { WatchedEpisodeEntrySchema } from './watched';

/**
 * The user's last import (SETImport: Undo), kept on the Users item. Imported
 * watched items carry the same `importId`.
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
