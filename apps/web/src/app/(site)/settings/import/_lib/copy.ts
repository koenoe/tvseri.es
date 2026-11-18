import type { ColumnField, ColumnMapping, DetectedSource } from './columns';
import type { DateOrder } from './parseDate';

/** The importer's fixed copy (`FIELDS`, `STATS`). */

export const STEPS = ['Upload', 'Check', 'Import'] as const;

export const HELP_TABS = [
  ['netflix', 'Netflix'],
  ['prime', 'Prime Video'],
  ['csv', 'Other CSV'],
] as const;

export const HELP: Readonly<
  Record<(typeof HELP_TABS)[number][0], ReadonlyArray<string>>
> = {
  csv: [
    'One row per episode: the series, season and episode, or one column that holds all three.',
    'A date and a streaming service are optional.',
    'You can check which column is which on the next screen.',
  ],
  netflix: [
    'On netflix.com: Account → Profiles → your profile → Viewing activity.',
    'Scroll down and choose Download all.',
    'Drop NetflixViewingHistory.csv here. One file per profile.',
  ],
  prime: [
    'On amazon.co.uk: Account → Data and privacy → Request your data → Prime Video.',
    'Confirm Amazon’s email. The ZIP arrives within hours to a few days.',
    'Unzip it and drop the viewing history file here.',
  ],
};

export type FieldKey = ColumnField | 'service';

export const FIELDS: ReadonlyArray<
  Readonly<{ key: FieldKey; label: string; required: boolean }>
> = [
  { key: 'show', label: 'Series', required: true },
  { key: 'season', label: 'Season', required: false },
  { key: 'episode', label: 'Episode', required: true },
  { key: 'date', label: 'Watched on', required: false },
  { key: 'service', label: 'Streaming service', required: false },
];

/**
 * How the file's dates are read. With no evidence either way (`unknown`),
 * the parser reads slash dates month first and dotted or dashed ones day
 * first; the example from the file says which.
 */
export function readOrder(
  dateOrder: DateOrder,
  example: string | null,
): DateOrder {
  if (dateOrder !== 'unknown' || !example) {
    return dateOrder;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(example)) {
    return 'mdy';
  }
  return /^\d{1,2}[.-]\d{1,2}[.-]\d{2,4}$/.test(example) ? 'dmy' : 'unknown';
}

/** The Check banner's line under the file name. */
export function recognisedLine(source: DetectedSource): string {
  if (source.kind === 'netflix') {
    return 'Recognised as a Netflix file: we filled in the columns for you (Series, Season and Episode come from Title).';
  }
  return source.recognised
    ? 'We filled in the columns from your headers: check them under Edit columns.'
    : 'We couldn’t tell which column is which: choose them under Columns.';
}

/** The one-line hint beside each field in the Columns panel. */
export function fieldHint(
  key: FieldKey,
  mapping: ColumnMapping,
  combined: Readonly<{ show: boolean; own: boolean }>,
  dateOrder: DateOrder,
  dateExample: string,
): string {
  if (key === 'service') {
    const { service } = mapping;
    return service.kind === 'fixed'
      ? 'Every row gets this service.'
      : service.kind === 'column'
        ? 'Each value is matched to a service.'
        : 'Where you watched it. It shows up in your stats.';
  }
  const column = mapping[key];
  if (key !== 'date' && combined.own) {
    return key === 'show'
      ? 'The part before the season.'
      : `Pulled out of ${column} (“Series: Season: Episode”).`;
  }
  if ((key === 'season' || key === 'episode') && !column && combined.show) {
    return `No column of its own? Choose ${mapping.show}.`;
  }
  if (key === 'date') {
    if (!column) {
      return 'Every row becomes “I don’t remember”.';
    }
    if (dateOrder === 'mdy') {
      return `Read month first: ${dateExample}.`;
    }
    return dateOrder === 'dmy'
      ? `Read day first: ${dateExample}.`
      : 'Read as written.';
  }
  if ((key === 'show' || key === 'episode') && !column) {
    return 'Required: choose a column.';
  }
  return '';
}

/** The table header's small line: where a field comes from. */
export function columnSource(key: FieldKey, mapping: ColumnMapping): string {
  if (key === 'service') {
    const { service } = mapping;
    return service.kind === 'fixed'
      ? 'every row'
      : service.kind === 'column'
        ? `from ${service.column}`
        : 'not recorded';
  }
  const column = mapping[key];
  if (!column) {
    return key === 'date'
      ? 'none'
      : key === 'season'
        ? 'any'
        : 'choose a column';
  }
  return `from ${column}`;
}

/**
 * The Check step's dates line, before anything is written: how the dates
 * were read, with an example from the file ("11/6/26 is Nov 6").
 */
export function datesLine(
  source: DetectedSource,
  mapping: ColumnMapping,
  dateOrder: DateOrder,
  example: Readonly<{ raw: string; read: string }> | null,
): string {
  if (!mapping.date) {
    return 'Your file has no dates.';
  }
  if (!example) {
    return 'Your file’s dates are empty.';
  }
  const pair = `${example.raw} is ${example.read}`;
  switch (readOrder(dateOrder, example.raw)) {
    case 'mdy':
      return source.kind === 'netflix'
        ? `Dates are read month first, as Netflix writes them: ${pair}.`
        : `Dates are read month first: ${pair}.`;
    case 'dmy':
      return `Dates are read day first: ${pair}.`;
    default:
      return `Dates like ${example.raw} are read as they are.`;
  }
}

/** The import's dates note (only when some dates could be read both ways). */
export function assumedDatesLine(
  source: DetectedSource,
  dateOrder: DateOrder,
  hasAssumedDates: boolean,
  example: Readonly<{ raw: string }> | null,
): string | null {
  const order = readOrder(dateOrder, example?.raw ?? null);
  if (order === 'iso' && example) {
    return `Dates like ${example.raw} are read as written.`;
  }
  if (!hasAssumedDates) {
    return null;
  }
  if (order === 'dmy') {
    return 'Some dates could be read both ways, like 05/06/24: they were read day first.';
  }
  return source.kind === 'netflix'
    ? 'Some dates could be read both ways, like 05/06/24: they were read month first, as Netflix writes them.'
    : 'Some dates could be read both ways, like 05/06/24: they were read month first.';
}
