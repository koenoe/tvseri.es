import {
  episodeCode,
  type ImportBatch,
  type ImportBatchResult,
  type WatchedItem,
  type WatchProvider,
} from '@tvseri.es/schemas';

import { getWatchedEpisodeKeys } from '@/lib/db/watched';
import { episodeSk } from '@/lib/db/watched/keys';
import { recordMarks } from '@/lib/watchLog';

/** Apart from the import's own bookkeeping, so a sync's bundle carries none of it */

/**
 * With `ownImportId`, episodes already written under it with the same date
 * count as written (a batch sent again after a failure); with another date
 * it's a rewatch: already watched.
 */
export const planBatch = async (
  userId: string,
  batch: ImportBatch,
  ownImportId?: string,
) => {
  const existing = await getWatchedEpisodeKeys(
    userId,
    batch.map((item) => item.tvSeries.id),
  );
  const seen = new Set<string>();
  const toWrite: ImportBatch[number][] = [];
  const alreadyWatched: { seriesId: number; code: string }[] = [];
  let alreadyWritten = 0;

  for (const item of batch) {
    const sk = episodeSk(
      item.tvSeries.id,
      item.episode.seasonNumber,
      item.episode.episodeNumber,
    );
    if (seen.has(sk)) {
      continue;
    }
    seen.add(sk);
    const watched = existing.get(sk);
    if (
      ownImportId !== undefined &&
      watched?.importId === ownImportId &&
      watched.watchedAt === item.watchedAt
    ) {
      alreadyWritten += 1;
    } else if (watched) {
      alreadyWatched.push({
        code: episodeCode(item.episode),
        seriesId: item.tvSeries.id,
      });
    } else {
      toWrite.push(item);
    }
  }

  return { alreadyWatched, alreadyWritten, toWrite };
};

/**
 * Episodes watched before are skipped, so their dates are kept and an Undo
 * never touches them. `beforeWrite` runs only when something is to be written.
 */
export const writeWatchedBatch = async (
  userId: string,
  importId: string,
  batch: ImportBatch,
  {
    beforeWrite,
    countOwnWrites = false,
    onWritten,
    watchProvider,
  }: Readonly<{
    beforeWrite?: () => Promise<unknown>;
    /** For a sync reading a page again after a failure; see `planBatch` */
    countOwnWrites?: boolean;
    /** The skips to clear, read with the prefs (default: every written episode's) */
    onWritten?: (
      items: ReadonlyArray<WatchedItem>,
    ) => Promise<ReadonlyMap<number, ReadonlySet<string>>>;
    /** A sync knows where it was watched */
    watchProvider?: WatchProvider;
  }> = {},
): Promise<ImportBatchResult> => {
  const { alreadyWatched, alreadyWritten, toWrite } = await planBatch(
    userId,
    batch,
    countOwnWrites ? importId : undefined,
  );

  if (toWrite.length > 0) {
    await beforeWrite?.();
    await recordMarks(
      userId,
      toWrite.map((item) => ({
        ...item,
        importId,
        ...(watchProvider && { watchProvider }),
      })),
      { source: 'import', unskipped: onWritten },
    );
  }

  return {
    skipped: alreadyWatched.length,
    written: toWrite.length + alreadyWritten,
  };
};
