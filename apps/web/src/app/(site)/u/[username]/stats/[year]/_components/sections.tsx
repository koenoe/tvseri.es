import type { ComponentType, ReactNode } from 'react';

import EveryDay, { EveryDaySkeleton } from './everyday/EveryDay';
import Finished, { FinishedSkeleton } from './finished/Finished';
import FirstAndLast, { FirstAndLastSkeleton } from './firstlast/FirstAndLast';
import Genres, { GenresSkeleton } from './genres/Genres';
import WhereFrom, { WhereFromSkeleton } from './map/WhereFrom';
import NewOrBack, { NewOrBackSkeleton } from './newback/NewOrBack';
import BiggestNight, { BiggestNightSkeleton } from './night/BiggestNight';
import PopularUnwatched, {
  PopularUnwatchedSkeleton,
} from './popular/PopularUnwatched';
import Services, { ServicesSkeleton } from './services/Services';
import YearInShows, { YearInShowsSkeleton } from './shows/YearInShows';
import type { SectionProps } from './types';
import WhenWatches, { WhenWatchesSkeleton } from './when/WhenWatches';

export type StatsBlock = Readonly<{
  id: string;
  title: (props: SectionProps) => string;
  Component: ComponentType<SectionProps>;
  fallback: ReactNode;
  /** STMobile leaves it out */
  phoneHidden?: boolean;
}>;

const block = (
  id: string,
  title: string | ((props: SectionProps) => string),
  Component: ComponentType<SectionProps>,
  fallback: ReactNode,
  phoneHidden = false,
): StatsBlock => ({
  Component,
  fallback,
  id,
  phoneHidden,
  title: typeof title === 'string' ? () => title : title,
});

/**
 * The main column under the header, in STD_Recommended's order: one block
 * per row, or two side by side on desktop (`.st-two`).
 */
export const STATS_ROWS: ReadonlyArray<ReadonlyArray<StatsBlock>> = [
  [
    block(
      'stats-shows',
      'The year in series',
      YearInShows,
      <YearInShowsSkeleton />,
    ),
  ],
  [
    block(
      'stats-first-last',
      'First and last',
      FirstAndLast,
      <FirstAndLastSkeleton />,
    ),
  ],
  [
    block(
      'stats-finished',
      ({ year }) => `Finished in ${year}`,
      Finished,
      <FinishedSkeleton />,
    ),
  ],
  [block('stats-every-day', 'Every day', EveryDay, <EveryDaySkeleton />)],
  [
    block('stats-when', 'When', WhenWatches, <WhenWatchesSkeleton />),
    block(
      'stats-night',
      'Biggest night',
      BiggestNight,
      <BiggestNightSkeleton />,
    ),
  ],
  [
    block(
      'stats-new',
      'New, or back for more',
      NewOrBack,
      <NewOrBackSkeleton />,
      true,
    ),
    block('stats-genres', 'Genres', Genres, <GenresSkeleton />),
  ],
  [block('stats-services', 'Services', Services, <ServicesSkeleton />)],
  [
    block(
      'stats-map',
      'Where the series are from',
      WhereFrom,
      <WhereFromSkeleton />,
      true,
    ),
  ],
  [
    block(
      'stats-popular',
      'Popular unwatched',
      PopularUnwatched,
      <PopularUnwatchedSkeleton />,
    ),
  ],
];
