import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import { getStatsClock } from '../../_data/clock';
import { getFinished, getShows, isUnavailable } from '../../_data/loaders';
import type { SectionProps } from '../types';
import StatsUnavailable from '../ui/StatsUnavailable';
import {
  buildTimeline,
  endReference,
  openingQuarter,
  PHONE_ROWS,
} from './model';
import TimelineBoard from './TimelineBoard';

/**
 * "The year in shows": series by week, the span between the first and last
 * watch, a tick or a cyan dot at the end, hours on the right. The rules
 * (finished, still watching, top 20) live in `model.ts`.
 */
export default async function YearInShows({ state, user, year }: SectionProps) {
  const [shows, finished, clock] = await Promise.all([
    getShows(user.id, year),
    getFinished(user.id, year),
    getStatsClock(year),
  ]);
  if (isUnavailable(shows)) {
    return (
      <StatsUnavailable
        placeholder={<YearInShowsSkeleton />}
        title={'The year in series'}
      />
    );
  }
  if (shows.shows.length === 0) {
    return null;
  }
  const finishedIds = new Set(
    isUnavailable(finished) ? [] : finished.shows.map((show) => show.id),
  );
  const reference = endReference(shows.shows, year, state);
  const timeline = buildTimeline(shows.shows, finishedIds, year, reference);
  return (
    <TimelineBoard
      moreEpisodes={timeline.moreEpisodes}
      moreShows={timeline.moreShows}
      opening={openingQuarter(year, state, clock.currentWeek)}
      rows={timeline.rows}
      total={timeline.total}
      year={year}
    />
  );
}

/** The timeline's rows (a year's top series) */
const TIMELINE_ROWS = Array.from({ length: 20 }, (_, n) => n);
/** A phone lists the first 16 */
const PHONE_GHOST_ROWS = TIMELINE_ROWS.slice(0, PHONE_ROWS);

/** Desktop: the lane's height with its 20 rows, month header, legend and footer */
const TIMELINE_GHOST = cn(
  'hidden h-[738px] flex-col gap-2 overflow-hidden rounded-16 bg-black/22 p-[18px] md:flex',
  PULSE,
);

/**
 * A phone: 14px padding, the overview (6 + 62 + 6, then 6) and the quarter
 * switch (6 + 36), the 12px gap, the months (20) and 16 rows of 56, the
 * legend (12 + 24) and the footer (4 + 20).
 */
const PHONE_GHOST = cn(
  'flex h-[1138px] flex-col overflow-hidden rounded-16 bg-black/22 px-3 py-3.5 md:hidden',
  PULSE,
);

/** The header's link, a block of its own */
const LINK_GHOST = cn('hidden h-[38px] w-[248px] rounded-10 md:block', PULSE);

/** A phone row: its title, then its line */
function PhoneRowGhost() {
  return (
    <span className="flex h-14 shrink-0 flex-col gap-0.5 py-[7px]">
      <TextLine className="text-body-sm" width="w-32" />
      <span className="flex h-4 items-center">
        <Ghost className="h-1.5 w-2/3 rounded-[3px]" />
      </span>
    </span>
  );
}

export function YearInShowsSkeleton() {
  return (
    <section
      aria-busy
      aria-label="The year in series"
      className="flex min-w-0 flex-col gap-6"
    >
      <SectionHead
        id="year-in-shows-skeleton"
        link={<Ghost className={LINK_GHOST} />}
        title="The year in series"
      />
      <div className="h-[38px] md:hidden" />
      <div className={TIMELINE_GHOST}>
        <TextLine className="text-caption" width="w-full" />
        {TIMELINE_ROWS.map((row) => (
          <span className="flex h-5 shrink-0 items-center gap-4" key={row}>
            <TextLine className="w-28 shrink-0 text-caption" width="w-24" />
            <Ghost className="h-1 flex-1 rounded-2" />
          </span>
        ))}
      </div>
      <div className={PHONE_GHOST}>
        <Ghost className="mt-1.5 h-[62px] shrink-0 rounded-6" />
        <Ghost className="mt-3 h-9 shrink-0 rounded-10" />
        <TextLine className="mt-3 shrink-0 text-caption" width="w-full" />
        {PHONE_GHOST_ROWS.map((row) => (
          <PhoneRowGhost key={row} />
        ))}
      </div>
    </section>
  );
}
