'use client';

import { memo, useCallback, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { CaretSortIcon } from '@/components/Icons/CaretSortIcon';
import { CloseIcon } from '@/components/Icons/CloseIcon';
import Datepicker from '../Datepicker/DatepickerLazy';
import MetaInstant from '../MetaDate/MetaInstant';
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
      {/* Datepicker is ssr:false, so this only renders in the browser and
          MetaInstant formats watchedAt in the viewer's time zone straight
          away. MetaInstant renders nothing on the server and during
          hydration, so it never mismatches, but outside a client-only
          subtree the date would pop in after hydration: keep it there. */}
      {watchedAt ? (
        <>
          <span>{label}</span>
          <span className="font-semibold">
            <MetaInstant value={watchedAt} />
          </span>
          <CloseIcon className={iconClassName} onClick={handleDelete} />
        </>
      ) : (
        <>
          <span>Select watch date</span>
          <CaretSortIcon className={iconClassName} />
        </>
      )}
    </Datepicker>
  );
}

WatchDatePicker.displayName = 'WatchDatePicker';

export default memo(WatchDatePicker);
