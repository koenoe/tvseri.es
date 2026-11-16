import type { StatsNewOrBack, StatsSeriesRef } from '@tvseri.es/schemas';
import { plural } from '@/lib/format/text';
import { fitNames, withMore } from '@/lib/text/fitNames';

const STACK = 5;
const CAPTION = 3;

export type Side = Readonly<{
  /** The first five, most hours first */
  stack: ReadonlyArray<StatsSeriesRef>;
  /** The first three titles: "The Pitt, Adolescence, Billions" */
  caption: string;
}>;

export type NewBackSummary = Readonly<{
  newCount: number;
  backCount: number;
  new: Side;
  back: Side;
}>;

/** The caption's room beside the posters on a wide screen; narrower ones wrap, never clip */
const CAPTION_PX = 440;

/**
 * The first three titles, fewer when they would not fit one line; then the
 * line ends in "and N more" worked out from the titles it shows.
 */
const side = (shows: ReadonlyArray<StatsSeriesRef>): Side => {
  const titles = shows.slice(0, CAPTION).map((show) => show.title);
  const total = shows.length;
  return {
    caption: fitNames(
      titles,
      (shown) =>
        shown.length < titles.length
          ? withMore(shown, total)
          : shown.join(', '),
      { maxWidth: CAPTION_PX },
    ),
    stack: shows.slice(0, STACK),
  };
};

/** The two counts and what each side's poster stack and caption show */
export function newBackSummary(data: StatsNewOrBack): NewBackSummary {
  return {
    back: side(data.back),
    backCount: data.back.length,
    new: side(data.new),
    newCount: data.new.length,
  };
}

/** "44 new shows, 27 returning" (the split bar's accessible name) */
export const splitLabel = (newCount: number, backCount: number) =>
  `${plural(newCount, 'new series', 'new series')}, ${backCount} returning`;
