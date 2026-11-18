/**
 * Paging for the ranked list ("The 50 best"): 10 a page in two
 * columns on desktop, with arrows and "1–10 of 50"; 5 more at a time on a
 * phone ("Show 6 to 10 of 50"), and it still ends at the last.
 */

export type RankedPage<T> = Readonly<{
  items: ReadonlyArray<Readonly<{ rank: number; item: T }>>;
  /** "1–10 of 50" */
  range: string;
  atStart: boolean;
  atEnd: boolean;
}>;

const pageCount = (total: number, size: number): number =>
  Math.max(1, Math.ceil(total / size));

/** One page (0-based, clamped) of the list, with ranks from 1 */
export function rankedPage<T>(
  items: ReadonlyArray<T>,
  page: number,
  size: number,
): RankedPage<T> {
  const last = pageCount(items.length, size) - 1;
  const current = Math.min(Math.max(0, page), last);
  const start = current * size;
  const slice = items.slice(start, start + size);
  return {
    atEnd: current === last,
    atStart: current === 0,
    items: slice.map((item, index) => ({ item, rank: start + index + 1 })),
    range:
      items.length === 0
        ? '0 of 0'
        : `${start + 1}–${start + slice.length} of ${items.length}`,
  };
}

/**
 * The phone's "Show 6 to 10 of 50" label for the next step after `shown`
 * items; null when every item is shown.
 */
export function showMoreLabel(
  shown: number,
  total: number,
  step: number,
): string | null {
  if (shown >= total) {
    return null;
  }
  return `Show ${shown + 1} to ${Math.min(shown + step, total)} of ${total}`;
}

/** The ranked list's layout, shared with its skeleton: two columns of five from md */
export const RANKED_COLUMNS =
  'grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-12 gap-y-1 max-md:hidden';

/** A phone's five rows and the Show more button below them */
export const RANKED_PHONE = '-mx-2 flex flex-col items-start gap-4 md:hidden';

export const RANKED_PHONE_LIST = 'flex w-full flex-col gap-0.5';

/** One row's grid: the rank, the title and facts, the end */
export const RANKED_ROW = {
  compact:
    'grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-12 px-2 py-2.5',
  full: 'grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-12 px-4 py-3',
} as const;
