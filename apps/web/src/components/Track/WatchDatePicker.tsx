'use client';

import { memo, useCallback, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import formatDate from '@/utils/formatDate';
import Datepicker from '../Datepicker/DatepickerLazy';
import type { WatchedAtChoice } from './types';

const sizes = {
  medium: { icon: 'md:ml-1', trigger: 'h-9 px-2.5 text-sm' },
  small: { icon: 'md:ml-0.5', trigger: 'h-8 px-2 text-xs' },
} as const;

const footerButtonClassName =
  'flex w-1/2 items-center justify-center text-nowrap rounded-xl bg-white/5 p-3 text-xs tracking-wide hover:bg-white/10';

const stopPropagation = (event: React.MouseEvent) => {
  event.stopPropagation();
};

function WatchDatePicker({
  label,
  onChange,
  onDelete,
  size = 'medium',
  watchedAt,
}: Readonly<{
  /** Shown before the date, e.g. "Watched on". */
  label: string;
  /** `isJustFinished` is true only for the "Just finished" button. */
  onChange: (watchedAt: WatchedAtChoice, isJustFinished?: boolean) => void;
  onDelete: () => void;
  size?: keyof typeof sizes;
  watchedAt?: number;
}>) {
  const { icon, trigger } = sizes[size];
  const triggerClassName = twMerge(
    'flex w-full cursor-pointer items-center gap-1 text-nowrap rounded-lg border border-white/10 bg-black/10 text-center text-white/75 md:w-auto',
    trigger,
  );
  const iconClassName = twMerge('ml-auto size-4', icon);
  const selected = useMemo(
    () => (watchedAt ? new Date(watchedAt) : undefined),
    [watchedAt],
  );

  const handleJustFinished = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onChange(Date.now(), true);
    },
    [onChange],
  );

  const handleReleaseDate = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onChange('release-date');
    },
    [onChange],
  );

  const handleSelect = useCallback(
    (value: string) => {
      onChange(new Date(value).getTime());
    },
    [onChange],
  );

  const handleDelete = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      event.stopPropagation();
      onDelete();
    },
    [onDelete],
  );

  const footer = (
    <div className="mt-4 flex gap-3">
      <button className={footerButtonClassName} onClick={handleJustFinished}>
        Just finished
      </button>
      <button className={footerButtonClassName} onClick={handleReleaseDate}>
        Release date
      </button>
    </div>
  );

  return (
    <Datepicker
      className={triggerClassName}
      footer={footer}
      onClick={stopPropagation}
      onSelect={handleSelect}
      selected={selected}
    >
      {/* Datepicker is client-only, so formatting the watchedAt instant in the
          viewer's local time zone can't cause a hydration mismatch. */}
      {watchedAt ? (
        <>
          <span>{label}</span>
          <span className="font-semibold">{formatDate(watchedAt)}</span>
          <svg
            className={iconClassName}
            fill="currentColor"
            onClick={handleDelete}
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M7.004 23.087l7.08-7.081-7.07-7.071L8.929 7.02l7.067 7.069L23.084 7l1.912 1.913-7.089 7.093 7.075 7.077-1.912 1.913-7.074-7.073L8.917 25z" />
          </svg>
        </>
      ) : (
        <>
          <span>Select watch date</span>
          <svg
            className={iconClassName}
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
        </>
      )}
    </Datepicker>
  );
}

WatchDatePicker.displayName = 'WatchDatePicker';

export default memo(WatchDatePicker);
