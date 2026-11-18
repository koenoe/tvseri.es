'use client';

import type { RecentScrobble } from '@tvseri.es/schemas';
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { localDay } from '@/lib/viewer/dayClock';
import { useLocalDay } from '@/lib/viewer/useLocalDay';

import { type WeekDay, weekOf } from '../_lib/scrobbleWeek';
import RecentList from './RecentList';

type ScrobbleWeekValue = Readonly<{
  /** The seven days, or null until the browser knows its zone (hydration) */
  days: ReadonlyArray<WeekDay> | null;
  /** The pressed day's key, or null for the latest marks */
  selected: string | null;
  /** A day's button: presses its `data-day`, or lets go of it */
  toggle: (event: MouseEvent<HTMLButtonElement>) => void;
}>;

const ScrobbleWeekContext = createContext<ScrobbleWeekValue>({
  days: null,
  selected: null,
  toggle: () => {},
});

const ScrobbleWeekMarks = createContext<
  Readonly<{ latest: number; marks: ReadonlyArray<RecentScrobble> }>
>({ latest: 0, marks: [] });

export const useScrobbleWeek = () => use(ScrobbleWeekContext);

/**
 * The Last scrobble card's week and the list under it share one choice: the
 * pressed day. `marks` are Plex's marks newest first (the latest `latest`
 * of them, then the rest of the last 8 days); the days are counted in the
 * viewer's zone, so only after hydration.
 */
export function ScrobbleWeek({
  children,
  latest,
  marks,
}: Readonly<{
  children: ReactNode;
  /** How many of `marks` the list shows when no day is pressed */
  latest: number;
  marks: ReadonlyArray<RecentScrobble>;
}>) {
  const today = useLocalDay();
  const [selected, setSelected] = useState<string | null>(null);
  const days = useMemo(
    () => (today === null ? null : weekOf(marks, today)),
    [marks, today],
  );
  const toggle = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const day = event.currentTarget.dataset.day ?? null;
    setSelected((current) => (current === day ? null : day));
  }, []);
  const value = useMemo(
    () => ({ days, selected, toggle }),
    [days, selected, toggle],
  );
  const list = useMemo(() => ({ latest, marks }), [latest, marks]);
  return (
    <ScrobbleWeekContext value={value}>
      <ScrobbleWeekMarks value={list}>{children}</ScrobbleWeekMarks>
    </ScrobbleWeekContext>
  );
}

/** The list under the card: the pressed day's marks, else the latest */
export function WeekMarks() {
  const { days, selected } = useScrobbleWeek();
  const { latest, marks } = use(ScrobbleWeekMarks);
  const day = selected ? days?.find(({ key }) => key === selected) : undefined;
  const shown = useMemo(
    () =>
      day
        ? marks.filter(({ watchedAt }) => localDay(watchedAt) === day.key)
        : marks.slice(0, latest),
    [day, latest, marks],
  );
  if (shown.length === 0) {
    return null;
  }
  const label = day ? `Plex marks on ${day.label}` : 'Latest Plex marks';
  return <RecentList label={label} recent={shown} />;
}
