import {
  IMPORT_MAX_SERVICE_LENGTH,
  IMPORT_MAX_TEXT_LENGTH,
  type ImportRow,
} from '@/lib/import/contract';
import type { ColumnMapping } from './columns';
import {
  type DateOrder,
  type DateProblem,
  detectDateOrder,
  parseDate,
} from './parseDate';
import { type RowFields, readRow } from './readRow';

type ShownRow = Readonly<{ title: string; season: string; episode: string }>;

export type DateProblemRow = Readonly<{
  row: ShownRow;
  reason: DateProblem;
}>;

/**
 * A row with a show, season or episode longer than the import takes. It is
 * not imported, and not cut either: a cut title could match another show.
 */
export type TooLongRow = Readonly<{
  row: ShownRow;
  field: 'show' | 'season' | 'episode';
}>;

export type PreparedImport = Readonly<{
  /** What goes to the route; `index` is the position here */
  rows: ImportRow[];
  /** = rows.length */
  importable: number;
  skipped: Readonly<{
    /** No episode part, `Type` "Movie", trailers: not episodes */
    films: number;
    /** The same episode again: one row stays, with the latest day */
    repeats: number;
  }>;
  /** Rows whose date is unusable: not imported */
  dateProblems: ReadonlyArray<DateProblemRow>;
  /** Rows with a cell too long to import: not imported */
  tooLong: ReadonlyArray<TooLongRow>;
  dateOrder: DateOrder;
  /** Day and month order had to be assumed (month first for slashes) */
  hasAssumedDates: boolean;
  datedRows: number;
  undatedRows: number;
  showCount: number;
}>;

const normalise = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const isNotAnEpisode = (fields: RowFields) =>
  !fields.title ||
  normalise(fields.episode) === '' ||
  fields.isMovie ||
  normalise(fields.episode).includes('trailer');

/** Shown rows are for display only: this much of each cell */
const SHOWN_MAX_LENGTH = 120;

const shownRow = (fields: RowFields): ShownRow => ({
  episode: String(fields.episode).slice(0, SHOWN_MAX_LENGTH),
  season: String(fields.season).slice(0, SHOWN_MAX_LENGTH),
  title: fields.title.slice(0, SHOWN_MAX_LENGTH),
});

const isTooLong = (cell: string | number) =>
  typeof cell === 'string' && cell.length > IMPORT_MAX_TEXT_LENGTH;

const tooLongField = (fields: RowFields): TooLongRow['field'] | null => {
  if (isTooLong(fields.title)) {
    return 'show';
  }
  if (isTooLong(fields.season)) {
    return 'season';
  }
  return isTooLong(fields.episode) ? 'episode' : null;
};

type Candidate = Readonly<{
  fields: RowFields;
  key: string;
}>;

type Chosen = Readonly<{
  fields: RowFields;
  watchedAt: number | null;
  isAssumed: boolean;
}>;

/**
 * Turns the file's rows into import rows under a column mapping: drops films
 * and trailers, reads the dates (an empty date is "I don't remember"; an
 * impossible or future one is a date problem), and keeps one row per episode,
 * the one with the latest day, whatever order the file is in. A show, season
 * or episode longer than the route takes flags the row (`tooLong`); a service
 * name that long is dropped ("not recorded").
 */
export const prepareRows = (
  raw: ReadonlyArray<Record<string, unknown>>,
  mapping: ColumnMapping,
  options: Readonly<{ now: number }>,
): PreparedImport => {
  let films = 0;
  const candidates: Candidate[] = [];
  const tooLong: TooLongRow[] = [];
  for (const item of raw) {
    const fields = readRow(item, mapping);
    if (isNotAnEpisode(fields)) {
      films++;
      continue;
    }
    const field = tooLongField(fields);
    if (field) {
      tooLong.push({ field, row: shownRow(fields) });
      continue;
    }
    candidates.push({
      fields,
      key: [fields.title, fields.season, fields.episode]
        .map(normalise)
        .join('|'),
    });
  }

  const dateOrder = detectDateOrder(candidates.map((c) => c.fields.date));

  const groups = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.key);
    if (group) {
      group.push(candidate);
    } else {
      groups.set(candidate.key, [candidate]);
    }
  }

  const chosen: Chosen[] = [];
  const dateProblems: DateProblemRow[] = [];
  let repeats = 0;

  for (const group of groups.values()) {
    repeats += group.length - 1;
    let best: Chosen | null = null;
    let problem: DateProblemRow | null = null;
    for (const { fields } of group) {
      const date = parseDate(fields.date, dateOrder, options.now);
      if ('error' in date) {
        problem ??= { reason: date.error, row: shownRow(fields) };
        continue;
      }
      // An undated repeat never beats a dated one; among dated, the latest
      const isBetter =
        best === null ||
        (date.watchedAt !== null &&
          (best.watchedAt === null || date.watchedAt > best.watchedAt));
      if (isBetter) {
        best = {
          fields,
          isAssumed: date.isAssumed === true,
          watchedAt: date.watchedAt,
        };
      }
    }
    if (best) {
      chosen.push(best);
    } else if (problem) {
      dateProblems.push(problem);
    }
  }

  const rows: ImportRow[] = chosen.map(({ fields, watchedAt }, index) => ({
    episode: fields.episode,
    index,
    season: fields.season,
    title: fields.title,
    watchedAt,
    ...(fields.service && fields.service.length <= IMPORT_MAX_SERVICE_LENGTH
      ? { watchProvider: fields.service }
      : {}),
  }));
  const datedRows = rows.filter((row) => row.watchedAt !== null).length;

  return {
    datedRows,
    dateOrder,
    dateProblems,
    hasAssumedDates: chosen.some((c) => c.isAssumed),
    importable: rows.length,
    rows,
    showCount: new Set(rows.map((row) => normalise(row.title))).size,
    skipped: { films, repeats },
    tooLong,
    undatedRows: rows.length - datedRows,
  };
};
