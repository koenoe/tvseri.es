import { isCappedCount, TMDB_COUNT_CAP } from '@tvseri.es/constants';

const GROUPED = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** 10927 → "10,927" */
export const formatGrouped = (value: number): string => GROUPED.format(value);

/** TMDB's count stops at its cap: such a count means "at least 20,000" */
export { isCappedCount };

/**
 * The one way a TMDB show count is printed (hero facts, meta lines, tiles,
 * chips): grouped, and "20,000+" where TMDB's count stops at its cap.
 */
export const formatCappedCount = (value: number): string =>
  isCappedCount(value)
    ? `${formatGrouped(TMDB_COUNT_CAP - 1)}+`
    : formatGrouped(value);
