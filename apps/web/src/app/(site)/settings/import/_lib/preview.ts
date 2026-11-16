import { dayMonthYear, localParts } from '@/lib/format/date';
import { formatWhen } from '@/lib/format/when';
import type { ColumnMapping } from './columns';
import { type DateOrder, type DateProblem, parseDate } from './parseDate';
import {
  parseEpisodeNumber,
  recogniseSeasonNumber,
  type SplitEntry,
  splitEntry,
} from './parseEntry';
import { matchProvider } from './providers';

export type PreviewField = 'show' | 'season' | 'episode' | 'date' | 'service';

/**
 * One cell of the Check step's table: what the importer will read from the
 * file's row. `text` for season and episode is "Season 5" / "Episode 1" (the
 * UI shortens it to S5 / E1); `sub` is the small line under it.
 */
export type PreviewCell = Readonly<{
  text: string;
  sub: string;
  /** Shown as a problem (red) */
  bad: boolean;
  /** "I don't remember" (muted) */
  noDate: boolean;
}>;

export type PreviewOptions = Readonly<{
  /** The region's provider names, to tell a known service from an unknown one */
  providers?: ReadonlyArray<string>;
  /** Without it the date is not checked against the future, and shows its year */
  now?: number;
}>;

const DASH = '—';

const cell = (
  text: string,
  sub = '',
  flags: Partial<Pick<PreviewCell, 'bad' | 'noDate'>> = {},
): PreviewCell => ({ bad: false, noDate: false, sub, text, ...flags });

const looksLikeDate = (value: string) =>
  /^\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(value.trim());

const isEmpty = (value: unknown) =>
  value === null || value === undefined || String(value).trim() === '';

const formatDay = (timestamp: number, now: number | undefined) =>
  now === undefined
    ? dayMonthYear(localParts(new Date(timestamp)))
    : formatWhen(timestamp, now, { zone: 'local' });

const DATE_PROBLEM_COPY: Readonly<Record<DateProblem, string>> = {
  'before-2000': 'Before 2000',
  future: 'In the future',
  'not-a-date': 'Not a date',
};

const dateCell = (
  raw: Readonly<Record<string, unknown>>,
  mapping: ColumnMapping,
  order: DateOrder,
  now: number | undefined,
): PreviewCell => {
  const noDate = { noDate: true } as const;
  if (!mapping.date) {
    return cell('I don’t remember', 'No date column', noDate);
  }
  const value = raw[mapping.date];
  if (isEmpty(value)) {
    return cell('I don’t remember', 'Empty in your file', noDate);
  }
  const text = String(value).trim();
  const result = parseDate(value, order, now ?? Number.MAX_SAFE_INTEGER / 2);
  if ('error' in result) {
    return cell(text.slice(0, 22), DATE_PROBLEM_COPY[result.error], {
      bad: true,
    });
  }
  return result.watchedAt === null
    ? cell('I don’t remember', 'Empty in your file', noDate)
    : cell(formatDay(result.watchedAt, now), `from ${text}`);
};

const serviceCell = (
  raw: Readonly<Record<string, unknown>>,
  mapping: ColumnMapping,
  providers: ReadonlyArray<string> | undefined,
): PreviewCell => {
  const known = providers?.map((name) => ({ name }));
  const service = mapping.service;
  if (service.kind === 'fixed') {
    return cell(matchProvider(service.name, known ?? [])?.name ?? service.name);
  }
  const value = service.kind === 'column' ? raw[service.column] : undefined;
  if (isEmpty(value)) {
    return cell(DASH, 'Not recorded');
  }
  const text = String(value).trim();
  if (!known) {
    return cell(text.slice(0, 26));
  }
  const provider = matchProvider(text, known);
  return provider
    ? cell(provider.name)
    : cell(text.slice(0, 26), 'Not a service we know', { bad: true });
};

type Source = Readonly<{
  col: string;
  value: unknown;
  /** The cell is one part of a "Show: Season: Episode" column */
  parts: SplitEntry | null;
}>;

const sourceOf = (
  raw: Readonly<Record<string, unknown>>,
  mapping: ColumnMapping,
  col: string,
): Source => {
  const value = raw[col];
  const isCombined =
    mapping.season === mapping.show || mapping.episode === mapping.show;
  const parts =
    isCombined && col === mapping.show && typeof value === 'string'
      ? splitEntry(value)
      : null;
  return { col, parts, value };
};

const showCell = ({ col, parts, value }: Source): PreviewCell => {
  if (typeof value === 'number') {
    return cell(String(value), 'A number, not a series', { bad: true });
  }
  if (isEmpty(value)) {
    return cell(DASH, 'Empty', { bad: true });
  }
  const text = (parts ? parts.title : String(value)).trim();
  if (looksLikeDate(text)) {
    return cell(text, 'Looks like a date', { bad: true });
  }
  return cell(text, parts && parts.title !== value ? `out of ${col}` : '');
};

const seasonCell = ({ col, parts, value }: Source): PreviewCell => {
  if (typeof value === 'number') {
    return cell(`Season ${value}`);
  }
  if (isEmpty(value)) {
    return cell(DASH, 'Empty');
  }
  const whole = String(value).trim();
  if (looksLikeDate(whole)) {
    return cell(DASH, 'Looks like a date', { bad: true });
  }
  const label = (parts ? parts.season : whole).trim();
  if (!label) {
    return cell(DASH, 'Any season, by title');
  }
  const number = recogniseSeasonNumber(label);
  if (number === null) {
    return cell(label);
  }
  if (/^\d+$/.test(label)) {
    return cell(`Season ${number}`);
  }
  if (/^(season|seizoen)\s+\d+$/i.test(label)) {
    return cell(`Season ${number}`, parts ? `out of ${col}` : '');
  }
  return cell(`Season ${number}`, `“${label}”`);
};

const episodeCell = ({ parts, value }: Source): PreviewCell => {
  if (typeof value === 'number') {
    return cell(`Episode ${value}`);
  }
  const whole = String(value ?? '').trim();
  if (looksLikeDate(whole)) {
    return cell(DASH, 'Looks like a date', { bad: true });
  }
  const label = (parts ? parts.episode : whole).trim();
  if (!label) {
    return parts
      ? cell(DASH, 'No episode: a film?', { bad: true })
      : cell(DASH, 'Empty', { bad: true });
  }
  if (/^\d+$/.test(label)) {
    return cell(`Episode ${Number.parseInt(label, 10)}`);
  }
  if (/^episode\s+\d+$/i.test(label)) {
    return cell(`Episode ${parseEpisodeNumber(label)}`, 'by number');
  }
  const number = parseEpisodeNumber(label);
  return number === null
    ? cell(label, 'by title')
    : cell(`Episode ${number}`, label);
};

/**
 * What the Check step's table shows for one field of a file row under the
 * current mapping.
 */
export const previewCell = (
  raw: Readonly<Record<string, unknown>>,
  mapping: ColumnMapping,
  field: PreviewField,
  dateOrder: DateOrder,
  options: PreviewOptions = {},
): PreviewCell => {
  if (field === 'service') {
    return serviceCell(raw, mapping, options.providers);
  }
  if (field === 'date') {
    return dateCell(raw, mapping, dateOrder, options.now);
  }
  const col = mapping[field];
  if (!col) {
    return field === 'season'
      ? cell(DASH, 'Any season, by episode title')
      : cell(DASH, 'Choose a column', { bad: true });
  }
  const source = sourceOf(raw, mapping, col);
  switch (field) {
    case 'show':
      return showCell(source);
    case 'season':
      return seasonCell(source);
    case 'episode':
      return episodeCell(source);
  }
};
