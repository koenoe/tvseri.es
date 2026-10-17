import isRecord from '@/utils/isRecord';

/**
 * Wire format shared by the CSV import client (components/Import) and the
 * import route (app/api/account/import).
 */

export const IMPORT_ENDPOINT = '/api/account/import';
/** Rows per POST request sent by the client. */
export const IMPORT_CHUNK_SIZE = 50;
/** Hard cap enforced by the route. */
const IMPORT_MAX_ROWS_PER_REQUEST = 100;

/** Season/episode cells can be numbers when the CSV has numeric columns. */
export type ImportCell = string | number;

export type ImportRow = Readonly<{
  title: string;
  season: ImportCell;
  episode: ImportCell;
  /** Epoch ms, already resolved on the client (see parseDate.ts). */
  watchedAt: number;
  watchProvider?: string;
}>;

export type ImportError = Readonly<{
  item: Readonly<{ title: string; season: string; episode: string }>;
  error: string;
}>;

export type ImportEvent =
  | Readonly<{
      status: 'progress';
      successCount: number;
      errors: ReadonlyArray<ImportError>;
    }>
  | Readonly<{ status: 'error'; error: string }>;

const isCell = (value: unknown): value is ImportCell =>
  typeof value === 'string' ||
  (typeof value === 'number' && Number.isFinite(value));

const isImportError = (value: unknown): value is ImportError =>
  isRecord(value) &&
  typeof value.error === 'string' &&
  isRecord(value.item) &&
  typeof value.item.title === 'string' &&
  typeof value.item.season === 'string' &&
  typeof value.item.episode === 'string';

export const isImportEvent = (value: unknown): value is ImportEvent => {
  if (!isRecord(value)) {
    return false;
  }
  if (value.status === 'error') {
    return typeof value.error === 'string';
  }
  return (
    value.status === 'progress' &&
    typeof value.successCount === 'number' &&
    Number.isFinite(value.successCount) &&
    Array.isArray(value.errors) &&
    value.errors.every(isImportError)
  );
};

const isImportRow = (value: unknown): value is ImportRow =>
  isRecord(value) &&
  typeof value.title === 'string' &&
  isCell(value.season) &&
  isCell(value.episode) &&
  typeof value.watchedAt === 'number' &&
  Number.isFinite(value.watchedAt) &&
  value.watchedAt > 0 &&
  (value.watchProvider === undefined ||
    typeof value.watchProvider === 'string');

export const isImportRows = (value: unknown): value is ImportRow[] =>
  Array.isArray(value) &&
  value.length <= IMPORT_MAX_ROWS_PER_REQUEST &&
  value.every(isImportRow);

export const toImportError = (
  row: Readonly<{ title?: unknown; season?: unknown; episode?: unknown }>,
  error: string,
): ImportError => ({
  error,
  item: {
    episode: String(row.episode ?? ''),
    season: String(row.season ?? ''),
    title: String(row.title ?? ''),
  },
});
