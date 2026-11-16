import type { ColumnMapping } from './columns';
import type { ImportCell } from './contract';
import { type SplitEntry, splitEntry } from './parseEntry';

/** A cell the way the importer reads it: numbers stay numbers. */
const toCell = (value: unknown): ImportCell =>
  typeof value === 'number' ? value : String(value ?? '').trim();

export type RowFields = Readonly<{
  title: string;
  season: ImportCell;
  episode: ImportCell;
  /** The date cell as written (text, number or a Date from Papa) */
  date: unknown;
  /** The service cell, or the fixed one; '' when none */
  service: string;
  /** Show, season and episode (some of them) were pulled out of one column */
  isCombined: boolean;
  isMovie: boolean;
}>;

const cellAt = (raw: Readonly<Record<string, unknown>>, column: string) =>
  column ? raw[column] : undefined;

/**
 * The fields of one file row under a mapping. A column mapped to the show and
 * also to the season and/or episode is split ("Show: Season: Episode");
 * otherwise each field is its column's value as it is.
 */
export const readRow = (
  raw: Readonly<Record<string, unknown>>,
  mapping: ColumnMapping,
): RowFields => {
  const showCell = cellAt(raw, mapping.show);
  const isCombined =
    mapping.show !== '' &&
    (mapping.season === mapping.show || mapping.episode === mapping.show);
  const parts: SplitEntry | null =
    isCombined && typeof showCell === 'string' ? splitEntry(showCell) : null;

  const own = (column: string, part: string | undefined): ImportCell => {
    if (parts && column === mapping.show) {
      return part ?? '';
    }
    return toCell(cellAt(raw, column));
  };

  const title = parts ? parts.title : toCell(showCell);
  const service =
    mapping.service.kind === 'fixed'
      ? mapping.service.name
      : mapping.service.kind === 'column'
        ? String(raw[mapping.service.column] ?? '').trim()
        : '';

  return {
    date: cellAt(raw, mapping.date),
    episode: own(mapping.episode, parts?.episode),
    isCombined: parts !== null,
    isMovie: String(raw.Type ?? '') === 'Movie',
    season: own(mapping.season, parts?.season),
    service,
    title: String(title).trim(),
  };
};
