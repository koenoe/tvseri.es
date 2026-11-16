'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';

import { startOfUtcDay, subscribeToMinute } from '@/lib/viewer/dayClock';

import type { Clock } from './format';

const ClockContext = createContext<Clock>({ now: null });

/**
 * "Now" for the section's date words. The static shell (and the hydration
 * pass) has no "now": dates are absolute, in UTC, so the markup is the same
 * for everyone. The browser then switches to its own clock ("Today", "in 3
 * days"). Days are UTC days, as on every page, so "now" is the start of the
 * UTC day: checked once a minute, it changes (and re-renders every pill and
 * tile that reads it) once a day. Separate from `useLocalDay` because this
 * one is the UTC day, not the viewer's local day.
 */
export function ClockProvider({ children }: Readonly<{ children: ReactNode }>) {
  const now = useSyncExternalStore<number | null>(
    subscribeToMinute,
    startOfUtcDay,
    () => null,
  );
  const clock = useMemo(() => ({ now }), [now]);
  return <ClockContext value={clock}>{children}</ClockContext>;
}

export const useClock = (): Clock => useContext(ClockContext);
