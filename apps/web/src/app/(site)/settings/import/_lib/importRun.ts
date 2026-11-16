import 'server-only';

import type {
  ImportBatch,
  ImportBatchResult,
  ImportCheckResult,
  WatchProvider,
} from '@tvseri.es/schemas';
import { createLimiter } from '@tvseri.es/utils';

import { ApiError, apiFetch } from '@/lib/api/client';
import { loadSeriesForWrite } from '@/lib/series/forWrite';
import { loadSeason } from '@/lib/series/loaders';
import { loadRegionProviders } from '../../_data/watchProviders';
import {
  type CheckEvent,
  IMPORT_MAX_ROWS_PER_REQUEST,
  IMPORT_WRITE_BATCH_SIZE,
  type ImportEvent,
  type ImportedShow,
  type ImportProblem,
  type ImportRow,
} from './contract';
import { type ImportItemRow, toImportItem } from './importItems';
import { searchSeries } from './loaders';
import {
  createEpisodeMatcher,
  type MatchProblem,
  type MatchResult,
} from './matcher';
import { matchProvider } from './providers';

/**
 * Catalogue reads (searches, shows, seasons) in flight at once for one
 * request. Every row starts matching at once; the matcher shares a title's
 * search and a season between the rows that need it, so this bounds the
 * distinct reads, not the rows.
 */
const CATALOG_CONCURRENCY = 8;

type Matched = Readonly<{ row: ImportRow; item: ImportItemRow }>;

export type RunOptions = Readonly<{
  accessToken: string;
  /** Present on an import; absent on a dry run */
  importId?: string;
  now: number;
  region: string;
  rows: ReadonlyArray<ImportRow>;
  /** Rows the route refused (they broke the row schema): `failed` problems */
  refused?: ReadonlyArray<ImportProblem>;
  signal: AbortSignal;
}>;

const shown = (row: ImportRow) => ({
  episode: String(row.episode),
  season: String(row.season),
  title: row.title,
});

const toProblem = (row: ImportRow, problem: MatchProblem): ImportProblem => ({
  ...problem,
  index: row.index,
  row: shown(row),
});

const failedProblem = (row: ImportRow): ImportProblem => ({
  index: row.index,
  kind: 'failed',
  row: shown(row),
});

type Outcome = Readonly<
  | { matched: Matched }
  | { problem: ImportProblem }
  /** The session ended (401): not about this row; the run stops */
  | { unauthenticated: true }
>;

/** Match one row; a doubtful or failing row becomes a problem. Never rejects. */
async function matchRow(
  row: ImportRow,
  match: (row: ImportRow) => Promise<MatchResult>,
  providers: ReadonlyArray<WatchProvider>,
): Promise<Outcome> {
  try {
    const result = await match(row);
    if (result.kind === 'problem') {
      return { problem: toProblem(row, result.problem) };
    }
    return {
      matched: {
        item: {
          episode: result.episode,
          seasonNumber: result.seasonNumber,
          tvSeries: result.tvSeries,
          watchedAt: row.watchedAt,
          watchProvider: matchProvider(row.watchProvider, providers),
        },
        row,
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    // The browser left: the run stops, nothing to report
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error('[import] match failed', error);
    }
    return { problem: failedProblem(row) };
  }
}

/** A batch's outcomes, or null when the session ended */
const splitOutcomes = (outcomes: ReadonlyArray<Outcome>) => {
  if (outcomes.some((outcome) => 'unauthenticated' in outcome)) {
    return null;
  }
  return {
    matched: outcomes.flatMap((o) => ('matched' in o ? [o.matched] : [])),
    problems: outcomes.flatMap((o) => ('problem' in o ? [o.problem] : [])),
  };
};

const isStatus = (error: unknown, status: number) =>
  error instanceof ApiError && error.status === status;

/** Episodes written per series: exact unless the API skipped some. */
const showsOf = (
  matched: ReadonlyArray<Matched>,
  skipped: number,
): ImportedShow[] => {
  const byId = new Map<number, ImportedShow>();
  for (const { item } of matched) {
    const { id, posterImage, slug, title } = item.tvSeries;
    const known = byId.get(id);
    byId.set(id, {
      count: (known?.count ?? 0) + 1,
      id,
      posterImage: posterImage || null,
      slug,
      title,
    });
  }
  // The API reports how many it skipped, not which: take them off the series
  // that came last in the batch
  let toRemove = skipped;
  const shows = [...byId.values()].reverse().map((show) => {
    const removed = Math.min(show.count, toRemove);
    toRemove -= removed;
    return { ...show, count: show.count - removed };
  });
  return shows.reverse().filter((show) => show.count > 0);
};

const lastTitle = (
  matched: ReadonlyArray<Matched>,
  rows: ReadonlyArray<ImportRow>,
) => matched.at(-1)?.item.tvSeries.title ?? rows.at(-1)?.title ?? null;

/**
 * Matches the rows and streams one event per batch: a dry run asks the API
 * what each batch would do (nothing is written); an import writes it. Only
 * rows that matched an episode for certain are sent; every other row comes
 * back as a problem, as does each row the route refused (first, in an event
 * of its own). The user id is never sent: the API reads it from the token.
 */
export async function* runImport(
  options: RunOptions,
): AsyncGenerator<CheckEvent | ImportEvent> {
  const { accessToken, importId, now, region, rows, signal } = options;

  const refused = options.refused ?? [];
  if (refused.length > 0) {
    yield importId
      ? {
          current: null,
          problems: refused,
          shows: [],
          skipped: 0,
          status: 'progress',
          written: 0,
        }
      : {
          alreadyWatched: 0,
          matched: 0,
          problems: refused,
          seriesIds: [],
          status: 'checked',
        };
  }
  if (rows.length === 0) {
    return;
  }

  const providers = await loadRegionProviders(region).catch(
    (): ReadonlyArray<WatchProvider> => [],
  );
  const limit = createLimiter(CATALOG_CONCURRENCY);
  const limited =
    <A extends unknown[], R>(read: (...args: A) => Promise<R>) =>
    (...args: A) =>
      limit(() =>
        signal.aborted
          ? Promise.reject(new DOMException('Aborted', 'AbortError'))
          : read(...args),
      );
  const { match } = createEpisodeMatcher({
    getSeason: limited(loadSeason),
    getTvSeries: limited(loadSeriesForWrite),
    searchTvSeries: limited(searchSeries),
  });

  // Every row starts matching now; batches are reported in order as each
  // completes, so later batches' reads overlap the earlier batches' API calls
  const outcomes = rows.map((row) => matchRow(row, match, providers));
  // The Check writes nothing: one check call for the whole request
  const batchSize = importId
    ? IMPORT_WRITE_BATCH_SIZE
    : IMPORT_MAX_ROWS_PER_REQUEST;

  for (let i = 0; i < rows.length; i += batchSize) {
    if (signal.aborted) {
      return;
    }
    const batchRows = rows.slice(i, i + batchSize);
    const split = splitOutcomes(
      await Promise.all(outcomes.slice(i, i + batchSize)),
    );
    if (!split) {
      yield { error: 'unauthenticated', status: 'error' };
      return;
    }
    const { matched, problems } = split;
    const items: ImportBatch = matched.map(({ item }) =>
      toImportItem(item, now),
    );

    if (!importId) {
      try {
        const result =
          items.length > 0
            ? await apiFetch<ImportCheckResult>('/me/imports/check', {
                accessToken,
                body: items,
                method: 'POST',
              })
            : null;
        yield {
          alreadyWatched: result?.skipped ?? 0,
          matched: items.length,
          problems,
          seriesIds: [...new Set(matched.map((m) => m.item.tvSeries.id))],
          status: 'checked',
        };
      } catch (error) {
        yield {
          error: isStatus(error, 401) ? 'unauthenticated' : 'failed',
          status: 'error',
        };
        return;
      }
      continue;
    }

    let written = 0;
    let skipped = 0;
    const failed: ImportProblem[] = [];
    if (items.length > 0) {
      try {
        const result = await apiFetch<ImportBatchResult>(
          '/me/imports/:importId/batch',
          {
            accessToken,
            body: items,
            method: 'POST',
            params: { importId },
          },
        );
        written = result.written;
        skipped = result.skipped;
      } catch (error) {
        if (isStatus(error, 401)) {
          yield { error: 'unauthenticated', status: 'error' };
          return;
        }
        if (isStatus(error, 409)) {
          yield { error: 'conflict', status: 'error' };
          return;
        }
        failed.push(...matched.map(({ row }) => failedProblem(row)));
      }
    }
    const didWrite = failed.length === 0;
    yield {
      current: lastTitle(matched, batchRows),
      problems: [...problems, ...failed],
      shows: didWrite ? showsOf(matched, skipped) : [],
      skipped,
      status: 'progress',
      written,
    };
  }
}
