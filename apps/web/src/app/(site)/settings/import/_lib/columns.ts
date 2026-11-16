/**
 * Which CSV column feeds which field of an import row. Detected from the
 * header row (Netflix's `Title,Date` or common header names), then editable
 * ("Edit columns"). One column may feed several fields: Netflix's `Title`
 * holds "Show: Season: Episode" and is mapped to show, season and episode.
 */

export type ServiceMapping =
  | Readonly<{ kind: 'column'; column: string }>
  /** "Same for all rows": every row gets this service */
  | Readonly<{ kind: 'fixed'; name: string }>
  | Readonly<{ kind: 'none' }>;

/** Header names; '' = no column. */
export type ColumnMapping = Readonly<{
  show: string;
  season: string;
  episode: string;
  date: string;
  service: ServiceMapping;
}>;

export type ColumnField = 'show' | 'season' | 'episode' | 'date';

export type DetectedSource = Readonly<{
  kind: 'netflix' | 'csv';
  mapping: ColumnMapping;
  /** False when show or episode stays unmapped: the UI opens "Edit columns". */
  recognised: boolean;
}>;

const normalise = (header: string) =>
  header.replace(/^﻿/, '').trim().toLowerCase();

const ALIASES: Readonly<
  Record<ColumnField | 'service', ReadonlyArray<string>>
> = {
  date: ['date', 'watched', 'watched on', 'watched at'],
  episode: ['episode', 'e', 'ep'],
  season: ['season', 's'],
  // `watchProvider`: our own history export
  service: [
    'service',
    'provider',
    'watchprovider',
    'watch provider',
    'where',
    'platform',
  ],
  show: ['show', 'series', 'title', 'name'],
};

const NETFLIX_HEADERS = ['title', 'date'];

export const NETFLIX_MAPPING: ColumnMapping = {
  date: 'Date',
  episode: 'Title',
  season: 'Title',
  service: { kind: 'fixed', name: 'Netflix' },
  show: 'Title',
};

/** The first header (in file order) whose name is one of the aliases. */
const findColumn = (
  headers: ReadonlyArray<string>,
  taken: ReadonlySet<string>,
  aliases: ReadonlyArray<string>,
): string => {
  for (const alias of aliases) {
    const header = headers.find(
      (candidate) => !taken.has(candidate) && normalise(candidate) === alias,
    );
    if (header !== undefined) {
      return header;
    }
  }
  return '';
};

export const detectSource = (
  headers: ReadonlyArray<string>,
): DetectedSource => {
  const names = headers.map(normalise);
  if (
    names.length === NETFLIX_HEADERS.length &&
    NETFLIX_HEADERS.every((name, index) => names[index] === name)
  ) {
    return { kind: 'netflix', mapping: NETFLIX_MAPPING, recognised: true };
  }

  // A header feeds one field: the first field that claims it
  const taken = new Set<string>();
  const claim = (field: ColumnField | 'service') => {
    const column = findColumn(headers, taken, ALIASES[field]);
    if (column) {
      taken.add(column);
    }
    return column;
  };
  const show = claim('show');
  const season = claim('season');
  const episode = claim('episode');
  const date = claim('date');
  const service = claim('service');

  return {
    kind: 'csv',
    mapping: {
      date,
      episode,
      season,
      service: service ? { column: service, kind: 'column' } : { kind: 'none' },
      show,
    },
    recognised: show !== '' && episode !== '',
  };
};

/** Values like "Show: Season: Episode": the column holds more than the show. */
export const isCombinedColumn = (
  rows: ReadonlyArray<Record<string, unknown>>,
  column: string,
): boolean =>
  column !== '' &&
  rows.some((row) => {
    const value = row[column];
    return typeof value === 'string' && value.indexOf(': ') > 0;
  });
