import type { PreferredImages } from '@tvseri.es/schemas';
import { buildBackdropImageUrl } from '@tvseri.es/utils';

import { findPreferredImagesForMany } from '@/lib/db/preferredImages';
import { logWarn } from '@/utils/logWarn';

/**
 * The admins' picks of many shows in one batch read. Best-effort: without
 * them the shows keep TMDB's artwork rather than the answer failing.
 */
export const readPreferredImages = (
  ids: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, PreferredImages>> =>
  (ids.length === 0
    ? Promise.resolve(new Map<number, PreferredImages>())
    : findPreferredImagesForMany([...new Set(ids)])
  ).catch((error: unknown) => {
    logWarn(
      'Batched preferred images read failed, continuing without them',
      error,
    );
    return new Map<number, PreferredImages>();
  });

/**
 * The backdrop a show is drawn with, the show page's rule: the admin's pick,
 * else `backdropImage` (TMDB's). Picks are read per answer, never stored in
 * a cached build, so a new pick shows as soon as the answer's own cache
 * lets it.
 */
export const pickedBackdrop = (
  picks: ReadonlyMap<number, PreferredImages>,
  id: number,
  backdropImage: string,
): string => {
  const path = picks.get(id)?.backdropImagePath;
  return path ? buildBackdropImageUrl(path) : backdropImage;
};

type Drawn = Readonly<{ id: number; backdropImage: string }>;

/**
 * Reads the picks of `ids` in one batch and answers how to draw each of
 * those shows: with its pick, else as it was.
 */
export const preferredBackdropsOf = async (ids: ReadonlyArray<number>) => {
  const picks = await readPreferredImages(ids);
  return <T extends Drawn>(show: T): T => ({
    ...show,
    backdropImage: pickedBackdrop(picks, show.id, show.backdropImage),
  });
};
