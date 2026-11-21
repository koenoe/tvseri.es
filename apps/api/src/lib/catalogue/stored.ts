import type { TvSeries } from '@tvseri.es/schemas';
import { readStored, readThroughStale } from '@/lib/db/cache/readThroughStale';
import { getShow } from './show';

/**
 * What marks and unmarks read from TMDB (the show, and each season's
 * episodes: lib/marking/catalog.ts), stored per show and season. Fresh for an
 * hour, so a new episode is markable within the hour, and then kept a month:
 * when TMDB can't be asked, a mark or unmark of a show someone marked in the
 * last month works from the stored copy. With a copy older than an hour,
 * TMDB gets at most `waitMs` to refresh it before the copy is used (the
 * refresh still stores when it ends). Episode marks never read TMDB (the web
 * sends the episodes).
 */
export const MARK_COPY = {
  freshSeconds: 60 * 60,
  keepSeconds: 30 * 24 * 60 * 60,
  waitMs: 1000,
} as const;

const markKey = (id: number) => `mark-series:v1:${id}`;

const PLACEMENT_TTL_MS = 15 * 60 * 1000;
const PLACEMENT_MAX_ENTRIES = 500;

type PlacementEntry = Readonly<{
  expiresAt: number;
  tvSeries: TvSeries | null;
}>;

/**
 * The container's copies for list placement, kept between warm invocations:
 * a show is the same for every user. They expire so aired counts and next
 * episodes don't go stale on a long-lived container, and the size is bounded
 * (oldest out first).
 */
const placementCopies = new Map<number, PlacementEntry>();

const readForPlacement = async (id: number) => {
  const now = Date.now();
  const entry = placementCopies.get(id);
  if (entry && entry.expiresAt > now) {
    return entry.tvSeries;
  }

  // A failure throws and keeps nothing: the next read asks TMDB again
  const tvSeries = (await getShow(id)) ?? null;

  // Re-insert so the Map stays oldest-first, then drop the oldest when full
  placementCopies.delete(id);
  if (placementCopies.size >= PLACEMENT_MAX_ENTRIES) {
    const oldestId = placementCopies.keys().next().value;
    if (oldestId !== undefined) {
      placementCopies.delete(oldestId);
    }
  }
  placementCopies.set(id, { expiresAt: now + PLACEMENT_TTL_MS, tvSeries });
  return tvSeries;
};

/**
 * Which stored copy of a show a read takes before TMDB (TMDB's details only:
 * `getShow` without options):
 *
 * - `placement`: placing a show in lists. This container's copy, up to 15
 *   minutes old (unknown shows too); else TMDB, whose failure throws.
 * - `mark`: marks and imports. The shared copy (Cache table, `MARK_COPY`):
 *   fresh for an hour; older, TMDB for at most a second, then the copy; a
 *   TMDB failure serves the copy, up to a month old.
 * - `stored`: the shared copy, however old, without asking TMDB: for a
 *   request that must not wait on it.
 */
type ShowCopy = 'placement' | 'mark' | 'stored';

/** A show through the stored copy `copy` names; undefined when TMDB doesn't know it */
export const readShow = async (
  id: number,
  copy: ShowCopy,
): Promise<TvSeries | undefined> => {
  switch (copy) {
    case 'placement':
      return (await readForPlacement(id)) ?? undefined;
    case 'mark':
      return (
        (await readThroughStale(
          markKey(id),
          MARK_COPY.freshSeconds,
          MARK_COPY.keepSeconds,
          async () => (await getShow(id)) ?? null,
          { waitMs: MARK_COPY.waitMs },
        )) ?? undefined
      );
    case 'stored':
      return (await readStored<TvSeries | null>(markKey(id))) ?? undefined;
  }
};
