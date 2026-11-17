import {
  episodeCode,
  seasonCode,
  type WaitingForItem,
} from '@tvseri.es/schemas';
import Image from 'next/image';

import {
  TRACK_LOOK,
  Track,
  TrackFill,
  TrackTick,
} from '@/components/ui/progress/ProgressTrack';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { formatAirWeekdayDate } from '@/lib/format/airDate';
import { finishedLabel } from '@/lib/format/finished';
import showPath from '@/lib/routing/showPath';

import { LANE_ROW } from '../../blocks/Lane';
import { waitProgress } from './wait';

/**
 * "Finished Apr 16" this year, "Finished Mar 2025" before; "Caught up …"
 * when the season is still airing (the wait is for an episode, not a season)
 */
const waitFinishedLabel = (
  finishedAt: number | undefined,
  now: number,
  midSeason: boolean,
) =>
  finishedAt
    ? finishedLabel(finishedAt, now, {
        verb: midSeason ? 'Caught up' : 'Finished',
      })
    : null;

/**
 * What the viewer waits for: a season ("S03"), or, in a season that is
 * already airing, its finale ("Season finale") or its next episode
 * ("S02E07")
 */
const awaited = (item: WaitingForItem) => {
  if (item.nextKind === 'season-finale') {
    return 'Season finale';
  }
  if (item.nextKind === 'episode' && item.nextEpisode) {
    return episodeCode({
      episodeNumber: item.nextEpisode,
      seasonNumber: item.nextSeason,
    });
  }
  return seasonCode(item.nextSeason);
};

/**
 * One finished show that is coming back: the 4px wait line
 * runs from when you finished it to the return date, filled to today; with
 * no date it fades out.
 */
/** The row's text column and title line (the ghost row takes the same) */
export const WAIT_TEXT = 'flex min-w-0 flex-1 flex-col gap-2.5';
export const WAIT_TITLE_LINE = 'flex items-baseline justify-between gap-2.5';

const WAIT_LINK = cn(LANE_ROW, 'transition-colors hover:bg-white/6');

/** "31 days to go": beside the title from md, on the date line on a phone */
const TO_GO_WIDE =
  'shrink-0 whitespace-nowrap text-caption text-white/60 tabular-nums max-md:hidden';
const TO_GO_PHONE = 'tabular-nums md:hidden';

export default function WaitRow({
  item,
  now,
}: Readonly<{ item: WaitingForItem; now: number }>) {
  const what = awaited(item);
  const midSeason =
    item.nextKind === 'season-finale' || item.nextKind === 'episode';
  const dated = item.state === 'dated' && item.nextDate;
  const progress = waitProgress(item, now);
  const track = dated ? TRACK_LOOK.wait : TRACK_LOOK.waitUndated;
  const finished = waitFinishedLabel(item.finishedAt, now, midSeason);
  const toGo = dated
    ? `${item.daysToGo} ${item.daysToGo === 1 ? 'day' : 'days'} to go`
    : 'Renewed';
  const label = dated
    ? `${finished ?? 'Finished'}, ${what} · ${formatAirWeekdayDate(item.nextDate as string, now)}; today ${Math.round(progress)}% of the way`
    : `${finished ?? 'Finished'}, no return date yet`;
  const whatClass = cn(
    'max-w-full truncate',
    dated ? 'font-medium text-pink' : 'text-white/60',
  );
  return (
    <TileLink className={WAIT_LINK} href={showPath(item.seriesId, item.slug)}>
      {item.posterImage ? (
        <Image
          alt=""
          className="h-[60px] w-10 shrink-0 rounded-6 object-cover shadow-[0_8px_16px_-8px_rgb(0_0_0/0.8)]"
          height={60}
          src={item.posterImage}
          width={40}
        />
      ) : (
        <span className="h-[60px] w-10 shrink-0 rounded-6 bg-white/6" />
      )}
      <span className={WAIT_TEXT}>
        <span className={WAIT_TITLE_LINE}>
          <span
            className="min-w-0 truncate text-body-sm font-semibold"
            title={item.title}
          >
            {item.title}
          </span>
          <span className={TO_GO_WIDE}>{toGo}</span>
        </span>
        <Track label={label} look={track}>
          <TrackFill at={progress} />
          <TrackTick at={progress} />
        </Track>
        {/* one line: the return date stays at the right, "Finished …" drops
            whole when they don't both fit (reversed, so it wraps away first).
            On a phone the title has its line to itself and "31 days to go"
            joins this one, before "Finished …" */}
        <span className="flex h-5 flex-row-reverse flex-wrap content-start justify-between gap-x-2.5 gap-y-8 overflow-clip whitespace-nowrap text-caption text-white/60">
          <span className={whatClass}>
            {what} ·{' '}
            {dated
              ? formatAirWeekdayDate(item.nextDate as string, now)
              : 'No date yet'}
          </span>
          <span className={TO_GO_PHONE}>{toGo}</span>
          {finished ? <span>{finished}</span> : null}
        </span>
      </span>
    </TileLink>
  );
}
