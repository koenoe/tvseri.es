import {
  ImportIdSchema,
  PositiveIdSchema,
  WatchedAtSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import {
  IMPORT_MAX_ROWS_PER_REQUEST,
  IMPORT_MAX_SERVICE_LENGTH,
  IMPORT_MAX_TEXT_LENGTH,
  type ImportProblem,
  type ImportRow,
} from './contract';

/** A refused row's cells are sent back for display only: this much of each */
const SHOWN_MAX_LENGTH = 200;

const text = v.pipe(v.string(), v.maxLength(IMPORT_MAX_TEXT_LENGTH));
const index = v.pipe(v.number(), v.integer(), v.minValue(0));

/** Season and episode cells: text or a number from a numeric column. */
const CellSchema = v.union([
  text,
  v.pipe(v.number(), v.finite(), v.minValue(0)),
]);

/** Epoch ms inside the API's window, or null: "I don't remember". */
const ImportWatchedAtSchema = v.nullable(WatchedAtSchema);

const ImportRowSchema = v.object({
  episode: CellSchema,
  episodeNumber: v.optional(index),
  index,
  season: CellSchema,
  seasonNumber: v.optional(index),
  seriesId: v.optional(PositiveIdSchema),
  title: text,
  watchedAt: ImportWatchedAtSchema,
  watchProvider: v.optional(
    v.pipe(v.string(), v.maxLength(IMPORT_MAX_SERVICE_LENGTH)),
  ),
});

/**
 * `POST /api/account/import` body (the contract's `ImportRequest`). Each row
 * only needs its `index` here: a row that breaks `ImportRowSchema` is refused
 * on its own (`readRequestRows`), so one bad cell never stops a chunk.
 */
export const ImportRequestSchema = v.object({
  importId: v.optional(ImportIdSchema),
  rows: v.pipe(
    v.array(v.looseObject({ index })),
    v.minLength(1),
    v.maxLength(IMPORT_MAX_ROWS_PER_REQUEST),
  ),
});

const shownCell = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).slice(0, SHOWN_MAX_LENGTH)
    : '';

/** The request's rows that fit the schema, and a `failed` problem for each other row. */
export const readRequestRows = (
  rows: ReadonlyArray<Readonly<Record<string, unknown> & { index: number }>>,
): Readonly<{ rows: ImportRow[]; refused: ImportProblem[] }> => {
  const valid: ImportRow[] = [];
  const refused: ImportProblem[] = [];
  for (const row of rows) {
    const parsed = v.safeParse(ImportRowSchema, row);
    if (parsed.success) {
      valid.push(parsed.output);
    } else {
      refused.push({
        index: row.index,
        kind: 'failed',
        row: {
          episode: shownCell(row.episode),
          season: shownCell(row.season),
          title: shownCell(row.title),
        },
      });
    }
  }
  return { refused, rows: valid };
};
