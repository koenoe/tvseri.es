'use client';

import { shortCode } from '@tvseri.es/schemas';
import { memo } from 'react';

import cn from '@/lib/cn';
import { codeOf } from '@/lib/marking/progress';
import type { WatchRecord } from '@/lib/marking/types';

import type { ShowEpisode } from '@/lib/series/seasonEpisodes';
import { useClock } from './clock';
import type { WallDispatch } from './EpisodesView';
import EyePill from './EyePill';
import { formatWatchedDay } from './format';
import type { EpisodeMark, MarkedEpisode } from './marks';
import Still from './Still';
import { OpenEpisodeHit, STILL_SIZES, TILE } from './tileParts';
import { stackLine, stackTitle } from './wall';

const ROW = 'flex min-h-26 items-center gap-4 p-4';
const THUMB = 'relative h-18 w-32 flex-none overflow-hidden rounded-8 bg-black';
const TEXT = 'flex min-w-0 flex-1 flex-col gap-1';
const LINE = 'truncate text-meta text-white/60';

/**
 * Phones, a row whose action has a label (Show, Skipped): the action goes
 * under the text, beside the 128px still, so the text keeps the row's width
 * (beside the still and the pill it had ~50px: "E01–…" / "4 / episodes").
 * Watched rows keep their 36px eye at the end, as drawn.
 */
const ROW_ACTION_UNDER =
  'max-md:grid max-md:grid-cols-[auto_minmax(0,1fr)] max-md:gap-x-4 max-md:gap-y-2';
const MEDIA_ACTION_UNDER = 'max-md:row-span-2';
const TEXT_ACTION_UNDER = 'max-md:self-end';
const ACTION_UNDER = 'max-md:self-start max-md:justify-self-start';
/** The skipped pill's box: a grid cell on a phone, nothing from md */
const ACTION_UNDER_BOX = cn('flex md:contents', ACTION_UNDER);

/**
 * A compact tile for a watched or skipped episode: thumb, "E04 ·
 * Honeydew", "Watched Jul 5, 2025" / "Watched · don’t remember when" /
 * "Skipped", and the pill (watched: just the eye; skipped: "Skipped", under
 * the text on a phone).
 */
export const CompactTile = memo(function CompactTile({
  episode,
  mark,
  record,
  seriesId,
}: Readonly<{
  episode: ShowEpisode;
  mark: EpisodeMark;
  record: WatchRecord | undefined;
  seriesId: number;
}>) {
  const clock = useClock();
  const line =
    mark === 'skipped'
      ? 'Skipped'
      : mark === 'unknown' || record === undefined
        ? 'Watched · don’t remember when'
        : `Watched ${formatWatchedDay(record.watchedAt, clock, false)}`;
  const skipped = mark === 'skipped';
  const thumb = cn('object-cover', skipped && 'brightness-50 grayscale');
  const row = cn(TILE, ROW, skipped && ROW_ACTION_UNDER);
  const media = cn(THUMB, skipped && MEDIA_ACTION_UNDER);
  const text = cn(TEXT, skipped && TEXT_ACTION_UNDER);
  // one box either way, so marking or unmarking never remounts the pill
  const pillBox = skipped ? ACTION_UNDER_BOX : 'contents';
  const pill = (
    <EyePill
      episode={episode}
      mark={mark}
      record={record}
      seriesId={seriesId}
      variant="compact"
    />
  );
  return (
    <div className={row} data-episode-tile={codeOf(episode)}>
      <span className={media}>
        <Still
          className={thumb}
          sizes={STILL_SIZES.thumb}
          src={episode.stillImage}
        />
      </span>
      <span className={text}>
        <b className="truncate text-body-sm font-semibold">
          <span className="mr-2 font-medium text-white/60">
            {shortCode(episode.episodeNumber)}
          </span>
          {episode.title}
        </b>
        <span className={LINE}>{line}</span>
      </span>
      <OpenEpisodeHit episode={episode} />
      <span className={pillBox}>{pill}</span>
    </div>
  );
});
CompactTile.displayName = 'CompactTile';

type StackProps = Readonly<{
  dispatch: WallDispatch;
  first: number;
  items: ReadonlyArray<MarkedEpisode>;
}>;

/**
 * The wall marks every episode again on each mark (new `items` arrays), so a
 * stack compares its run by content: a mark elsewhere leaves it alone.
 */
const sameStack = (a: StackProps, b: StackProps) =>
  a.dispatch === b.dispatch &&
  a.first === b.first &&
  a.items.length === b.items.length &&
  a.items.every((item, index) => {
    const other = b.items[index];
    return (
      other !== undefined &&
      item.episode === other.episode &&
      item.mark === other.mark &&
      item.record === other.record
    );
  });

/**
 * Three or more watched in a row fold into one stack: fanned thumbs,
 * "E01–E04 · watched", "4 episodes · Jul 2025", and Show to open the run.
 */
export const StackTile = memo(function StackTile({
  dispatch,
  first,
  items,
}: StackProps) {
  // the run's eyes land where Show was: the second click of a double-click
  // is never a press on them (`pressMark`)
  const show = () => dispatch({ first, type: 'openStack' });
  const fan = items.slice(0, 3);
  return (
    <div className={STACK_ROW} data-stack-episodes={items.length}>
      <span aria-hidden="true" className={FAN_BOX}>
        {fan.map(({ episode }, index) => (
          <FanThumb episode={episode} index={index} key={episode.id} />
        ))}
      </span>
      <span className={STACK_TEXT}>
        {/* Phones keep the title on one line; only the
            count line wraps there. Desktop's two columns wrap both. */}
        <b className="font-semibold text-body-sm max-md:truncate">
          {stackTitle(items)}
        </b>
        <span className="text-meta text-white/60">{stackLine(items)}</span>
      </span>
      <button
        aria-expanded="false"
        className={SHOW_BUTTON}
        onClick={show}
        type="button"
      >
        Show
      </button>
    </div>
  );
}, sameStack);
StackTile.displayName = 'StackTile';

const STACK_ROW = cn(TILE, ROW, ROW_ACTION_UNDER, 'md:col-span-2');
/**
 * The fanned thumbs: 16px apart, 8px on a phone, so beside the 32px page
 * gutters the text keeps 134px at 390 (104 at 360)
 */
const FAN_BOX = cn('relative h-19 w-36 flex-none md:w-40', MEDIA_ACTION_UNDER);
const STACK_TEXT = cn(TEXT, TEXT_ACTION_UNDER);
const SHOW_BUTTON = cn(
  'h-8.5 flex-none rounded-full bg-white/10 px-4 font-medium text-body-sm hover:bg-white/18',
  ACTION_UNDER,
);

const FAN = [
  'left-0 -rotate-5',
  'left-2 md:left-4',
  'left-4 rotate-5 md:left-8',
] as const;

function FanThumb({
  episode,
  index,
}: Readonly<{ episode: ShowEpisode; index: number }>) {
  // No black ground or dark ring: on a tilted card both show as a black rim
  // round the still. A faint light ground (for a missing still) and a light
  // hairline, as the posters have.
  const classes = cn(
    'absolute top-0.5 h-18 w-32 overflow-hidden rounded-8 bg-white/6 shadow-[0_6px_14px_-4px_rgb(0_0_0/0.6)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]',
    FAN[index],
  );
  return (
    <span className={classes}>
      <Still sizes={STILL_SIZES.thumb} src={episode.stillImage} />
    </span>
  );
}
