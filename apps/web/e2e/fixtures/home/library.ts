import type { LibraryIds, SpotlightLine } from '@tvseri.es/schemas';

import { TOP_PICKS, TRENDING } from './core.ts';

const idOf = (
  list: ReadonlyArray<{ id: number; title: string }>,
  title: string,
) => list.find((show) => show.title === title)?.id ?? 0;

const sorted = (ids: ReadonlyArray<number>) => [...ids].sort((a, b) => a - b);

/**
 * The member's library as the signed-in board draws it: Watched labels on
 * Severance, Adolescence and The Penguin (Top Picks); in the spotlight The
 * Pitt and MobLand watched, Task, Black Mirror, The White Lotus and Dexter:
 * Resurrection in progress; Dept. Q on the watchlist; Severance a favourite.
 */
export const MEMBER_LIBRARY: LibraryIds = {
  favorites: sorted([idOf(TOP_PICKS, 'Severance')]),
  inProgress: sorted(
    ['Task', 'Black Mirror', 'The White Lotus', 'Dexter: Resurrection'].map(
      (title) => idOf(TRENDING, title),
    ),
  ),
  watched: sorted([
    ...['Severance', 'Adolescence', 'The Penguin'].map((title) =>
      idOf(TOP_PICKS, title),
    ),
    ...['The Pitt', 'MobLand'].map((title) => idOf(TRENDING, title)),
  ]),
  watchlist: sorted([idOf(TRENDING, 'Dept. Q')]),
};

/** The member's personal spotlight lines, as the signed-in board draws them */
const MEMBER_LINES: Readonly<Record<string, SpotlightLine>> = {
  Barry: { kind: 'finished', title: 'The Bear' },
  'Dept. Q': { kind: 'up-to-date', title: 'Slow Horses' },
  Pluribus: { kind: 'favorite', title: 'Severance' },
  'Stranger Things': { genre: 'Sci-Fi & Fantasy', kind: 'top-rated' },
};

/** For the trending list, as the API answers (no ids from the caller) */
export function memberSpotlightLines() {
  return Object.fromEntries(
    TRENDING.map((show) => [String(show.id), MEMBER_LINES[show.title] ?? null]),
  );
}
