'use client';

import { type ReactNode, useCallback } from 'react';

import { useOpenShows } from '../shows/filterStore';

/** The Guest roles row: filters Shows to Guest roles and opens the list. */
export function GuestRowButton({
  aria,
  children,
  className,
  personId,
}: Readonly<{
  aria: string;
  children: ReactNode;
  className: string;
  personId: number;
}>) {
  const openShows = useOpenShows(personId);
  const onClick = useCallback(() => openShows('guest'), [openShows]);
  return (
    <button
      aria-label={aria}
      className={className}
      data-career-row=""
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/** "All 26 series ›": Shows filtered to Series, opened. */
export function AllSeriesButton({
  children,
  className,
  personId,
}: Readonly<{ children: ReactNode; className: string; personId: number }>) {
  const openShows = useOpenShows(personId);
  const onClick = useCallback(() => openShows('series'), [openShows]);
  return (
    <button className={className} onClick={onClick} type="button">
      {children}
    </button>
  );
}
