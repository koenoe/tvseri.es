'use client';

import { episodeCode } from '@tvseri.es/schemas';
import { type MouseEvent, memo, useCallback, useContext } from 'react';

import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { episodeKey, nextKey, pressMark } from '@/lib/marking/pressGate';
import type { WatchRecord } from '@/lib/marking/types';
import useMarking from '@/lib/marking/useMarking';

import type { ShowEpisode } from '../../_lib/seasonEpisodes';
import { UNAVAILABLE_REASON, ViewerLocked } from '../../_lib/viewerUnavailable';
import { useClock } from './clock';
import { formatWatchedDay } from './format';
import { type EpisodeMark, isWatchedMark } from './marks';

/**
 * Where the pill sits: on a tile's still, the Focus tile's primary pill
 * ("Mark S03E05 watched", 44px, 36px on phones, cyan), or on a compact tile
 * (beside the text; watched ones show only the eye).
 */
export type PillVariant = 'tile' | 'primary' | 'compact';

// Focus shows the site's ring (globals.css: 2px white, 2px outside the
// border), never only a border colour (hover dims a watched pill's).
const BASE =
  'group/pill z-3 inline-flex items-center whitespace-nowrap rounded-full border-2 font-medium transition-[border-color,color,background-color] duration-200';

const PLACE: Readonly<Record<PillVariant, string>> = {
  // On the tile's flat surface the blur shows nothing: skipped, it
  // saves a backdrop pass per compact tile while scrolling.
  compact: 'relative flex-none h-8 gap-2 pr-3.5 pl-2.5 text-caption',
  // Inset by the Focus text's padding (16px on phones, 32 × 28 from md), so
  // its left edge lines up with "Next up" under the still; 36px on phones
  primary:
    'absolute bottom-4 left-4 h-9 gap-2 pr-4 pl-3 text-meta backdrop-blur-[6px] md:bottom-7 md:left-8 md:h-11 md:gap-2.5 md:pr-5 md:pl-4 md:text-body-sm',
  tile: 'absolute bottom-5 left-5 h-8 gap-2 pr-3.5 pl-2.5 text-caption backdrop-blur-[6px]',
};

/**
 * The glass eye pill: Mark
 * watched · Next up (primary, cyan) · the watched date ("Today", "Jul 2",
 * "Watched" without a date; hover "Unmark") · Skipped (a tap marks it). One
 * tap = Just now, again = unmark; `aria-pressed` follows watched. Its state
 * comes from the wall's marks (no store read of its own); the name starts
 * with the visible words ("Today: unmark S03E05 Children").
 */
const EyePill = memo(function EyePill({
  episode,
  mark,
  record,
  seriesId,
  variant,
}: Readonly<{
  episode: ShowEpisode;
  mark: EpisodeMark;
  record: WatchRecord | undefined;
  seriesId: number;
  variant: PillVariant;
}>) {
  const marking = useMarking();
  const clock = useClock();
  const locked = useContext(ViewerLocked);
  const { episodeNumber, seasonNumber, title } = episode;
  const isWatched = isWatchedMark(mark);
  const skipped = mark === 'skipped';
  const primary = variant === 'primary' && !isWatched && !skipped;
  const toggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const ref = { episodeNumber, seasonNumber };
      // Next up re-renders for the next episode in the same spot, and a
      // tile's eye can slide under the pointer: one press, one write
      const key = primary
        ? nextKey(seriesId)
        : episodeKey(seriesId, episodeCode(ref));
      pressMark(key, event, () =>
        marking.toggleEpisode(seriesId, ref, { title, where: 'page' }),
      );
    },
    [episodeNumber, marking, primary, seasonNumber, seriesId, title],
  );
  const iconOnly = variant === 'compact' && isWatched;
  const code = episodeCode({ episodeNumber, seasonNumber });

  const label = isWatched
    ? record && !record.dateUnknown
      ? formatWatchedDay(record.watchedAt, clock)
      : 'Watched'
    : skipped
      ? 'Skipped'
      : primary
        ? `Mark ${code} watched`
        : 'Mark watched';
  const hover = isWatched ? 'Unmark' : skipped ? 'Mark watched' : label;
  // Starts with the visible words; a watched eye also says what it does
  // (its name was only a date)
  const name = primary
    ? `${label}, ${title}`
    : isWatched
      ? `${label}: unmark ${code} ${title}`
      : `${label}, ${code} ${title}`;

  const classes = cn(
    BASE,
    PLACE[variant],
    primary
      ? 'border-cyan bg-[rgb(0_180_190/0.38)] text-white'
      : isWatched
        ? 'border-white/75 bg-[rgb(15_20_20/0.62)] text-white hover:border-white/45'
        : 'border-white/20 bg-[rgb(15_20_20/0.5)] hover:border-white/45 hover:text-white focus-visible:border-white/45 focus-visible:text-white',
    skipped ? 'text-white/60' : !isWatched && !primary && 'text-white/80',
    iconOnly && 'size-9 justify-center p-0',
    locked && 'cursor-default opacity-40',
  );
  const iconClass = cn(
    'flex-none',
    primary ? 'size-4 text-white md:size-4.5' : 'size-4',
  );

  return (
    <button
      aria-disabled={locked || undefined}
      aria-label={name}
      aria-pressed={isWatched}
      className={classes}
      onClick={toggle}
      title={locked ? UNAVAILABLE_REASON : undefined}
      type="button"
    >
      <Icon
        active={isWatched}
        className={iconClass}
        glyph={eyeGlyph}
        size={16}
      />
      {iconOnly ? null : (
        <>
          <span className="group-hover/pill:hidden group-focus-visible/pill:hidden">
            {label}
          </span>
          <span className="hidden group-hover/pill:inline group-focus-visible/pill:inline">
            {hover}
          </span>
        </>
      )}
    </button>
  );
});
EyePill.displayName = 'EyePill';

export default EyePill;
