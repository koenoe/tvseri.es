import type {
  ListItem,
  SeriesFacts,
  SeriesPrefs,
  TvSeries,
} from '@tvseri.es/schemas';

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
import { getSeriesPrefs, getSeriesPrefsMany } from '@/lib/db/prefs';
import {
  getSeriesWatchSummary,
  getWatchedBySeries,
  type SeriesWatchSummary,
} from '@/lib/db/watched';
import { runWithDeadline } from '@/lib/deadline';
import { storedSeriesForMark } from '@/lib/marking/catalog';
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
import { cachedTvSeries } from './cachedTvSeries';
import { countDoneSkips, decideListState, type ListState } from './state';
import { listWrites, type PlacementSeries, type Plan } from './writes';

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
    seasons: Object.entries(aired.bySeason).map(([season, count]) => ({
      numberOfAiredEpisodes: count,
      seasonNumber: Number(season),
    })),
    slug: facts.slug,
    status: facts.status as TvSeries['status'],
    title: facts.title,
  };
};

/**
 * The show for placing it: TMDB (cached per container 15 minutes), else,
 * when TMDB fails, the stored show facts (the same aired rule) so a TMDB
 * outage doesn't drop the sync. Throws only when neither has the show.
 * Null: TMDB doesn't know it.
 */
const placementSeries = async (
  seriesId: number,
): Promise<PlacementSeries | null> => {
  try {
    return await cachedTvSeries(seriesId);
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
  const stored = await storedSeriesForMark(seriesId);
  if (stored) {
    return stored;
  }
  const lookup = cachedTvSeries(seriesId);
  // Its late outcome only fills the container's cache
  lookup.catch(() => undefined);
  const outcome = await within(lookup, ms);
  return outcome.timedOut ? undefined : outcome.value;
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

  // Read last and consistently: the stream writes unconditionally, so the
  // closer this read is to its write, the less a skip made meanwhile is missed
  const skipped =
    knownSkips ??
    (await getSeriesPrefs(userId, seriesId, { consistent: true })).skipped;
  const skippedCount = countDoneSkips({
    seasons: tvSeries.seasons,
    skipped,
    watched: watched.items,
  });

  console.log(
    `[SYNC] ${tvSeries.title} | User: ${userId} | Count: ${watched.regularCount}+${skippedCount} skipped/${tvSeries.numberOfAiredEpisodes}`,
  );

  return {
    lastWatchedAt: watched.lastWatchedAt,
    regularCount: watched.regularCount,
    state: decideListState({
      airedCount: tvSeries.numberOfAiredEpisodes,
      skippedCount,
      watchedCount: watched.regularCount,
    }),
    tvSeries,
  };
};

/**
 * The stream's executor of `listWrites`: independent writes (its read of
 * the show's watched items is consistent and newest, so no condition).
 */
const applyPlan = async (userId: string, plan: Plan, placedAt?: number) => {
  const id = plan.tvSeries.id;
  const { put, ...writes } = listWrites(plan, placedAt);
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

/**
 * A show's watched items changed: rebuild its summary and place it in the
 * lists, from one consistent read of its items as they are now (not the
 * records of a batch), so the outcome doesn't depend on record order,
 * batching or redelivery. One rule for both callers:
 *
 * - the stream: `placement` left out (TMDB, else stored facts) and no
 *   `read`: unconditional writes, its read being the newest;
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
type PlaceInput = Readonly<{
  userId: string;
  seriesId: number;
  placement?: () => Promise<PlacementSeries | null | undefined>;
  read?: ReadPlacement;
}>;

/** The lists half of `resyncShow`, alone for a skip (no watched item changed) */
const placeShow = async ({
  placement,
  read,
  seriesId,
  summary,
  userId,
}: PlaceInput & Readonly<{ summary?: SeriesWatchSummary }>): Promise<
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
  if (read) {
    await applyPlanIfUnchanged(userId, plan, read);
  } else {
    await applyPlan(userId, plan);
  }
  return plan.state;
};

export const resyncShow = async (
  input: PlaceInput,
): Promise<ListState | null | undefined> => {
  const { seriesId, userId } = input;
  const asOf = Date.now();
  const summary = await getSeriesWatchSummary({ tvSeriesId: seriesId, userId });
  const [rollup, lists] = await Promise.allSettled([
    writeRollup(userId, seriesId, summary.items, asOf),
    placeShow({ ...input, summary }),
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
 * overtake: the list writes are one transaction that
 * applies only if In progress and Finished are still as `read` found them
 * (the stream re-puts an item with a new `createdAt` on every sync). When
 * they changed, nothing is written (the stream's sync of that mark is the
 * truth) and it answers false. The watchlist follows only a made change.
 */
const applyPlanIfUnchanged = async (
  userId: string,
  plan: Plan,
  read: ReadPlacement,
  placedAt?: number,
): Promise<boolean> => {
  const id = plan.tvSeries.id;
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
    sync: (input: PlaceInput) => Promise<ListState | null | undefined>;
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
 * A WATCHED list item's createdAt is the latest watchedAt of the show. If the
 * last aired episode is older than that, nothing new aired since and the
 * series is still fully watched, so the count can be skipped. A show
 * finished through skips of later episodes is planned again each night
 * (its skips count there) and stays.
 */
const hasNothingAiredSince = (
  tvSeries: TvSeries,
  watchedAt: ListItem['createdAt'],
) => {
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
 * Finished Returning Series: still finished (maybe resuming soon), or a new
 * episode aired (back to In progress, surfaced now). Unless it's the weekly
 * full check, a show with nothing aired since its last watch is skipped.
 * TMDB listing nothing aired leaves the show as it is. Returns the
 * shows it moved.
 */
const checkFinishedShows = async (
  userId: string,
  isFullCheck: boolean,
  budget: ChangeBudget,
): Promise<ReadonlySet<number>> => {
  const moved = new Set<number>();
  const finished = (
    await getAllListItems({ listId: 'WATCHED', userId })
  ).filter((item) => item.status === 'Returning Series');
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
        const tvSeries = await cachedTvSeries(item.id);
        if (!tvSeries) {
          console.warn(
            `[SKIP] | ${userId} | No TV series found for ID "${item.id}"`,
          );
          return;
        }

        // The Finished item as read: every write below is conditional on it
        const finishedRead: ReadEntry = { createdAt: item.createdAt };
        if (!isFullCheck && hasNothingAiredSince(tvSeries, item.createdAt)) {
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
 * agree with their watched items are never written, nor
 * are the shows the finished-show check just moved: the list read is
 * eventually consistent and could still show them in both lists.
 */
const reconcileUserLists = async (
  userId: string,
  budget: ChangeBudget,
  justMoved: ReadonlySet<number>,
) => {
  // The lists before the plans' watched reads, so a write conditional on
  // them can't apply a plan made from older data than they show
  const asOf = Date.now();
  const [{ bySeries: watchedBySeries, totals }, placements] = await Promise.all(
    [getWatchedBySeries(userId), getListPlacements(userId)],
  );
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
  // Watched, in neither list: only a recent mark (a dropped batch). Older,
  // it was healed already or removed from In progress by hand (production's
  // tile Remove), which leaves exactly this state; a show on the watchlist
  // is left alone too
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
            skipped: prefs?.get(seriesId)?.skipped ?? [],
            userId,
          });
          if (!plan || !changesLists(plan, listed.has(seriesId))) {
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
  return { asOf, bySeries: watchedBySeries, totals };
};

/**
 * Whether applying a reconcile plan changes the lists. `none` for a show in
 * no list changes nothing; `none` with regular episodes watched means TMDB
 * lists nothing aired: it can't be placed, and taking it out of its lists
 * (and back onto the watchlist) would undo the user's watching.
 */
const changesLists = (plan: Plan, isListed: boolean) =>
  plan.state !== 'none' || (isListed && plan.regularCount === 0);

/**
 * The nightly job for one user: the finished-show check, then the reconcile
 * (which reads the lists as the check left them), then the counter heal from
 * the reconcile's read of every watched item (no extra read). Every list change counts
 * against `budget`; what it refuses is left for a later night.
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
  const moved = await checkFinishedShows(
    input.userId,
    input.isFullCheck,
    input.budget,
  );
  const read = await reconcileUserLists(input.userId, input.budget, moved);
  await healWatchedCounters(input.userId, counters, read.totals);
  // The per-show summaries: built the first night, repaired after
  await buildRollups(input.userId, read.bySeries, read.asOf);
};
