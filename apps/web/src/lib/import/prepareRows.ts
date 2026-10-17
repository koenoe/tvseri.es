import { detectDateOrder, parseDate } from './parseDate';
import {
  type ImportCell,
  type ImportError,
  type ImportRow,
  toImportError,
} from './types';

const toCell = (value: unknown): ImportCell =>
  typeof value === 'number' ? value : String(value ?? '').trim();

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

/**
 * Turns mapped CSV rows into import rows: drops duplicates, films and
 * trailers, and resolves watch dates (rows with unusable dates become errors).
 * `hasAssumedDates` is set when day/month order had to be assumed (month-first).
 */
export const prepareRows = (
  data: ReadonlyArray<Record<string, unknown>>,
): Readonly<{
  rows: ImportRow[];
  errors: ImportError[];
  hasAssumedDates: boolean;
}> => {
  const seen = new Set<string>();
  const candidates = data.filter((item) => {
    const title = normalize(item.title);
    const season = normalize(item.season);
    const episode = normalize(item.episode);
    const isMovie = String(item.Type ?? '') === 'Movie';
    const key = [title, season, episode].join('|');

    if (
      !title ||
      !episode ||
      title === season ||
      isMovie ||
      episode.includes('trailer') ||
      seen.has(key)
    ) {
      return false;
    }
    seen.add(key);
    return true;
  });

  const dateOrder = detectDateOrder(candidates.map((item) => item.date));
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  let hasAssumedDates = false;

  for (const item of candidates) {
    const date = parseDate(item.date, dateOrder);
    if ('error' in date) {
      errors.push(toImportError(item, date.error));
      continue;
    }
    hasAssumedDates ||= date.isAssumed === true;
    const watchProvider = item.watchProvider
      ? String(item.watchProvider)
      : undefined;
    rows.push({
      episode: toCell(item.episode),
      season: toCell(item.season),
      title: String(item.title).trim(),
      watchedAt: date.watchedAt,
      watchProvider,
    });
  }

  return { errors, hasAssumedDates, rows };
};
