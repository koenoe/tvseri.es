import {
  episodeCode,
  type LibraryIds,
  type MarkWhen,
} from '@tvseri.es/schemas';

import { seriesProgress } from './progress';

import type {
  EpisodeCode,
  MarkingOp,
  SeriesBase,
  SeriesSeed,
  WatchRecord,
} from './types';

/** The store's base for a seed (server truth for one show). */
export function seedToBase(seed: SeriesSeed): SeriesBase {
  const watched: Record<EpisodeCode, WatchRecord> = {};
  for (const item of seed.watched ?? []) {
    watched[episodeCode(item)] = {
      runtime: item.runtime ?? 0,
      watchedAt: item.watchedAt,
      ...(item.dateUnknown ? { dateUnknown: true } : {}),
      ...(item.watchProviderName ? { source: item.watchProviderName } : {}),
    };
  }
  return {
    prefs: seed.status
      ? {
          firstTrackingAnsweredAt: seed.status.prefs.firstTrackingAnsweredAt,
          neverAskBefore: seed.status.prefs.neverAskBefore,
        }
      : null,
    seasons: seed.seasons,
    seriesId: seed.seriesId,
    skipped: [...(seed.status?.prefs.skipped ?? [])].sort(),
    status: seed.status
      ? {
          isFavorited: seed.status.isFavorited,
          isWatchlisted: seed.status.isWatchlisted,
        }
      : null,
    watched,
    ...(seed.unavailable ? { unavailable: true } : {}),
  };
}

const without = (
  codes: ReadonlyArray<EpisodeCode>,
  drop: ReadonlySet<EpisodeCode>,
) => codes.filter((code) => !drop.has(code));

/**
 * Applies one change. Marking clears "skipped" for those episodes (the API
 * does the same in the mark request); skipping never touches watched records
 * (a skipped episode is never watched: the UI only skips unwatched ones).
 */
export function applyOp(base: SeriesBase, op: MarkingOp): SeriesBase {
  switch (op.kind) {
    case 'mark': {
      const codes = new Set(Object.keys(op.records));
      return {
        ...base,
        skipped: without(base.skipped, codes),
        watched: { ...base.watched, ...op.records },
      };
    }
    case 'unmark': {
      const watched = { ...base.watched };
      for (const code of op.codes) {
        delete watched[code];
      }
      return { ...base, watched };
    }
    case 'skip': {
      const skipped = new Set([...base.skipped, ...op.codes]);
      return { ...base, skipped: [...skipped].sort() };
    }
    case 'unskip':
      return { ...base, skipped: without(base.skipped, new Set(op.codes)) };
    case 'list': {
      const status = base.status ?? {
        isFavorited: false,
        isWatchlisted: false,
      };
      return {
        ...base,
        status:
          op.list === 'favorites'
            ? { ...status, isFavorited: op.value }
            : { ...status, isWatchlisted: op.value },
      };
    }
    case 'prefs': {
      const prefs = base.prefs ?? {
        firstTrackingAnsweredAt: null,
        neverAskBefore: false,
      };
      return { ...base, prefs: { ...prefs, ...op.patch } };
    }
  }
}

export type PendingOp = Readonly<{ id: number; op: MarkingOp }>;

/** What every control draws: the base with the pending changes on top. */
export const applyPending = (
  base: SeriesBase,
  pending: ReadonlyArray<PendingOp>,
): SeriesBase =>
  pending.reduce((current, { op }) => applyOp(current, op), base);

/**
 * The ops that put `codes` back exactly as they are in `prior` (Undo), from
 * `current`: watched ones get their record (date, no-date flag) back, the rest
 * are unmarked, and skipped flags return or go.
 */
export function restoreOps(
  prior: SeriesBase,
  current: SeriesBase,
  codes: ReadonlyArray<EpisodeCode>,
): ReadonlyArray<MarkingOp> {
  const records: Record<EpisodeCode, WatchRecord> = {};
  const unmark: EpisodeCode[] = [];
  for (const code of codes) {
    const record = prior.watched[code];
    if (record) {
      if (current.watched[code] !== record) {
        records[code] = record;
      }
    } else if (current.watched[code]) {
      unmark.push(code);
    }
  }
  const wasSkipped = new Set(prior.skipped);
  const isSkipped = new Set(current.skipped);
  const reskip = codes.filter(
    (code) => wasSkipped.has(code) && !isSkipped.has(code),
  );
  // A restored record clears the skip by itself (a mark always does).
  const unskip = codes.filter(
    (code) => isSkipped.has(code) && !wasSkipped.has(code) && !records[code],
  );
  const ops: MarkingOp[] = [];
  if (Object.keys(records).length > 0) {
    ops.push({ kind: 'mark', records });
  }
  if (unmark.length > 0) {
    ops.push({ codes: unmark, kind: 'unmark' });
  }
  if (reskip.length > 0) {
    ops.push({ codes: reskip, kind: 'skip' });
  }
  if (unskip.length > 0) {
    ops.push({ codes: unskip, kind: 'unskip' });
  }
  return ops;
}

/** The record a mark with `when` gives an episode (`prior`: its record now) */
export const recordOf = (
  when: MarkWhen,
  now: number,
  prior?: WatchRecord,
): WatchRecord => {
  switch (when.kind) {
    case 'now':
      return { runtime: prior?.runtime ?? 0, watchedAt: now };
    case 'date':
      return { runtime: prior?.runtime ?? 0, watchedAt: when.watchedAt };
    case 'unknown':
      return {
        dateUnknown: true as const,
        runtime: prior?.runtime ?? 0,
        watchedAt: now,
      };
    case 'release':
      // The server knows the air dates; until it answers keep what's there.
      return prior ?? { runtime: 0, watchedAt: now };
  }
};

/**
 * The one way the library ids change: `seriesIds` put in (`on`) or taken out
 * of `list`, kept in the API's ascending order. The same `ids` when nothing
 * changes, so a write that keeps the lists notifies no reader.
 */
export function withMembership(
  ids: LibraryIds,
  list: keyof LibraryIds,
  seriesIds: ReadonlyArray<number>,
  on: boolean,
): LibraryIds {
  const current = ids[list];
  const has = new Set(current);
  if (seriesIds.every((id) => has.has(id) === on)) {
    return ids;
  }
  const change = new Set(seriesIds);
  return {
    ...ids,
    [list]: on
      ? [...new Set([...current, ...seriesIds])].sort((a, b) => a - b)
      : current.filter((id) => !change.has(id)),
  };
}

/** The library ids after a write to a show: its lists and progress decide */
export function libraryAfter(
  ids: LibraryIds,
  seriesId: number,
  series: SeriesBase,
): LibraryIds {
  const progress = seriesProgress(series);
  const started = progress.watched > 0;
  const lists: ReadonlyArray<readonly [keyof LibraryIds, boolean]> = [
    ['favorites', series.status?.isFavorited === true],
    // The API's rule: skipped counts as done for Finished
    ['inProgress', started && !progress.isFinished],
    ['watched', progress.isFinished],
    ['watchlist', series.status?.isWatchlisted === true],
  ];
  return lists.reduce(
    (next, [list, on]) => withMembership(next, list, [seriesId], on),
    ids,
  );
}
