'use client';

import { memo, useMemo } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { SlidingProgressTrack } from '@/components/ui/progress/ProgressTrack';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { useSeriesView } from '@/lib/marking/hooks';
import promptSignIn from '@/lib/marking/promptSignIn';

import { openHistory } from '../../_lib/urlState';
import { PROGRESS_LINE_SPACE as LINE_SPACE } from '../frames';
import { preloadHistorySheet } from '../history/HistorySheetIsland';
import ProgressUnavailable from './ProgressUnavailable';
import { type ProgressLine, progressLine, sizeLine } from './progressLine';

type Props = Readonly<{
  seriesId: number;
  runtimes: Readonly<Record<number, ReadonlyArray<number>>>;
  nextAirDay: string | null;
  /** Signed out: the empty bar and the series' size; a click asks to sign in. */
  signedIn: boolean;
}>;

const NOTHING_WATCHED = { skipped: [], watched: {} } as const;

const open = () => openHistory();

/** The line's own box (`PROGRESS_LINE_SPACE`), the text centred in it. */
const BUTTON = cn(
  LINE_SPACE,
  'group flex cursor-pointer items-center gap-3 rounded-10 px-2.5 text-left text-white hover:bg-white/6',
);

/** A fraction as a percentage to one decimal */
const pct = (fraction: number) => Number((fraction * 100).toFixed(1));

function Track({ line }: Readonly<{ line: ProgressLine }>) {
  const aired = pct(line.aired);
  const tick = line.airing ? aired : undefined;
  return (
    <SlidingProgressTrack
      aired={aired}
      slide="ease-out"
      tick={tick}
      watched={pct(line.watched)}
    />
  );
}

/**
 * The hero's progress line (epf-pg), live from the marking
 * store: every mark, drag and Undo moves it in the same frame. A click opens
 * the watch-history sheet (`?history`). Signed out it is the same control in
 * the same place: the bar empty, the series' size in place of the numbers
 * ("47 episodes · 26h 51m in all"), and a click shows the sign-in toast, as
 * every marking control does for a visitor.
 */
function ProgressBar({ nextAirDay, runtimes, seriesId, signedIn }: Props) {
  const view = useSeriesView(seriesId);
  const line = useMemo(() => {
    if (!view || view.unavailable) {
      return null;
    }
    const options = { nextAirDay, runtimes };
    return signedIn
      ? progressLine(view, options)
      : progressLine({ ...view, ...NOTHING_WATCHED }, options);
  }, [view, nextAirDay, runtimes, signedIn]);
  const size = useMemo(
    () => (!signedIn && view ? sizeLine(view, { nextAirDay, runtimes }) : null),
    [view, nextAirDay, runtimes, signedIn],
  );
  if (view?.unavailable) {
    return <ProgressUnavailable seriesId={seriesId} />;
  }
  if (!line) {
    return <ProgressSkeleton />;
  }
  const tail = line.tail ? ` · ${line.tail}` : '';
  const label =
    size === null
      ? `${line.percent} watched, ${line.count} watched${tail}: open watch history`
      : `Watch history: ${size}`;
  const onClick = size === null ? open : promptSignIn;
  // Signed in, intent fetches the sheet's code (a visitor gets the toast)
  const preload = size === null ? preloadHistorySheet : undefined;
  return (
    <button
      aria-label={label}
      className={BUTTON}
      data-slot="progress"
      onClick={onClick}
      onFocus={preload}
      onPointerEnter={preload}
      type="button"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5 md:gap-4">
        <Track line={line} />
        <span className="whitespace-nowrap text-caption font-medium text-white/60 tabular-nums">
          {size ?? (
            <>
              <b className="font-medium text-white/80">{line.percent}</b> ·{' '}
              {line.count}
              <span className="max-md:hidden"> watched</span>
              {tail}
            </>
          )}
        </span>
      </span>
      <Icon
        // contrast-exempt: the chevron icon
        className="shrink-0 text-white/55 max-md:size-[13px]"
        glyph={chevronRightGlyph}
        size={16}
      />
    </button>
  );
}

ProgressBar.displayName = 'ProgressBar';

export default memo(ProgressBar);

/** The line's exact space while the viewer's marks load: the same box for everyone. */
export function ProgressSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={cn(LINE_SPACE, 'flex animate-ghost items-center gap-3 px-2.5')}
      data-placeholder="progress"
    >
      <span className={`h-1 flex-1 rounded-2 ${GHOST_FILL}`} />
      <span className={`h-3 w-40 rounded-4 ${GHOST_FILL}`} />
    </div>
  );
}
