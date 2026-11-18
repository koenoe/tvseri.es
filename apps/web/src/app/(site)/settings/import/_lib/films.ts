import { formatGrouped } from '@tvseri.es/utils';
import { joinAnd, withMore } from '@/lib/text/fitNames';
import type { ColumnMapping } from './columns';
import { readRow } from './readRow';

/**
 * The first few titles `prepareRows` skips as not an episode (no episode
 * part, a film, a trailer): "Beat Luke Littler, Glass Onion and 410 more".
 * Only the names; the count comes from `prepareRows`.
 */
export function filmTitles(
  rows: ReadonlyArray<Record<string, unknown>>,
  mapping: ColumnMapping,
  count = 2,
): ReadonlyArray<string> {
  const titles: string[] = [];
  for (const raw of rows) {
    const fields = readRow(raw, mapping);
    const episode = String(fields.episode).trim().toLowerCase();
    const isFilm =
      fields.isMovie || episode === '' || episode.includes('trailer');
    if (isFilm && fields.title && !titles.includes(fields.title)) {
      titles.push(fields.title);
      if (titles.length === count) {
        break;
      }
    }
  }
  return titles;
}

/** "Beat Luke Littler, Glass Onion and 410 more" */
export function filmsLine(
  titles: ReadonlyArray<string>,
  total: number,
): string {
  const rest = total - titles.length;
  if (titles.length === 0) {
    return `${formatGrouped(total)} films and specials`;
  }
  return rest > 0 ? withMore(titles, total) : joinAnd(titles);
}
