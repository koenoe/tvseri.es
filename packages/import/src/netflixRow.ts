import type { ImportRow, NetflixViewedItem } from '@tvseri.es/schemas';

import { splitEntry } from './parseEntry';

/** The watch provider name an imported or synced Netflix row carries */
const NETFLIX = 'Netflix';

type NetflixRow =
  | Readonly<{ kind: 'episode'; row: ImportRow }>
  /**
   * Counted and skipped: tvseri.es tracks series only. Includes entries that
   * name no show or no episode
   */
  | Readonly<{ kind: 'film' }>;

/** A row without a show or an episode is never kept for review as a nameless show */
export const namesEpisode = (
  row: Readonly<{ title: string; episode: string | number }>,
) => row.title.trim() !== '' && String(row.episode).trim() !== '';

/**
 * One viewing-history entry as an import row. Only an entry without a show
 * title falls back to splitting the combined title, as the CSV import does.
 * Every entry counts as watched: Netflix lists a title once it has been played.
 */
export const netflixRow = (
  entry: NetflixViewedItem,
  index: number,
): NetflixRow => {
  const isSeries =
    (entry.series !== undefined && entry.series !== false) ||
    Boolean(entry.seriesTitle);
  if (!isSeries) {
    return { kind: 'film' };
  }
  const split = entry.seriesTitle?.trim()
    ? {
        episode: entry.episodeTitle || entry.title,
        season: entry.seasonDescriptor ?? '',
        title: entry.seriesTitle,
      }
    : splitEntry(entry.title);
  if (!namesEpisode(split)) {
    return { kind: 'film' };
  }
  return {
    kind: 'episode',
    row: {
      episode: split.episode.trim(),
      index,
      season: split.season.trim(),
      title: split.title.trim(),
      watchedAt: entry.date,
      watchProvider: NETFLIX,
    },
  };
};
