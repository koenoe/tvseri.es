type ReturnCandidate = Readonly<{
  favourite: boolean;
  finishedAt?: number;
  /** Regular seasons as the series facts list them ('' when undated) */
  seasons: ReadonlyArray<Readonly<{ airDate: string }>>;
}>;

const median = (values: ReadonlyArray<number>) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

/**
 * The last aired season's start plus the show's typical gap between season
 * starts (the median, so one long break doesn't skew it); null without two
 * aired seasons. A listed season that hasn't started yet is left out.
 */
const expectedReturnOf = (
  seasons: ReturnCandidate['seasons'],
  now: number,
): number | null => {
  const starts = seasons
    .map((season) => Date.parse(season.airDate))
    .filter((start) => !Number.isNaN(start) && start <= now)
    .sort((a, b) => a - b);
  const gaps = starts
    .slice(1)
    .map((start, index) => start - (starts[index] ?? start))
    .filter((gap) => gap > 0);
  const last = starts.at(-1);
  return gaps.length > 0 && last !== undefined ? last + median(gaps) : null;
};

const monthOf = (time: number) => new Date(time).toISOString().slice(0, 7);

/**
 * Renewed shows without a date, by when they are probably back. Shows due
 * this month or already overdue come first, the most recently due first: a
 * show just past its usual gap is the likeliest to get a date next, while one
 * years overdue has probably stalled. Then the upcoming ones, soonest first.
 * Within a month the viewer's favourites lead. Shows with one season have no
 * rhythm and follow, most recently finished first.
 */
export const byExpectedReturn = <T extends ReturnCandidate>(
  items: ReadonlyArray<T>,
  now: number,
): T[] => {
  const thisMonth = monthOf(now);
  const keyed = items.map((item) => {
    const expected = expectedReturnOf(item.seasons, now);
    const month = expected === null ? '' : monthOf(expected);
    return { due: month <= thisMonth, expected, item, month };
  });

  return keyed
    .sort((a, b) => {
      if (a.expected === null || b.expected === null) {
        return a.expected === b.expected
          ? (b.item.finishedAt ?? 0) - (a.item.finishedAt ?? 0)
          : a.expected === null
            ? 1
            : -1;
      }
      if (a.due !== b.due) return a.due ? -1 : 1;
      // Due: latest first; upcoming: soonest first
      const direction = a.due ? -1 : 1;
      if (a.month !== b.month) {
        return direction * a.month.localeCompare(b.month);
      }
      if (a.item.favourite !== b.item.favourite) {
        return a.item.favourite ? -1 : 1;
      }
      return direction * (a.expected - b.expected);
    })
    .map(({ item }) => item);
};
