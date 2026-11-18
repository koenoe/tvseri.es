'use client';

import type { LibraryIds } from '@tvseri.es/schemas';
import { memo, useCallback, useMemo, useState } from 'react';

import { useLibrarySelect } from '@/lib/marking/hooks';
import { isNewToViewer } from '@/lib/marking/librarySets';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import type { DiaryMonth, DiaryRow as Row } from '@/lib/profile/diary';
import WatchlistAdd from '../../_components/blocks/WatchlistAdd';
import DiaryRow from './DiaryRow';
import { RowNewTag } from './RowActions';
import RowRemote from './RowRemote';

/** The owner's row with its ⋯: the ⋯'s element is made inside the memo, once per row */
const OwnerRow = memo(function OwnerRow({ row }: Readonly<{ row: Row }>) {
  return <DiaryRow action={<RowRemote row={row} />} row={row} />;
});
OwnerRow.displayName = 'OwnerRow';

/** A visitor's row: "New to you" and + on the first row of a show new to them */
const VisitorRow = memo(function VisitorRow({
  isNew,
  row,
}: Readonly<{ isNew: boolean; row: Row }>) {
  if (!isNew) {
    return <DiaryRow actionAlways row={row} />;
  }
  return (
    <DiaryRow
      action={<WatchlistAdd seriesId={row.seriesId} title={row.show} />}
      actionAlways
      row={row}
      tag={<RowNewTag />}
    />
  );
});
VisitorRow.displayName = 'VisitorRow';

type NewRows = ReadonlyMap<string, ReadonlySet<string>>;

const NONE: NewRows = new Map();

const READY = () => true;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((key) => b.has(key));

/**
 * The first (newest) row of each show new to the viewer, per month. A
 * month's set keeps its object while its rows don't change, so a page
 * landing below re-renders no month above it.
 */
function createNewRows() {
  let before: NewRows = NONE;
  return (months: ReadonlyArray<DiaryMonth>, ids: LibraryIds): NewRows => {
    before = newRowsByMonth(months, ids, before);
    return before;
  };
}

function newRowsByMonth(
  months: ReadonlyArray<DiaryMonth>,
  ids: LibraryIds,
  before: NewRows,
): NewRows {
  const result = new Map<string, ReadonlySet<string>>();
  const seen = new Set<number>();
  for (const month of months) {
    const keys = new Set<string>();
    for (const day of month.days) {
      for (const row of day.rows) {
        if (!seen.has(row.seriesId)) {
          seen.add(row.seriesId);
          if (isNewToViewer(ids, row.seriesId)) {
            keys.add(row.key);
          }
        }
      }
    }
    const was = before.get(month.key);
    result.set(month.key, was && sameSet(was, keys) ? was : keys);
  }
  return result;
}

/**
 * Each row's extras: the owner's ⋯ (the Remote), or for a visitor "New to
 * you" and + on the first (newest) row of each show new to them (as the
 * page opened: + then shows a check while the show is on their watchlist).
 * `renderRow` changes only with `owner`: months a page did not
 * touch skip their render.
 */
export default function useRowRenderer(
  owner: boolean,
  months: ReadonlyArray<DiaryMonth>,
) {
  // Only the moment the library is known re-renders the diary (the ids are
  // read once, then kept): a mark or a + later changes nothing here
  const ready = useLibrarySelect(READY, false);
  const store = useMarkingStoreApi();
  // What was new when the page opened stays new: a + pressed keeps its row
  // (a check), instead of vanishing under the pointer
  const [ids, setIds] = useState<LibraryIds | null>(null);
  if (!owner && ready && !ids) {
    const { library } = store.getState();
    if (library.status === 'ready') {
      setIds(library.ids);
    }
  }
  const [newRowsOf] = useState(createNewRows);
  const newRows = useMemo(
    () => (ids ? newRowsOf(months, ids) : NONE),
    [ids, months, newRowsOf],
  );

  const renderRow = useCallback(
    (row: Row, isNew: boolean) =>
      owner ? (
        <OwnerRow key={row.key} row={row} />
      ) : (
        <VisitorRow isNew={isNew} key={row.key} row={row} />
      ),
    [owner],
  );
  return { newRows, renderRow } as const;
}
