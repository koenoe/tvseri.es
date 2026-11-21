import type { SeriesFacts, SeriesPrefs, TvSeries } from '@tvseri.es/schemas';
import { lastWatchOf } from '@tvseri.es/utils';
import { readShow } from '@/lib/catalogue';
import {
  addToList,
  getAllListItems,
  getListEntries,
  getListPlacements,
  moveListItems,
  parkWatchlistItem,
  type ReadEntry,
  removeFromList,
  restoreParkedWatchlistItem,
} from '@/lib/db/list';
import {
  getSeriesPrefs,
  getSeriesPrefsChangedSince,
  getSeriesPrefsMany,
} from '@/lib/db/prefs';
import {
  getSeriesWatchSummary,
  getWatchedBySeries,
  type SeriesWatchSummary,
} from '@/lib/db/watched';
import { runWithDeadline } from '@/lib/deadline';
import {
  healWatchedCounters,
  readWatchedCounters,
} from '@/lib/profileCounters';
import { buildRollups, writeRollup } from '@/lib/rollups';
import { getSeriesFacts, peekSeriesFacts } from '@/lib/seriesFacts';
import { airedEpisodesAt } from '@/lib/seriesFacts/aired';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { createLimiter } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';
import { within } from '@/utils/within';
import type { ChangeBudget } from './budget';
import { decideListState, type ListState } from './state';
import {
  listPlaceOf,
  listWrites,
  type PlacementSeries,
  type Plan,
} from './writes';

export { createChangeBudget } from './budget';

/**
 * List placement: which of WATCHED (Finished), IN_PROGRESS, RESUMING_SOON and
 * the watchlist a show is in for a user, derived from their watched items,
 * their skips and TMDB's aired count. One rule (`decideListState`, then
 * `listWrites`), applied in the mark request (`syncListsForMark`), by the
 * watched stream after every write (both through `resyncShow`), after a skip
 * or unskip (`syncListsForSkips`) and by the nightly job
 * (`validateUserLists`), which heals what they missed.
 */

type SyncInput = Readonly<{
  userId: string;
  seriesId: number;
  /**
   * Already fetched (the nightly job, a mark route; null: TMDB doesn't know
   * it); fetched when left out
   */
  tvSeries?: PlacementSeries | null;
  /** The show's watched items, already read consistently (the stream) */
  summary?: SeriesWatchSummary;
  /** The user's skips of the show, already read (the nightly job, in bulk) */
  skipped?: ReadonlyArray<string>;
}>;

/** What placing a show reads from its stored facts (the same aired rule) */
const fromFacts = (facts: SeriesFacts): PlacementSeries => {
  const aired = airedEpisodesAt(facts, Date.now());
  return {
    id: facts.id,
    numberOfAiredEpisodes: aired.total,
    posterPath: facts.posterPath ?? '',
    seasons: facts.seasons.map((season) => ({
      firstEpisodeNumber: season.firstEpisodeNumber,
      numberOfAiredEpisodes: aired.bySeason[season.seasonNumber] ?? 0,
      seasonNumber: season.seasonNumber,
    })),
    slug: facts.slug,
    status: facts.status as TvSeries['status'],
    title: facts.title,
  };
};

/**
 * The show for placing it: TMDB (the container's copy), else, when TMDB
 * fails, the stored show facts (the same aired rule) so a TMDB outage
 * doesn't drop the sync. Throws only when neither has the show.
 * Null: TMDB doesn't know it.
 */
const placementSeries = async (
  seriesId: number,
): Promise<PlacementSeries | null> => {
  try {
    return (await readShow(seriesId, 'placement')) ?? null;
  } catch (error) {
    const facts = (await getSeriesFacts([seriesId])).get(seriesId);
    if (!facts) {
      throw error;
    }
    logWarn(`TMDB failed for ${seriesId}: placed from its stored facts`, error);
    return fromFacts(facts);
  }
};

/**
 * The show for placing it inside a mark request, which must not wait on TMDB:
 * its stored facts, else the copy the season and show marks store, else
 * TMDB for at most `ms`. Undefined when none came in time: the stream places
 * the show seconds later. Null: TMDB doesn't know it.
 */
const placementForMark = async (
  seriesId: number,
  ms: number,
): Promise<PlacementSeries | null | undefined> => {
  const facts = (await peekSeriesFacts([seriesId])).get(seriesId);
  if (facts) {
    return fromFacts(facts);
  }
  const stored = await readShow(seriesId, 'stored');
  if (stored) {
    return stored;
  }
  const lookup = readShow(seriesId, 'placement');
  // Its late outcome only fills the container's copy
  lookup.catch(() => undefined);
  const outcome = await within(lookup, ms);
  return outcome.timedOut ? undefined : (outcome.value ?? null);
};

/**
 * Every writer's plan for a show: its watched items, its skips (prefs) and
 * its aired episodes, through the one rule (`decideListState`).
 */
const planSeriesLists = async ({
  userId,
  seriesId,
  skipped: knownSkips,
  summary,
  tvSeries: known,
}: SyncInput): Promise<Plan | null> => {
  // Independent reads: TMDB series and the show's watched items
  const [tvSeries, watched] = await Promise.all([
    known === undefined ? placementSeries(seriesId) : known,
    summary ?? getSeriesWatchSummary({ tvSeriesId: seriesId, userId }),
  ]);

  if (!tvSeries) {
    console.error(
      `[ERROR] No TV series found for ID "${seriesId}" | User: ${userId}`,
    );
    return null;
  }

  // Read last and consistently: the closer this read is to the write, the
  // less a skip made meanwhile is missed (a request's write is conditional on
  // the lists, which that skip's placement changes)
  const skipped =
    knownSkips ??
    (await getSeriesPrefs(userId, seriesId, { consistent: true })).skipped;
  // Without its seasons the aired episodes are unknown: no placement
  if (!tvSeries.seasons) {
    console.error(
      `[ERROR] No seasons for TV series "${seriesId}" | User: ${userId}`,
    );
    return null;
  }
  const state = decideListState({
    seasons: tvSeries.seasons,
    skipped,
    watched: watched.regularCodes,
  });

  console.log(
    `[SYNC] ${tvSeries.title} | User: ${userId} | ${watched.regularCount} watched, ${skipped.length} skipped, ${tvSeries.numberOfAiredEpisodes} aired | ${state}`,
  );

  return {
    lastWatchedAt: listPlaceOf(watched.items),
    regularCount: watched.regularCount,
    state,
    tvSeries,
  };
};

/**
 * A plan that can't place the show: regular episodes watched, but TMDB lists
 * nothing aired (its premiere day, inside the air-date margin, or a TMDB
 * glitch). Taking the show out of its lists and back onto the watchlist
 * would undo the user's watching: every writer leaves its lists as they are
 * and only parks its watchlist entry (it is being watched); a later sync
 * places it.
 */
const cannotPlace = (plan: Plan) =>
  plan.state === 'none' && plan.regularCount > 0;

/**
 * The stream's executor of `listWrites`: independent writes (its read of
 * the show's watched items is consistent and newest, so no condition; a
 * skip saved meanwhile is caught by `placeFromStream`).
 */
const applyPlan = async (userId: string, plan: Plan) => {
  const id = plan.tvSeries.id;
  if (cannotPlace(plan)) {
    await parkWatchlistItem({ id, userId });
    return;
  }
  const { put, ...writes } = listWrites(plan);
  await Promise.all([
    ...(put
      ? [
          addToList({
            item: {
              createdAt: put.createdAt,
              id: put.id,
              posterPath: put.posterPath,
              slug: put.slug,
              status: put.status,
              title: put.title,
            },
            listId: put.listId,
            userId,
          }),
        ]
      : []),
    ...[...writes.remove, ...writes.alsoRemove].map((listId) =>
      removeFromList({ id, listId, userId }),
    ),
    writes.watchlist === 'park'
      ? parkWatchlistItem({ id, userId })
      : restoreParkedWatchlistItem({ id, userId }),
  ]);
};

/** In progress and Finished as read before the show's watched items */
type ReadPlacement = Readonly<{ IN_PROGRESS: ReadEntry; WATCHED: ReadEntry }>;

type PlaceInput = Readonly<{
  userId: string;
  seriesId: number;
  placement?: () => Promise<PlacementSeries | null | undefined>;
  read?: ReadPlacement;
}>;

/**
 * The lists half of `resyncShow` in a request, alone for a skip (no watched
 * item changed): written only if the lists are still as `read`
 */
const placeShow = async ({
  placement,
  read,
  seriesId,
  summary,
  userId,
}: PlaceInput &
  Readonly<{ read: ReadPlacement; summary?: SeriesWatchSummary }>): Promise<
  ListState | null | undefined
> => {
  const tvSeries = placement ? await placement() : undefined;
  if (placement && tvSeries === undefined) {
    return undefined;
  }
  const plan = await planSeriesLists({ seriesId, summary, tvSeries, userId });
  if (!plan) {
    return null;
  }
  await applyPlanIfUnchanged(userId, plan, read);
  return plan.state;
};

/**
 * The lists half of `resyncShow` for the stream, which writes
 * unconditionally. A skip saved between its read of the skips and its
 * writes would be overwritten by a plan without it (and the skip's own
 * placement may have lost to the stream's writes): it reads the skips again
 * after writing and, when they changed, places the show once more from
 * them. One more prefs read per sync.
 */
const placeFromStream = async (
  userId: string,
  seriesId: number,
  summary: SeriesWatchSummary,
): Promise<ListState | null> => {
  const readSkips = async () =>
    (await getSeriesPrefs(userId, seriesId, { consistent: true })).skipped;
  const skipped = await readSkips();
  const plan = await planSeriesLists({ seriesId, skipped, summary, userId });
  if (!plan) {
    return null;
  }
  await applyPlan(userId, plan);
  const skippedNow = await readSkips();
  if (skippedNow.join() === skipped.join()) {
    return plan.state;
  }
  const again = await planSeriesLists({
    seriesId,
    skipped: skippedNow,
    summary,
    tvSeries: plan.tvSeries,
    userId,
  });
  if (!again) {
    return plan.state;
  }
  await applyPlan(userId, again);
  return again.state;
};

/**
 * A show's watched items changed: rebuild its summary and place it in the
 * lists, from one consistent read of its items as they are now (not the
 * records of a batch), so the outcome doesn't depend on record order,
 * batching or redelivery. One rule for both callers:
 *
 * - the stream: `placement` left out (TMDB, else stored facts) and no
 *   `read`: unconditional writes, its read being the newest
 *   (`placeFromStream`, which re-checks the skips after writing);
 * - the mark request: the show from stored data (`placement`; undefined
 *   leaves the lists to the stream) and the lists as `read` before the
 *   items: written only if still so (a concurrent mark's sync is newer).
 *
 * The summary write and the placement are independent: one failing never
 * skips the other; a failure is thrown once both have settled (the stream
 * retries its batch). Returns the state applied, null when TMDB doesn't
 * know the show, undefined when the lists were left to the stream.
 *
 * The nightly job is the third writer of the same rule but works in bulk
 * (one read of every item, plans only for shows that disagree, summaries
 * built together): it shares `planSeriesLists`, `listWrites` and
 * `writeRollup` with this, not this function.
 */
export const resyncShow = async (
  input: PlaceInput,
): Promise<ListState | null | undefined> => {
  const { seriesId, userId } = input;
  const asOf = Date.now();
  const summary = await getSeriesWatchSummary({ tvSeriesId: seriesId, userId });
  const [rollup, lists] = await Promise.allSettled([
    writeRollup(userId, seriesId, summary.items, asOf),
    input.read
      ? placeShow({ ...input, read: input.read, summary })
      : placeFromStream(userId, seriesId, summary),
  ]);
  if (rollup.status === 'rejected') {
    throw rollup.reason;
  }
  if (lists.status === 'rejected') {
    throw lists.reason;
  }
  return lists.value;
};

/**
 * The conditional executor of `listWrites`, for the nightly job and the mark
 * request, which decided from reads that a mark at the same moment can
 * overtake: the list writes are one transaction that applies only if In
 * progress and Finished are still as `read` found them
 * (the stream re-puts an item with a new `createdAt` on every sync). When
 * they changed, nothing is written (the stream's sync of that mark is the
 * truth) and it answers false. The watchlist follows only a made change.
 * A plan that can't place the show (`cannotPlace`) only parks its watchlist
 * entry and answers false.
 */
const applyPlanIfUnchanged = async (
  userId: string,
  plan: Plan,
  read: ReadPlacement,
  placedAt?: number,
): Promise<boolean> => {
  const id = plan.tvSeries.id;
  if (cannotPlace(plan)) {
    await parkWatchlistItem({ id, userId });
    return false;
  }
  const writes = listWrites(plan, placedAt);
  const moved = await moveListItems({
    alsoRemove: writes.alsoRemove,
    id,
    put: writes.put && { ...writes.put, read: read[writes.put.listId] },
    remove: writes.remove.map((listId) => ({ listId, read: read[listId] })),
    userId,
  });
  if (moved) {
    await (writes.watchlist === 'park'
      ? parkWatchlistItem({ id, userId })
      : restoreParkedWatchlistItem({ id, userId }));
  }
  return moved;
};

/** How long a mark request waits on its own list sync at most */
export const MARK_SYNC_MS = 2500;
/** Shows a mark request places itself (a batch of more leaves the rest to the stream) */
const MARK_SYNC_SHOWS = 10;

/**
 * Places the shows a mark request just wrote, in that request (the lists the
 * user changed are current on the next screen). The same rules as the
 * stream's sync, written only if In progress and Finished are still as read
 * before the show's watched items were (a concurrent mark's sync is newer):
 * the stream stays the backstop and both together give the same lists.
 *
 * Bounded at MARK_SYNC_MS, and never waits on TMDB for a show it has stored
 * data of (`placementForMark`): the request answers by then whatever is
 * still running (DynamoDB writes, idempotent and conditional, may finish
 * on the next invocation). Never throws: anything it can't do is left to
 * the stream.
 */
export const syncListsForMark = (
  userId: string,
  seriesIds: ReadonlyArray<number>,
  known?: PlacementSeries,
) => syncInRequest(userId, seriesIds, { known, sync: resyncShow });

/**
 * Places a show after its skips changed (a skip or unskip, an Undo of an
 * import putting skips back): skips are no watched items, so no stream
 * follows. The same bound, rules and conditional write as a mark; its
 * summary is left alone (it counts watches only). Never throws: what it
 * can't do waits for the show's next sync or the nightly job.
 */
export const syncListsForSkips = (
  userId: string,
  seriesIds: ReadonlyArray<number>,
) => syncInRequest(userId, seriesIds, { sync: placeShow });

const syncInRequest = async (
  userId: string,
  seriesIds: ReadonlyArray<number>,
  {
    known,
    sync,
  }: Readonly<{
    known?: PlacementSeries;
    sync: (
      input: PlaceInput & Readonly<{ read: ReadPlacement }>,
    ) => Promise<ListState | null | undefined>;
  }>,
) => {
  const started = Date.now();
  const timeLeft = () => MARK_SYNC_MS - (Date.now() - started);
  const ids = [...new Set(seriesIds)].slice(0, MARK_SYNC_SHOWS);
  const work = runWithDeadline(MARK_SYNC_MS, () =>
    Promise.all(
      ids.map(async (seriesId) => {
        try {
          const entries = await getListEntries(
            userId,
            [seriesId],
            ['WATCHED', 'IN_PROGRESS'],
          );
          const readEntry = (listId: string): ReadEntry => {
            const list = entries.get(listId);
            return list?.has(seriesId)
              ? { createdAt: list.get(seriesId) || undefined }
              : null;
          };
          const read = {
            IN_PROGRESS: readEntry('IN_PROGRESS'),
            WATCHED: readEntry('WATCHED'),
          };
          const state = await sync({
            placement: async () =>
              known?.id === seriesId
                ? known
                : placementForMark(seriesId, timeLeft()),
            read,
            seriesId,
            userId,
          });
          if (state === undefined) {
            logWarn(`In-request placement of ${seriesId} left to the stream`, {
              message: 'no stored show and TMDB too slow',
            });
          }
        } catch (error) {
          logWarn(
            `In-request list sync of ${seriesId} left to the stream`,
            error,
          );
        }
      }),
    ),
  );
  // What is still running then goes on without holding the answer
  work.catch(() => undefined);
  const outcome = await within(work, MARK_SYNC_MS);
  if (outcome.timedOut) {
    logWarn('In-request list sync over its bound, answered', {
      message: `${ids.length} shows`,
    });
  }
};

/**
 * TMDB air dates are dates in the network's local time zone, stored as
 * midnight UTC. An episode dated D can come out as late as the early hours of
 * D+1 UTC, so only trust "aired before you watched" with this much margin.
 */
const AIR_DATE_MARGIN_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * If the last aired episode is older than the user's latest dated watch of a
 * regular episode, nothing new aired since and the series is still fully
 * watched, so the count can be skipped. Not the Finished item's `createdAt`:
 * a special or an "I don't remember" mark (dated when it was marked) can be
 * newer than an episode the user hasn't seen. A show finished through skips
 * of later episodes is planned again each night (its skips count there) and
 * stays.
 */
const hasNothingAiredSince = (tvSeries: TvSeries, watchedAt: number | null) => {
  const airDate = tvSeries.lastEpisodeToAir?.airDate;
  if (!airDate || !watchedAt) {
    return false;
  }
  const airedAt = new Date(airDate).getTime();
  return !Number.isNaN(airedAt) && airedAt + AIR_DATE_MARGIN_MS <= watchedAt;
};

/**
 * Adds a fully watched series to RESUMING_SOON when new episodes air within
 * two weeks (the user's RESUMING_SOON ids are read once, when first needed).
 */
const createResumingSoon = (userId: string) => {
  let ids: Promise<ReadonlySet<number>> | undefined;
  return async (tvSeries: TvSeries, finished: ReadEntry) => {
    const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const isResumingSoon =
      tvSeries.nextEpisodeToAir &&
      new Date(tvSeries.nextEpisodeToAir.airDate) <= twoWeeksFromNow;
    if (!isResumingSoon) {
      return;
    }

    ids ??= getAllListItems({ listId: 'RESUMING_SOON', userId }).then(
      (items) => new Set(items.map((item) => item.id)),
    );
    if ((await ids).has(tvSeries.id)) {
      return;
    }

    // RESUMING_SOON is a subset of WATCHED: only while the show is still
    // Finished as read (an unmark meanwhile took it out of both)
    const added = await moveListItems({
      id: tvSeries.id,
      keep: [{ listId: 'WATCHED', read: finished }],
      put: {
        createdAt: Date.now(),
        id: tvSeries.id,
        listId: 'RESUMING_SOON',
        posterPath: tvSeries.posterPath,
        read: null,
        slug: tvSeries.slug,
        status: tvSeries.status,
        title: tvSeries.title,
      },
      remove: [],
      userId,
    });
    if (added) {
      console.log(
        `[UPDATE] | ${userId} | ${tvSeries.title} | Added to RESUMING_SOON (new episodes within 2 weeks)`,
      );
    }
  };
};

/**
 * The Finished shows still running: their list item says Returning Series,
 * or their stored facts say so now (a show finished while Ended or In
 * Production and renewed since) or still list a next episode to air (TMDB
 * calls a show Canceled while its last episodes air). The facts are a read
 * of the Cache table, no TMDB call; a show without stored facts is judged by
 * its item.
 */
const runningFinishedShows = async (userId: string) => {
  const finished = await getAllListItems({ listId: 'WATCHED', userId });
  const isRunning = (status: string | undefined) =>
    status === 'Returning Series';
  const others = finished.filter((item) => !isRunning(item.status));
  const facts =
    others.length > 0
      ? await peekSeriesFacts(others.map((item) => item.id))
      : new Map<number, SeriesFacts>();
  const isAiring = (show: SeriesFacts | undefined) =>
    show !== undefined &&
    (isRunning(show.status) || show.nextEpisodeToAir !== null);
  return finished.filter(
    (item) => isRunning(item.status) || isAiring(facts.get(item.id)),
  );
};

/**
 * Finished Returning Series: still finished (maybe resuming soon), or a new
 * episode aired (back to In progress, surfaced now). Unless it's the weekly
 * full check, a show with nothing aired since its last dated regular watch
 * is skipped. TMDB listing nothing aired leaves the show as it is. Returns
 * the shows it moved.
 */
const checkFinishedShows = async (
  userId: string,
  isFullCheck: boolean,
  budget: ChangeBudget,
  watchedBySeries: WatchedBySeries,
): Promise<ReadonlySet<number>> => {
  const moved = new Set<number>();
  const finished = await runningFinishedShows(userId);
  if (finished.length === 0) {
    return moved;
  }

  const limit = createLimiter(TMDB_CONCURRENCY);
  const syncResumingSoon = createResumingSoon(userId);
  // The finished shows' skips in one read, made once a show needs a plan
  let prefs: Promise<ReadonlyMap<number, SeriesPrefs>> | undefined;
  const skippedOf = async (seriesId: number) => {
    prefs ??= getSeriesPrefsMany(
      userId,
      finished.map((item) => item.id),
      { consistent: true },
    );
    return (await prefs).get(seriesId)?.skipped ?? [];
  };

  await Promise.all(
    finished.map((item) =>
      limit(async () => {
        const tvSeries = await readShow(item.id, 'placement');
        if (!tvSeries) {
          console.warn(
            `[SKIP] | ${userId} | No TV series found for ID "${item.id}"`,
          );
          return;
        }

        // The Finished item as read: every write below is conditional on it
        const finishedRead: ReadEntry = { createdAt: item.createdAt };
        if (
          !isFullCheck &&
          hasNothingAiredSince(
            tvSeries,
            lastWatchOf(watchedBySeries.get(item.id)?.items ?? [])?.watchedAt ??
              null,
          )
        ) {
          await syncResumingSoon(tvSeries, finishedRead);
          return;
        }

        const plan = await planSeriesLists({
          seriesId: item.id,
          skipped: await skippedOf(item.id),
          tvSeries,
          userId,
        });
        if (!plan || tvSeries.numberOfAiredEpisodes <= 0) {
          return;
        }
        if (plan.state === 'watched') {
          await syncResumingSoon(tvSeries, finishedRead);
          return;
        }

        if (!budget.take(userId)) {
          return;
        }
        // A new episode is a reason to surface the show: placed now. Read
        // as Finished and not In progress; a mark meanwhile changed that and
        // the write is skipped (no slot of the cap used)
        const changed = await applyPlanIfUnchanged(
          userId,
          plan,
          { IN_PROGRESS: null, WATCHED: finishedRead },
          Date.now(),
        );
        if (!changed) {
          budget.refund(userId);
          return;
        }
        console.log(
          `[UPDATE] | ${userId} | ${tvSeries.title} | Finished -> ${plan.state} | ${plan.regularCount}/${tvSeries.numberOfAiredEpisodes}`,
        );
        moved.add(item.id);
      }),
    ),
  );
  return moved;
};

/**
 * A stream batch dropped after its retries is from a recent mark (the
 * subscriber retries for minutes, not days): only shows watched this
 * recently are put back in a list when they're in none.
 */
const DROPPED_BATCH_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Prefs changed this recently are planned again: a night and a missed one
 * (the job runs nightly; planning a show twice writes nothing the second
 * time)
 */
const PREFS_CHANGED_WINDOW_MS = 48 * 60 * 60 * 1000;

type WatchedBySeries = Awaited<
  ReturnType<typeof getWatchedBySeries>
>['bySeries'];

/**
 * Heals what the stream missed (a batch dropped after its retries, an event
 * lost while the subscriber was down): compares the user's watched shows with
 * their In progress and Finished lists, without TMDB, and re-syncs only the
 * shows where they disagree, with the stream's rules:
 *
 * - in a list, no regular episode watched
 * - in both lists
 * - regular episodes watched, in neither list, only when the newest watch is
 *   under 48 hours old, the show isn't on the watchlist and isn't paused or
 *   hidden (a hand removal from In progress looks the same, and is never
 *   undone)
 *
 * A plan that changes nothing (TMDB doesn't know the show, or lists nothing
 * aired) is skipped without claiming a slot of the cap. Shows whose lists
 * agree with their watched items are never written, nor are the shows the
 * finished-show check just moved: the list read is eventually consistent
 * and could still show them in both lists.
 */
const reconcileUserLists = async (
  userId: string,
  budget: ChangeBudget,
  justMoved: ReadonlySet<number>,
  watchedBySeries: WatchedBySeries,
) => {
  // The lists before the plans' watched reads, so a write conditional on
  // them can't apply a plan made from older data than they show. The
  // job's read of every watched item may be older than them: it only picks
  // the shows to plan, each plan reads its show's items again
  const [placements, prefsChanged] = await Promise.all([
    getListPlacements(userId),
    getSeriesPrefsChangedSince(userId, Date.now() - PREFS_CHANGED_WINDOW_MS),
  ]);
  const inProgress = [...placements.IN_PROGRESS.keys()];
  const listed = new Set([...inProgress, ...placements.WATCHED.keys()]);
  const both = new Set(inProgress.filter((id) => placements.WATCHED.has(id)));
  const onWatchlist = new Set(placements.WATCHLIST.keys());
  const recentSince = Date.now() - DROPPED_BATCH_WINDOW_MS;

  const disagree = new Set<number>();
  // Listed with nothing regular watched (an unmark or Undo the stream
  // missed), or in both lists: no route lets a user put a show there
  for (const seriesId of listed) {
    if (!(watchedBySeries.get(seriesId)?.regular ?? 0) || both.has(seriesId)) {
      disagree.add(seriesId);
    }
  }
  const listedDisagreeing = [...disagree];
  // Listed, with prefs changed lately: a skip or unskip whose own placement
  // failed. An unlisted one is left alone: placing it would undo a removal
  // from In progress by hand
  for (const seriesId of prefsChanged.keys()) {
    if (listed.has(seriesId)) {
      disagree.add(seriesId);
    }
  }
  // Watched, in neither list: only a recent mark (a dropped batch). Older,
  // it was healed already or removed from In progress by hand, which leaves
  // exactly this state; a show on the watchlist is left alone too
  const unlisted = [...watchedBySeries]
    .filter(
      ([seriesId, { lastWatchedAt, regular }]) =>
        regular > 0 &&
        !listed.has(seriesId) &&
        !onWatchlist.has(seriesId) &&
        lastWatchedAt >= recentSince,
    )
    .map(([seriesId]) => seriesId);
  // ...and never a show the user paused or hid. The same read gives every
  // show to plan its skips
  const toRead = [...listedDisagreeing, ...unlisted];
  const prefs =
    toRead.length > 0
      ? await getSeriesPrefsMany(userId, toRead, { consistent: true })
      : null;
  for (const seriesId of unlisted) {
    if (!prefs?.get(seriesId)?.paused) {
      disagree.add(seriesId);
    }
  }

  const limit = createLimiter(TMDB_CONCURRENCY);
  await Promise.all(
    [...disagree]
      .filter((seriesId) => !justMoved.has(seriesId))
      .map((seriesId) =>
        limit(async () => {
          // Plan first: only a real change claims a slot of the cap
          const plan = await planSeriesLists({
            seriesId,
            skipped:
              (prefs?.get(seriesId) ?? prefsChanged.get(seriesId))?.skipped ??
              [],
            userId,
          });
          if (
            !plan ||
            !changesLists(plan, {
              finished: placements.WATCHED.has(seriesId),
              inProgress: placements.IN_PROGRESS.has(seriesId),
            })
          ) {
            return;
          }
          if (!budget.take(userId)) {
            return;
          }
          const readEntry = (list: Map<number, number | undefined>) =>
            list.has(seriesId) ? { createdAt: list.get(seriesId) } : null;
          const changed = await applyPlanIfUnchanged(userId, plan, {
            IN_PROGRESS: readEntry(placements.IN_PROGRESS),
            WATCHED: readEntry(placements.WATCHED),
          });
          if (!changed) {
            // A mark changed the lists meanwhile: the stream's sync stands
            budget.refund(userId);
            return;
          }
          console.log(`[RECONCILE] | ${userId} | ${seriesId} | ${plan.state}`);
        }),
      ),
  );
};

/**
 * Whether applying a reconcile plan changes the lists as read: a show
 * already where its plan puts it is not written again (its place in the
 * list is kept), and a plan that can't place it (`cannotPlace`) changes
 * nothing.
 */
const changesLists = (
  plan: Plan,
  {
    finished,
    inProgress,
  }: Readonly<{ finished: boolean; inProgress: boolean }>,
) => {
  if (plan.state === 'none') {
    return (finished || inProgress) && !cannotPlace(plan);
  }
  return plan.state === 'watched'
    ? !finished || inProgress
    : !inProgress || finished;
};

/**
 * The nightly job for one user: one read of every watched item, the
 * finished-show check, then the reconcile (which reads the lists as the
 * check left them), then the counter heal and the per-show summaries from
 * that same read (no extra read). Every list change counts against `budget`; what it refuses is
 * left for a later night.
 */
export const validateUserLists = async (
  input: Readonly<{
    userId: string;
    isFullCheck: boolean;
    budget: ChangeBudget;
  }>,
) => {
  // The counters as they are before the watched read: the heal replaces
  // only values no mark changed since
  const counters = await readWatchedCounters(input.userId);
  const asOf = Date.now();
  const { bySeries, totals } = await getWatchedBySeries(input.userId);
  const moved = await checkFinishedShows(
    input.userId,
    input.isFullCheck,
    input.budget,
    bySeries,
  );
  await reconcileUserLists(input.userId, input.budget, moved, bySeries);
  await healWatchedCounters(input.userId, counters, totals);
  // The per-show summaries: built the first night, repaired after
  await buildRollups(input.userId, bySeries, asOf);
};
