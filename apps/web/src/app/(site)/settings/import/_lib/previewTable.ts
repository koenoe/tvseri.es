import type { ColumnMapping } from './columns';
import { columnSource, type FieldKey } from './copy';
import type { DateOrder } from './parseDate';
import { previewCell } from './preview';
import { matchProvider } from './providers';

/** The Check table's rows and headers, from the file and the mapping. */

const PREVIEW_ROWS = 5;

export type PreviewRow = Readonly<{
  key: string;
  show: string;
  poster: string | null;
  season: string;
  episode: string;
  date: string;
  service: string;
  serviceLogo: string | null;
  /** No episode part: "Skipped · a film?" */
  isFilm: boolean;
}>;

export type PreviewHead = Readonly<{
  key: FieldKey;
  label: string;
  /** "from Title", "every row", "choose a column" */
  source: string;
  /** Show or Episode without a column */
  needed: boolean;
}>;

const HEADS: ReadonlyArray<readonly [FieldKey, string]> = [
  ['show', 'Series'],
  ['season', 'Season'],
  ['episode', 'Episode'],
  ['date', 'Watched on'],
  ['service', 'Service'],
];

export const previewHeads = (
  mapping: ColumnMapping,
): ReadonlyArray<PreviewHead> =>
  HEADS.map(([key, label]) => ({
    key,
    label,
    needed: (key === 'show' || key === 'episode') && !mapping[key],
    source: columnSource(key, mapping),
  }));

/** "Season 5" → "S05", "Episode 1" → "E01" (the table's short form, zero-padded like every episode code). */
const short = (text: string) =>
  text
    .replace(/^Season (\d+)$/, (_, n: string) => `S${n.padStart(2, '0')}`)
    .replace(/^Episode (\d+)$/, (_, n: string) => `E${n.padStart(2, '0')}`);

type Provider = Readonly<{ name: string; logo: string }>;

export function previewRows(
  rows: ReadonlyArray<Record<string, unknown>>,
  mapping: ColumnMapping,
  dateOrder: DateOrder,
  providers: ReadonlyArray<Provider>,
  posters: Readonly<Record<string, string>>,
  now: number = Date.now(),
): ReadonlyArray<PreviewRow> {
  const names = providers.map((provider) => provider.name);
  const options = { now, providers: names };
  return rows.slice(0, PREVIEW_ROWS).map((raw, index) => {
    const cell = (field: FieldKey) =>
      previewCell(raw, mapping, field, dateOrder, options);
    const show = cell('show');
    const episode = cell('episode');
    const service = cell('service');
    const provider = matchProvider(service.text, providers);
    return {
      date: cell('date').text,
      episode: short(episode.text),
      isFilm: episode.bad && episode.sub.includes('film'),
      key: String(index),
      poster: posters[show.text] ?? null,
      season: short(cell('season').text),
      service: service.text,
      serviceLogo: provider?.logo || null,
      show: show.text,
    };
  });
}

/** The first date the file has and how it reads ("11/6/26" → "Nov 6"). */
export function dateExampleOf(
  rows: ReadonlyArray<Record<string, unknown>>,
  mapping: ColumnMapping,
  dateOrder: DateOrder,
  now: number = Date.now(),
): Readonly<{ raw: string; read: string }> | null {
  if (!mapping.date) {
    return null;
  }
  for (const raw of rows.slice(0, 200)) {
    const cell = previewCell(raw, mapping, 'date', dateOrder, { now });
    if (!cell.bad && !cell.noDate) {
      return { raw: String(raw[mapping.date]).trim(), read: cell.text };
    }
  }
  return null;
}

/** The titles the preview shows, for their poster thumbs. */
export const previewTitles = (
  rows: ReadonlyArray<Record<string, unknown>>,
  mapping: ColumnMapping,
  dateOrder: DateOrder,
): ReadonlyArray<string> => {
  const titles = rows.slice(0, PREVIEW_ROWS).flatMap((raw) => {
    const show = previewCell(raw, mapping, 'show', dateOrder);
    return show.bad || show.text === '—' ? [] : [show.text];
  });
  return [...new Set(titles)];
};
