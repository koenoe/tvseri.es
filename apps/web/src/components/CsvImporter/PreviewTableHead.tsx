import { cx } from 'class-variance-authority';
import { type ThHTMLAttributes, useCallback, useState } from 'react';

import { ArrowLeftIcon } from '@/components/Icons/ArrowLeftIcon';
import { CaretSortIcon } from '@/components/Icons/CaretSortIcon';
import type { Field } from '@/hooks/useCsvParser';

import { TableHead } from '../Table';

type PreviewTableHeadProps = ThHTMLAttributes<HTMLTableCellElement> &
  Readonly<{
    field: Field;
    onFieldChange: (props: { newValue: string; oldValue: string }) => void;
    currentFieldMapping: string | undefined;
    originalFieldMappings: Record<string, string | undefined>;
  }>;

export default function PreviewTableHead({
  field,
  onFieldChange,
  currentFieldMapping,
  originalFieldMappings,
  className,
  ...props
}: PreviewTableHeadProps) {
  const [mode, setMode] = useState<'map' | 'select'>('map');

  const handleModeToggle = useCallback(() => {
    if (field.predefined) {
      setMode(mode === 'map' ? 'select' : 'map');
      onFieldChange({ newValue: field.value, oldValue: '' });
    }
  }, [field.predefined, field.value, mode, onFieldChange]);

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onFieldChange({ newValue: field.value, oldValue: event.target.value });
    },
    [field.value, onFieldChange],
  );

  const selectLabel =
    mode === 'map'
      ? `CSV column for ${field.label}`
      : `Value for ${field.label}`;
  const toggleLabel =
    mode === 'map'
      ? `Pick one value for ${field.label}`
      : `Map ${field.label} to a CSV column`;

  return (
    <TableHead className={cx('w-48', className)} {...props}>
      <div className="relative flex flex-nowrap items-center justify-start gap-x-3">
        <span>{field.label}</span>
        {field.predefined ? (
          <button
            aria-label={toggleLabel}
            className="flex items-center"
            onClick={handleModeToggle}
            type="button"
          >
            <ArrowLeftIcon
              className={cx(
                'size-5 shrink-0 opacity-60 transition-transform',
                mode === 'select' && 'rotate-180',
              )}
            />
          </button>
        ) : (
          <ArrowLeftIcon className="size-5 shrink-0 opacity-60" />
        )}
        <select
          aria-label={selectLabel}
          className="block w-full min-w-32 appearance-none rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-2 pr-6 font-light text-white/60 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          onChange={handleSelectChange}
          value={currentFieldMapping ?? ''}
        >
          <option value="">
            {mode === 'map' ? 'Select field' : 'Select value'}
          </option>
          {mode === 'map'
            ? [...new Set(Object.values(originalFieldMappings))].map((fm) => (
                <option key={fm} value={fm}>
                  {fm}
                </option>
              ))
            : field.predefined?.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
        </select>
        <CaretSortIcon className="pointer-events-none absolute right-2 top-1/2 size-4 shrink-0 -translate-y-1/2 text-white/40" />
      </div>
    </TableHead>
  );
}
