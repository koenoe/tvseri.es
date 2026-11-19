'use server';

import { PLEX_WATCH_PROVIDER } from '@tvseri.es/constants';
import {
  BulkLibraryInputSchema,
  type BulkLibraryResult,
  type EpisodeRef,
  MarkEpisodesInputSchema,
  MarkScopeInputSchema,
  type MarkWhen,
  SeriesIdInputSchema,
  type SeriesPrefs,
  SetInListInputSchema,
  type TvSeries,
  UnmarkEpisodesInputSchema,
  UnmarkScopeInputSchema,
  type UpdateSeriesPrefs,
  UpdateSeriesPrefsSchema,
  type WatchProvider,
} from '@tvseri.es/schemas';
import { createLimiter } from '@tvseri.es/utils';
import * as v from 'valibot';

import auth, { type Session } from '@/auth';
import { missingUser } from '@/auth/missingUser';
import { getViewer, type Viewer } from '@/auth/viewer';
import { apiFailure } from '@/lib/actions/apiFailure';
import { type ActionResult, actionError, okResult } from '@/lib/actions/result';
import { ApiError } from '@/lib/api/client';
import { resolveRegion } from '@/lib/geo';
import { loadSeriesForWrite } from '@/lib/series/forWrite';
import { loadSeason, loadWatchProviders } from '@/lib/series/loaders';
import { revalidateViewerStats } from '@/lib/stats/revalidateViewerStats';
import { yourService } from '@/lib/watchProviders/yourService';
import { hasEpisodeAired, lastAiredIn, nextEpisode } from './progress';
import { toSeasonInfo } from './seasonInfo';
import {
  addToList,
  deleteScope,
  PartialWriteError,
  type ProgressItem,
  patchPrefs,
  postBatch,
  postBatchDelete,
  postScope,
  removeFromList,
  settleAll,
} from './server/api';
import { toBatchItems, toDeleteItems } from './server/batch';
import { readSeriesSeed } from './server/seed';
import { seedToBase } from './state';
import type { SeriesSeed } from './types';

/**
 * The marking server actions: the one write path for watched, no date,
 * skipped, lists and per-show prefs. Each validates its input, authenticates
 * (the proxy has refreshed the session before an action runs; actions only
 * read it) and acts on the caller's own account. Clients call them through
 * `useMarking()`, never directly: that's where optimism, toasts and Undo live.
 */

type MarkData = Readonly<{ watched: ReadonlyArray<ProgressItem> }>;

type MarkNextData = MarkData &
  Readonly<{ episode: EpisodeRef | null; seed: SeriesSeed }>;

/** Bulk writes in flight at once */
const BULK_CONCURRENCY = 6;

/** An API failure, with what a multi-request write saved before it failed */
function failed(error: unknown): ActionResult<never> {
  if (error instanceof PartialWriteError) {
    const reason = failed(error.reason);
    if (reason.ok) {
      return reason;
    }
    const saved = error.watched.length > 0 || error.unmarked.length > 0;
    return saved
      ? actionError(reason.error, {
          unmarked: error.unmarked,
          watched: error.watched,
        })
      : reason;
  }
  return apiFailure('marking', error);
}

/**
 * The viewer's own Stats pages render fresh on their next visit after their
 * watched history (or favourites) changed.
 */
function historyChanged(viewerId: string) {
  revalidateViewerStats(viewerId);
}

/** `failed`, plus the Stats refresh when part of the write was saved. */
function failedAfterWrite(viewerId: string, error: unknown) {
  const result = failed(error);
  if ('partial' in result && result.partial) {
    historyChanged(viewerId);
  }
  return result;
}

/**
 * The start every action shares: `input` checked against `schema`
 * (`invalid`), the caller signed in through `signIn` (`unauthenticated`;
 * `failed` when their account can't be read, `missingUser`),
 * then `body`; anything it throws becomes its `ActionError` (`onError`,
 * `failed` by default).
 */
async function guarded<S extends v.GenericSchema, U, T>(
  schema: S,
  input: unknown,
  signIn: (input: v.InferOutput<S>) => Promise<U | null>,
  body: (input: v.InferOutput<S>, user: U) => Promise<ActionResult<T>>,
  onError: (user: U, error: unknown) => ActionResult<T> = (_user, error) =>
    failed(error),
): Promise<ActionResult<T>> {
  const parsed = v.safeParse(schema, input);
  if (!parsed.success) {
    return actionError('invalid');
  }
  const user = await signIn(parsed.output);
  if (!user) {
    return actionError(await missingUser());
  }
  try {
    return await body(parsed.output, user);
  } catch (error) {
    return onError(user, error);
  }
}

/** Who, from the token alone (`getViewer`): for writes that need no profile */
const viewerOnly = () => getViewer();

/**
 * For a mark: the session with the profile (services, country: the watch
 * provider), and the show, whose read starts before the session (`GET /me`)
 * instead of after it: a public cached read, so starting it for a caller
 * who turns out signed out discloses nothing. Its failure is reported where
 * it is awaited.
 */
async function sessionWithSeries(
  input: Readonly<{ seriesId: number }>,
): Promise<Readonly<{
  series: ReturnType<typeof loadSeriesForWrite>;
  session: Session;
}> | null> {
  const series = loadSeriesForWrite(input.seriesId);
  series.catch(() => undefined);
  const session = await auth();
  return session.user ? { series, session } : null;
}

type ProviderUser = Readonly<{
  country?: string;
  watchProviders?: ReadonlyArray<WatchProvider>;
}>;

/** The show's services in the viewer's region (none when that read fails) */
async function showProviders(
  series: Pick<TvSeries, 'id'>,
  user: ProviderUser,
): Promise<ReadonlyArray<WatchProvider>> {
  try {
    const region = await resolveRegion(user);
    return await loadWatchProviders(series.id, region);
  } catch {
    return [];
  }
}

async function watchProviderFor(
  series: Pick<TvSeries, 'id'>,
  user: ProviderUser,
) {
  return yourService(await showProviders(series, user), user.watchProviders);
}

/** Mark (or re-date) episodes, each with its own date. */
export async function markEpisodes(
  input: v.InferInput<typeof MarkEpisodesInputSchema>,
): Promise<ActionResult<MarkData>> {
  return guarded(
    MarkEpisodesInputSchema,
    input,
    sessionWithSeries,
    async ({ episodes, seriesId }, { session, ...read }) => {
      const series = await read.series;
      if (!series) {
        return actionError('not-found');
      }
      const seasonNumbers = [...new Set(episodes.map((e) => e.seasonNumber))];
      const [seasons, providers] = await Promise.all([
        Promise.all(seasonNumbers.map((n) => loadSeason(seriesId, n))),
        showProviders(series, session.user),
      ]);
      const userProviders = session.user.watchProviders ?? [];
      const lookup = (ref: EpisodeRef) =>
        seasons
          .find((season) => season?.seasonNumber === ref.seasonNumber)
          ?.episodes.find(
            (episode) => episode.episodeNumber === ref.episodeNumber,
          );
      const seasonInfo = { seasons: toSeasonInfo(series) };
      const now = Date.now();
      const items = toBatchItems({
        episodes,
        // The live date too: the cached flags lag on release day
        hasAired: (episode) =>
          hasEpisodeAired(
            episode,
            lastAiredIn(seasonInfo, episode.seasonNumber),
          ) || Date.parse(episode.airDate) <= now,
        knownProviders: [PLEX_WATCH_PROVIDER, ...userProviders, ...providers],
        lookup,
        now,
        series,
        userId: session.user.id,
        watchProvider: yourService(providers, userProviders),
      });
      if (items.length === 0) {
        return actionError('not-found');
      }
      const watched = await postBatch(
        { accessToken: session.accessToken, userId: session.user.id },
        items,
        {
          restore: episodes.every((episode) => episode.when.kind === 'restore'),
        },
      );
      historyChanged(session.user.id);
      // What was left out fails like a partial write: the client keeps what
      // was saved and rolls the rest back.
      return items.length < episodes.length
        ? actionError('not-found', { watched })
        : okResult({ watched });
    },
    ({ session }, error) => failedAfterWrite(session.user.id, error),
  );
}

export async function unmarkEpisodes(
  input: v.InferInput<typeof UnmarkEpisodesInputSchema>,
): Promise<ActionResult> {
  return guarded(
    UnmarkEpisodesInputSchema,
    input,
    viewerOnly,
    async ({ episodes, seriesId }, viewer) => {
      const series = await loadSeriesForWrite(seriesId);
      if (!series) {
        return actionError('not-found');
      }
      await postBatchDelete(
        { accessToken: viewer.accessToken, userId: viewer.id },
        toDeleteItems({ episodes, series, userId: viewer.id }),
      );
      historyChanged(viewer.id);
      return okResult(undefined);
    },
    (viewer, error) => failedAfterWrite(viewer.id, error),
  );
}

const scopeWhen = (when: Exclude<MarkWhen, { kind: 'release' }>) =>
  when.kind === 'date'
    ? { watchedAt: when.watchedAt }
    : when.kind === 'unknown'
      ? { dateUnknown: true as const }
      : {};

/**
 * Marks every aired episode of a season (`seasonNumber`), or of the show, that
 * isn't watched yet; skipped ones included. A show over the API's cap
 * (`MAX_EPISODES_PER_SERIES_MARK`, a 413) is marked season by season.
 */
export async function markScope(
  input: v.InferInput<typeof MarkScopeInputSchema>,
): Promise<ActionResult<MarkData>> {
  return guarded(
    MarkScopeInputSchema,
    input,
    sessionWithSeries,
    async (scope, { session, ...read }) => {
      const { seasonNumber, seriesId } = scope;
      const authContext = {
        accessToken: session.accessToken,
        userId: session.user.id,
      };
      const series = await read.series;
      if (!series) {
        return actionError('not-found');
      }
      const watchProvider = await watchProviderFor(series, session.user);
      const when = scopeWhen(scope.when);
      const mark = (n?: number) =>
        postScope(authContext, {
          seasonNumber: n,
          seriesId,
          watchProvider,
          when,
        });
      try {
        const marked = await mark(seasonNumber);
        historyChanged(session.user.id);
        return okResult({ watched: marked });
      } catch (error) {
        if (
          !(error instanceof ApiError && error.status === 413) ||
          seasonNumber !== undefined
        ) {
          throw error;
        }
      }
      // Season by season, a few at a time; what succeeded stays saved.
      const seasons = (series.seasons ?? []).filter(
        (season) =>
          season.seasonNumber > 0 && (season.numberOfAiredEpisodes ?? 0) > 0,
      );
      const { done, failure } = await settleAll(seasons, (season) =>
        mark(season.seasonNumber),
      );
      const watched = done.flatMap(([, items]) => items);
      if (failure !== undefined) {
        throw new PartialWriteError(failure, { watched });
      }
      historyChanged(session.user.id);
      return okResult({ watched });
    },
    ({ session }, error) => failedAfterWrite(session.user.id, error),
  );
}

/** Unmarks a season, or the whole show. */
export async function unmarkScope(
  input: v.InferInput<typeof UnmarkScopeInputSchema>,
): Promise<ActionResult> {
  return guarded(
    UnmarkScopeInputSchema,
    input,
    viewerOnly,
    async (scope, viewer) => {
      await deleteScope(
        { accessToken: viewer.accessToken, userId: viewer.id },
        scope,
      );
      historyChanged(viewer.id);
      return okResult(undefined);
    },
    (viewer, error) => failedAfterWrite(viewer.id, error),
  );
}

const PrefsInputSchema = v.tuple([
  SeriesIdInputSchema,
  UpdateSeriesPrefsSchema,
]);

/**
 * Per-show prefs: skip / unskip episodes, the first-tracking answer and
 * "Never for this show" (`PATCH /me/series/:id/prefs`).
 */
export async function updateSeriesPrefs(
  seriesIdInput: number,
  patchInput: UpdateSeriesPrefs,
): Promise<ActionResult<SeriesPrefs>> {
  return guarded(
    PrefsInputSchema,
    [{ seriesId: seriesIdInput }, patchInput],
    viewerOnly,
    async ([{ seriesId }, patch], viewer) =>
      okResult(await patchPrefs(viewer.accessToken, seriesId, patch)),
  );
}

/** Adds a show to, or removes it from, Favourites or the watchlist. */
export async function setInList(
  input: v.InferInput<typeof SetInListInputSchema>,
): Promise<ActionResult> {
  return guarded(
    SetInListInputSchema,
    input,
    viewerOnly,
    async ({ list, seriesId, value }, viewer) => {
      const authContext = {
        accessToken: viewer.accessToken,
        userId: viewer.id,
      };
      if (!value) {
        await removeFromList(authContext, list, seriesId);
        if (list === 'favorites') {
          historyChanged(viewer.id);
        }
        return okResult(undefined);
      }
      const series = await loadSeriesForWrite(seriesId);
      if (!series) {
        return actionError('not-found');
      }
      await addToList(authContext, list, series);
      if (list === 'favorites') {
        historyChanged(viewer.id);
      }
      return okResult(undefined);
    },
  );
}

/**
 * Hide from in progress (the tile Remote's H): the per-show pref `paused:
 * 'hide'`, so the show stays on the In progress list (still yours) and out
 * of every block until it is brought back (the Library's Hidden shelf).
 */
export async function removeFromInProgress(
  input: v.InferInput<typeof SeriesIdInputSchema>,
): Promise<ActionResult> {
  return setHidden(input, 'hide');
}

/** Back to in progress (Hidden's latched H): clears `paused`. */
export async function restoreToInProgress(
  input: v.InferInput<typeof SeriesIdInputSchema>,
): Promise<ActionResult> {
  return setHidden(input, null);
}

async function setHidden(
  input: v.InferInput<typeof SeriesIdInputSchema>,
  paused: 'hide' | null,
): Promise<ActionResult> {
  return guarded(
    SeriesIdInputSchema,
    input,
    viewerOnly,
    async ({ seriesId }, viewer) => {
      await patchPrefs(viewer.accessToken, seriesId, { paused });
      return okResult(undefined);
    },
  );
}

/**
 * The Library's bulk actions in one server action: Next runs a tab's
 * actions one at a time, so the fan-out is here, 6 requests at a time over the existing list and prefs routes. Lists and prefs only:
 * nothing here can touch a watched episode. Answers which shows were done
 * and which failed.
 */
export async function bulkLibrary(
  input: v.InferInput<typeof BulkLibraryInputSchema>,
): Promise<ActionResult<BulkLibraryResult>> {
  return guarded(
    BulkLibraryInputSchema,
    input,
    viewerOnly,
    async ({ items, op }, viewer) => {
      const auth = { accessToken: viewer.accessToken, userId: viewer.id };
      const limit = createLimiter(BULK_CONCURRENCY);
      const one = async ({ addedAt, id }: (typeof items)[number]) => {
        switch (op) {
          case 'hide':
          case 'unhide':
            await patchPrefs(auth.accessToken, id, {
              paused: op === 'hide' ? 'hide' : null,
            });
            return;
          case 'watchlist-remove':
            await removeFromList(auth, 'watchlist', id);
            return;
          case 'favourites-remove':
            await removeFromList(auth, 'favorites', id);
            return;
          case 'favourites-add':
          case 'watchlist-add': {
            const series = await loadSeriesForWrite(id);
            if (!series) {
              throw new ApiError(404);
            }
            const list = op === 'favourites-add' ? 'favorites' : 'watchlist';
            await addToList(auth, list, series, addedAt);
            return;
          }
        }
      };
      const settled = await Promise.allSettled(
        items.map((item) => limit(() => one(item))),
      );
      const done: number[] = [];
      const failedIds: number[] = [];
      settled.forEach((result, index) => {
        const id = items[index]?.id;
        if (id !== undefined) {
          (result.status === 'fulfilled' ? done : failedIds).push(id);
        }
      });
      if (settled.some((result) => result.status === 'rejected')) {
        const reason = settled.find(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        )?.reason;
        if (
          reason instanceof ApiError &&
          reason.status === 401 &&
          done.length === 0
        ) {
          return actionError('unauthenticated');
        }
      }
      if (done.length > 0 && op.startsWith('favourites')) {
        historyChanged(viewer.id);
      }
      return okResult({ done, failed: failedIds });
    },
  );
}

/**
 * Marks Next up (Just now) for a show the page hasn't seeded (the Remote on a
 * tile): reads progress and prefs on the server, applies the same rule as the
 * store (`nextEpisode`). `episode: null` when everything aired is watched
 * or skipped.
 * `seed` is the show after the write, so the store follows the mark even
 * when the Remote's own seed was still on its way (it is older, so ignored).
 */
export async function markNextEpisode(
  input: v.InferInput<typeof SeriesIdInputSchema>,
): Promise<ActionResult<MarkNextData>> {
  return guarded<typeof SeriesIdInputSchema, Viewer, MarkNextData>(
    SeriesIdInputSchema,
    input,
    viewerOnly,
    async ({ seriesId }, viewer) => {
      const before = await readSeriesSeed(
        viewer,
        seriesId,
        loadSeriesForWrite(seriesId),
      );
      if (!before) {
        return actionError('not-found');
      }
      const episode = nextEpisode(seedToBase(before));
      if (!episode) {
        return okResult({ episode: null, seed: before, watched: [] });
      }
      const result = await markEpisodes({
        episodes: [{ ...episode, when: { kind: 'now' } }],
        seriesId,
      });
      if (!result.ok) {
        return result;
      }
      const seed: SeriesSeed = {
        ...before,
        fetchedAt: Date.now(),
        watched: [...(before.watched ?? []), ...result.data.watched],
      };
      return okResult({ ...result.data, episode, seed });
    },
  );
}
