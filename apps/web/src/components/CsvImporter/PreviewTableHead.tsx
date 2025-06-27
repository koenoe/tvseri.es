import { cx } from 'class-variance-authority';
import { type ThHTMLAttributes, useCallback, useState } from 'react';

import type { Field } from '@/hooks/useCsvParser';

import { TableHead } from '../Table';

interface PreviewTableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  field: Field;
  onFieldChange: (props: { value: string }) => void;
  currentFieldMapping: string | undefined;
  originalFieldMappings: Record<string, string | undefined>;
}

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
      onFieldChange({ value: '' });
    }
  }, [field.predefined, mode, onFieldChange]);

  return (
    <TableHead className={cx('w-48', className)} {...props}>
      <div className="relative flex flex-nowrap items-center justify-start gap-x-3">
        <span>{field.label}</span>
        {field.predefined ? (
          <button className="flex items-center" onClick={handleModeToggle}>
            <svg
              className={cx(
                'size-5 shrink-0 opacity-60 transition-transform',
                mode === 'select' && 'rotate-180',
              )}
              fill="none"
              viewBox="0 0 15 15"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clipRule="evenodd"
                d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                fill="currentColor"
                fillRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <svg
            className="size-5 shrink-0 opacity-60"
            fill="none"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clipRule="evenodd"
              d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
              fill="currentColor"
              fillRule="evenodd"
            />
          </svg>
        )}
        <select
          className="block w-full min-w-32 appearance-none rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-2 pr-6 font-light text-white/60 outline-none"
          onChange={(e) => {
            onFieldChange({
              value: e.target.value,
            });
          }}
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
        <svg
          className="pointer-events-none absolute right-2 top-1/2 size-4 shrink-0 -translate-y-1/2 text-white/40"
          fill="none"
          viewBox="0 0 15 15"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            clipRule="evenodd"
            d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z"
            fill="currentColor"
            fillRule="evenodd"
          />
        </svg>
      </div>
    </TableHead>
  );
}
