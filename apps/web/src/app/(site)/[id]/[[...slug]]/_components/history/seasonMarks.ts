import { codeOf, nextEpisode } from '@/lib/marking/progress';
import type { MarkingStore } from '@/lib/marking/store';
import type { EpisodeRef, SeriesBase, WatchRecord } from '@/lib/marking/types';

import { type SheetChip, seasonChips } from './chips';

/** One season's chips and, in the same order, their watched records. */
export type SeasonMarks = Readonly<{
  chips: ReadonlyArray<SheetChip>;
  records: ReadonlyArray<WatchRecord | undefined>;
}>;

/** Next up per view: every season's selector asks for the same view's. */
const nextByView = new WeakMap<SeriesBase, EpisodeRef | null>();

function nextOf(view: SeriesBase): EpisodeRef | null {
  let next = nextByView.get(view);
  if (next === undefined) {
    next = nextEpisode(view);
    nextByView.set(view, next);
  }
  return next;
}

/** A season's chips and records from the show's view. */
export function seasonMarks(
  view: SeriesBase,
  seasonNumber: number,
): SeasonMarks {
  const chips = seasonChips(view, seasonNumber, nextOf(view));
  return {
    chips,
    records: chips.map((chip) => view.watched[codeOf(chip.ref)]),
  };
}

const sameChip = (a: SheetChip | undefined, b: SheetChip) =>
  a !== undefined &&
  a.state === b.state &&
  a.ref.episodeNumber === b.ref.episodeNumber &&
  a.ref.seasonNumber === b.ref.seasonNumber;

/**
 * `next`, reusing what didn't change from `prev`: the same object when the
 * season is unchanged, else the unchanged chips' own objects, so a memoised
 * chip re-renders only when its state did.
 */
export function shareSeasonMarks(
  prev: SeasonMarks | undefined,
  next: SeasonMarks,
): SeasonMarks {
  if (!prev) {
    return next;
  }
  let changed = prev.chips.length !== next.chips.length;
  const chips = next.chips.map((chip, index) => {
    const before = prev.chips[index];
    if (sameChip(before, chip)) {
      return before!;
    }
    changed = true;
    return chip;
  });
  const records = next.records.some(
    (record, index) => record !== prev.records[index],
  )
    ? next.records
    : prev.records;
  return changed || records !== prev.records ? { chips, records } : prev;
}

/**
 * A store selector for one season of the sheet: the same `SeasonMarks`
 * until that season's chips or records change, so a mark elsewhere in the
 * show re-renders neither this season nor its chips. One per section.
 */
export function seasonMarksSelector(
  seriesId: number,
  seasonNumber: number,
): (state: MarkingStore) => SeasonMarks | undefined {
  let view: SeriesBase | undefined;
  let marks: SeasonMarks | undefined;
  return (state) => {
    const current = state.series[seriesId]?.view;
    if (current !== view) {
      view = current;
      marks = current
        ? shareSeasonMarks(marks, seasonMarks(current, seasonNumber))
        : undefined;
    }
    return marks;
  };
}
