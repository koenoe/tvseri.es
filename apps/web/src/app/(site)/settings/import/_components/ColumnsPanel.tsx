'use client';

import { type ChangeEvent, useCallback } from 'react';

import { historyGlyph, infoGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import type { ColumnMapping, DetectedSource } from '../_lib/columns';
import { FIELDS, type FieldKey, fieldHint } from '../_lib/copy';
import type { DateOrder } from '../_lib/parseDate';
import {
  CARD_COUNT,
  CARD_HEAD,
  CARD_TITLE,
  LINK,
  SEGMENT,
  SEGMENTED,
} from './styles';

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-opacity='.6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const SELECT_STYLE = {
  backgroundImage: CHEVRON,
  backgroundPosition: 'right 10px center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '16px',
} as const;

/** `.sg-sel` at 36px; 16px text on phones (no zoom on focus) */
const SELECT =
  'h-9 w-full min-w-0 cursor-pointer appearance-none rounded-8 bg-[#141819] pr-8 pl-3 text-meta leading-5 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)] max-md:text-body';

type Props = Readonly<{
  combined: Readonly<Record<'show' | 'season' | 'episode', boolean>>;
  dateExample: string;
  dateOrder: DateOrder;
  headers: ReadonlyArray<string>;
  mapping: ColumnMapping;
  onMapping: (mapping: ColumnMapping) => void;
  providers: ReadonlyArray<string>;
  source: DetectedSource;
}>;

const sameMapping = (a: ColumnMapping, b: ColumnMapping) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * "Edit columns": one row per field, name · select ·
 * (Streaming service only) "Column | Same for all rows" · a one-line hint,
 * every control 36px on one line. One column can feed several fields.
 */
export default function ColumnsPanel(props: Props) {
  const { mapping, onMapping, source } = props;
  const changed = !sameMapping(mapping, source.mapping);
  const reset = () => onMapping(source.mapping);

  return (
    <div className="flex flex-col gap-4 rounded-18 bg-white/4 p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]">
      <div className={CARD_HEAD}>
        <span className="size-2 shrink-0 rounded-full bg-white/75" />
        <h3 className={CARD_TITLE}>Columns</h3>
        <span className={CARD_COUNT}>tvseri.es field ← your CSV column</span>
        {changed ? (
          <span className="ml-auto flex items-center gap-2">
            <button className={LINK} onClick={reset} type="button">
              <Icon glyph={historyGlyph} size={13} />
              Back to what we filled in
            </button>
          </span>
        ) : null}
      </div>
      <div className="flex flex-col">
        {FIELDS.map((field) => (
          <FieldRow {...props} field={field} key={field.key} />
        ))}
      </div>
      <p className="flex items-center gap-2 text-meta leading-5 text-white/60">
        <Icon glyph={infoGlyph} size={13} />
        One column can fill several fields: Netflix puts the series, season and
        episode all in Title.
      </p>
    </div>
  );
}

function FieldRow({
  combined,
  dateExample,
  dateOrder,
  field,
  headers,
  mapping,
  onMapping,
  providers,
  source,
}: Props & Readonly<{ field: (typeof FIELDS)[number] }>) {
  const { key, label, required } = field;
  const isService = key === 'service';
  const fixed = isService && mapping.service.kind === 'fixed';
  const value = columnValue(key, mapping);
  const missing = required && !value;
  const own = key === 'service' || key === 'date' ? false : combined[key];
  const hint = fieldHint(
    key,
    mapping,
    { own, show: combined.show },
    dateOrder,
    dateExample,
  );

  const onColumn = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) =>
      onMapping(withColumn(mapping, key, event.target.value)),
    [onMapping, mapping, key],
  );
  const onFixed = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) =>
      onMapping({
        ...mapping,
        service: { kind: 'fixed', name: event.target.value },
      }),
    [onMapping, mapping],
  );
  const toColumn = useCallback(
    () =>
      onMapping({
        ...mapping,
        service:
          source.mapping.service.kind === 'column'
            ? source.mapping.service
            : { kind: 'none' },
      }),
    [onMapping, mapping, source.mapping.service],
  );
  const toFixed = useCallback(
    () =>
      onMapping({
        ...mapping,
        service: {
          kind: 'fixed',
          name: providers.includes('Netflix')
            ? 'Netflix'
            : (providers[0] ?? 'Netflix'),
        },
      }),
    [onMapping, mapping, providers],
  );
  const fixedName =
    mapping.service.kind === 'fixed' ? mapping.service.name : '';
  const fixedOptions =
    providers.includes(fixedName) || !fixedName
      ? providers
      : [fixedName, ...providers];

  return (
    <div
      className={cn(
        'grid min-h-14 grid-cols-[150px_200px_210px_minmax(0,1fr)] items-center gap-4 border-white/6 border-t first:border-t-0',
        'max-md:grid-cols-[110px_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-2 max-md:py-2.5',
      )}
    >
      <span className="flex items-center gap-2 text-body-sm font-semibold">
        {label}
        {required ? (
          <i className="text-overline uppercase not-italic text-white/60">
            Required
          </i>
        ) : null}
      </span>
      {fixed ? (
        <select
          aria-label="Service for every row"
          className={SELECT}
          onChange={onFixed}
          style={SELECT_STYLE}
          value={fixedName}
        >
          {fixedOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : (
        <select
          aria-invalid={missing || undefined}
          aria-label={`Column for ${label}`}
          className={SELECT}
          onChange={onColumn}
          style={SELECT_STYLE}
          value={value}
        >
          <option value="">—</option>
          {headers.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
      )}
      <span
        className={cn(!isService && 'max-md:hidden', 'max-md:col-span-full')}
      >
        {isService ? (
          <span
            aria-label="Where the service comes from"
            className={SEGMENTED}
            role="group"
          >
            <button
              aria-pressed={!fixed}
              className={cn(SEGMENT, 'flex-1')}
              onClick={toColumn}
              type="button"
            >
              Column
            </button>
            <button
              aria-pressed={fixed}
              className={cn(SEGMENT, 'flex-1')}
              onClick={toFixed}
              type="button"
            >
              Same for all rows
            </button>
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'text-caption text-white/60 max-md:col-span-full',
          missing && 'text-white',
        )}
      >
        {hint}
      </span>
    </div>
  );
}

const columnValue = (key: FieldKey, mapping: ColumnMapping): string => {
  if (key !== 'service') {
    return mapping[key];
  }
  return mapping.service.kind === 'column' ? mapping.service.column : '';
};

const withColumn = (
  mapping: ColumnMapping,
  key: FieldKey,
  column: string,
): ColumnMapping => {
  if (key !== 'service') {
    return { ...mapping, [key]: column };
  }
  return {
    ...mapping,
    service: column ? { column, kind: 'column' } : { kind: 'none' },
  };
};
