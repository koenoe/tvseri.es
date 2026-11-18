/**
 * How the landings write their numbers (grouped counts are
 * `formatGrouped`): whole percentages ("71%"), lengths in hours
 * ("4h", "7h 30m", "49h") and page ranges ("1–10 of 50").
 */

import { plural, upperFirst } from '@tvseri.es/utils';

import { pluralCapped } from '@/lib/format/text';

const PERCENT = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 0,
  style: 'percent',
});

/** A whole percentage, 71 → "71%" */
export const formatPercent = (value: number): string =>
  PERCENT.format(value / 100);

/** "1 series", "146 series", "20,000+ series" (TMDB's count stops at its cap) */
export const formatShows = (count: number): string =>
  pluralCapped(count, 'series', 'series');

/** "7 seasons", or "9 episodes" for a one-season show (the theme spotlight) */
export function formatSeasons(
  seasons: number,
  episodes: number,
): string | null {
  if (seasons > 1) {
    return `${seasons} seasons`;
  }
  return episodes > 0 ? plural(episodes, 'episode') : null;
}

/**
 * A TMDB keyword ("post-apocalyptic future") as a title: "Post-apocalyptic
 * future". Only the first letter changes, so "BBC" or "New York" keep their
 * capitals (unlike `sentenceCase` in `lib/format/text`, which lowers the rest).
 */
export const keywordTitle = (name: string): string => upperFirst(name.trim());

/**
 * Chip labels in our own wording ("Organised crime"), by the theme's name
 * in lower case; every other chip is the theme's name.
 */
const KEYWORD_LABELS: Readonly<Record<string, string>> = {
  'organized crime': 'Organised crime',
};

/** A theme chip or tab label (the facts' chip name): our wording, else `keywordTitle` */
export const keywordLabel = (name: string): string =>
  KEYWORD_LABELS[name.trim().toLowerCase()] ?? keywordTitle(name);
