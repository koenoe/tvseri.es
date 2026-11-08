import type { WatchedItem } from '@tvseri.es/schemas';
import { pick } from '@tvseri.es/utils';

const HISTORY_ITEM_KEYS = [
  'episodeAirDate',
  'episodeNumber',
  'episodeTitle',
  'posterImage',
  'runtime',
  'seasonNumber',
  'seriesId',
  'slug',
  'title',
  'watchedAt',
  'watchProviderLogoImage',
  'watchProviderName',
] as const satisfies ReadonlyArray<keyof WatchedItem>;

/** The fields the history timeline and cards read. */
export type HistoryItem = Readonly<
  Pick<WatchedItem, (typeof HISTORY_ITEM_KEYS)[number]>
>;

/**
 * Trims a watched item to what the history UI renders, for both the first
 * page (RSC props) and later pages (route handler).
 */
export const toHistoryItem = (item: HistoryItem): HistoryItem =>
  pick(item, HISTORY_ITEM_KEYS);
