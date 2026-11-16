import 'server-only';

import { MIN_POSTERS } from '@tvseri.es/constants';
import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';
import { neverRepeat, type PlannedRow, type RowSource } from './neverRepeat';
import type { RowShow } from './types';

/**
 * Loads one row's shows (a cached loader call), top to bottom on the page.
 * A row that draws fewer than `ROW_LIMIT` says so in its source's `limit`
 * (Trending: 5, Where to start: its picks, a spotlight: 1), so the rows
 * below drop exactly what it draws. `Unavailable` when its API read failed.
 */
export type RowLoader = () => Promise<RowSource<RowShow> | Unavailable>;

const NOTHING: RowSource<RowShow> = { kind: 'shows', shows: [] };

/** Rows draw 20 posters at most (one discover page): bounded */
const ROW_LIMIT = 20;

/** A row above that failed (or is unavailable) counts as empty */
const loadAbove = (load: RowLoader) =>
  load().then(
    (source) => (isUnavailable(source) ? NOTHING : source),
    () => NOTHING,
  );

/**
 * The plan for the row at `index` against every row above it (`neverRepeat`).
 * Each row streams on its own: it loads the rows above too (the same cached
 * calls, deduped), so it needs no other row to render first. A row above
 * that failed counts as empty (it shows its error or placeholder, not
 * shows); this row's own failure throws to its `RowErrorBoundary`, and its
 * own `Unavailable` is passed on (the row draws its placeholder). A row or
 * block under `MIN_POSTERS` plans no shows: it steps aside.
 */
export async function planRow(
  loaders: ReadonlyArray<RowLoader>,
  index: number,
): Promise<PlannedRow<RowShow> | Unavailable> {
  const own = loaders[index];
  if (!own) {
    throw new Error(`planRow: no row ${index}`);
  }
  const [above, source] = await Promise.all([
    Promise.all(loaders.slice(0, index).map(loadAbove)),
    own(),
  ]);
  if (isUnavailable(source)) {
    return source;
  }
  const plan = neverRepeat([...above, source], ROW_LIMIT, MIN_POSTERS)[index];
  if (!plan) {
    throw new Error(`planRow: no plan for row ${index}`);
  }
  return plan;
}

/**
 * The ids a non-poster section at `index` (Where to start) may still draw
 * after the rows above it: for sections with no switch above them.
 */
export async function keptShows(
  loaders: ReadonlyArray<RowLoader>,
  index: number,
): Promise<ReadonlySet<number> | Unavailable> {
  const plan = await planRow(loaders, index);
  if (isUnavailable(plan)) {
    return plan;
  }
  const shows =
    plan.kind === 'shows' ? plan.shows : Object.values(plan.tabs).flat();
  return new Set(shows.map((show) => show.id));
}
