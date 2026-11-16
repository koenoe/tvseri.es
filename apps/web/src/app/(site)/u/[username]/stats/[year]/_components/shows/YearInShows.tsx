import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import { getFinished, getShows, isUnavailable } from '../../_data/loaders';
import type { SectionProps } from '../types';
import StatsUnavailable from '../ui/StatsUnavailable';
import { buildTimeline, endReference } from './model';
import TimelineBoard from './TimelineBoard';

/**
 * "The year in shows": series by week, the span between the first and last
 * watch, a tick or a cyan dot at the end, hours on the right. The rules
 * (finished, still watching, top 20) live in `model.ts`.
 */
export default async function YearInShows({ state, user, year }: SectionProps) {
  const [shows, finished] = await Promise.all([
    getShows(user.id, year),
    getFinished(user.id, year),
  ]);
  if (isUnavailable(shows)) {
    return (
      <StatsUnavailable
        id="stats-shows"
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
      rows={timeline.rows}
      total={timeline.total}
      year={year}
    />
  );
}

/**
 * The lane's height with its 20 rows (16 on a phone): padding, month header,
 * rows, legend and the footer (a phone has the link in the legend line).
 */
/** The timeline's rows (a year's top series) */
const TIMELINE_ROWS = Array.from({ length: 20 }, (_, n) => n);

const TIMELINE_GHOST = cn(
  'flex h-[970px] flex-col gap-2 overflow-hidden rounded-16 bg-black/22 p-[18px] md:h-[738px]',
  PULSE,
);

/** The header's link, a block of its own */
const LINK_GHOST = cn('hidden h-[38px] w-[248px] rounded-10 md:block', PULSE);

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
    </section>
  );
}
