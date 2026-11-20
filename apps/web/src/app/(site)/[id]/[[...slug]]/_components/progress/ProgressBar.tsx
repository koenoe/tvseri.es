'use client';

import type { SeriesRuntimes } from '@tvseri.es/schemas';
import { memo, useEffect, useMemo, useState } from 'react';

import Sheen, { FINISH_SHEEN } from '@/components/motion/Sheen';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { useSeriesView } from '@/lib/marking/hooks';
import promptSignIn from '@/lib/marking/promptSignIn';
import useCulmination from '@/lib/marking/useCulmination';

import { openHistory } from '../../_lib/urlState';
import { PROGRESS_LINE_SPACE as LINE_SPACE } from '../frames';
import { preloadHistorySheet } from '../history/HistorySheetIsland';
import {
  LineFacts,
  LinePercent,
  type PercentRoll,
  SizeFacts,
} from './ProgressCaption';
import ProgressLineLayout from './ProgressLineLayout';
import ProgressUnavailable from './ProgressUnavailable';
import { progressLine, sizeLine } from './progressLine';
import { rememberLine } from './rememberedLine';
import ShowProgressTrack from './ShowProgressTrack';

type Props = Readonly<{
  seriesId: number;
  runtimes: SeriesRuntimes;
  /** `YYYY-MM-DD` of the next episode to air, while it airs */
  nextAirDate: string | null;
  /** Signed out: the empty bar and the series' size; a click asks to sign in. */
  signedIn: boolean;
}>;

const NOTHING_WATCHED = { skipped: [], watched: {} } as const;

const open = () => openHistory();

/** The line's own box (`PROGRESS_LINE_SPACE`), the text centred in it. */
const BUTTON = cn(
  LINE_SPACE,
  'group flex cursor-pointer items-center rounded-10 px-2.5 text-left text-white hover:bg-white/6',
);

const CHEVRON = (
  <Icon
    // contrast-exempt: the chevron icon
    className="shrink-0 text-white/55 max-md:size-[13px]"
    glyph={chevronRightGlyph}
    size={16}
  />
);

/** The value before its last change (the value itself until it changes) */
function useBefore(value: number): number {
  const [pair, setPair] = useState({ before: value, value });
  if (pair.value !== value) {
    setPair({ before: pair.value, value });
  }
  return pair.value === value ? pair.before : pair.value;
}

/**
 * The finish, when the viewer's own mark finishes the show here
 * (`useCulmination`): the fill slides to 100% as any mark's does, the %
 * rolls up to it from where it was, and one sheen passes along the line.
 * Null otherwise (and signed out).
 */
function useFinish(seriesId: number, share: number | null): PercentRoll | null {
  const play = useCulmination(seriesId, 'show');
  const from = useBefore(share ?? 0);
  return play !== null && share === 100 ? { from, key: play } : null;
}

/**
 * The hero's progress line, live from the marking
 * store: every mark, drag and Undo moves it in the same frame. A click opens
 * the watch-history sheet (`?history`). Signed out it is the same control in
 * the same place: the bar empty, the series' size in place of the numbers
 * ("47 episodes · 26h 51m in all"), and a click shows the sign-in toast, as
 * every marking control does for a visitor. A finish here plays once
 * (`useFinish`).
 */
function ProgressBar({ nextAirDate, runtimes, seriesId, signedIn }: Props) {
  // The next visit in this tab draws this line at once (`ProgressFallback`):
  // written after commit, so a render React throws away writes nothing
  useEffect(() => {
    if (signedIn) {
      rememberLine(seriesId, { nextAirDate, runtimes });
    }
  }, [nextAirDate, runtimes, seriesId, signedIn]);
  const view = useSeriesView(seriesId);
  const line = useMemo(() => {
    if (!view || view.unavailable) {
      return null;
    }
    const options = { nextAirDate, runtimes };
    return signedIn
      ? progressLine(view, options)
      : progressLine({ ...view, ...NOTHING_WATCHED }, options);
  }, [view, nextAirDate, runtimes, signedIn]);
  const size = useMemo(
    () =>
      !signedIn && view ? sizeLine(view, { nextAirDate, runtimes }) : null,
    [view, nextAirDate, runtimes, signedIn],
  );
  const finish = useFinish(
    seriesId,
    size === null ? (line?.share ?? null) : null,
  );
  if (view?.unavailable) {
    return <ProgressUnavailable seriesId={seriesId} />;
  }
  if (!line) {
    return <ProgressSkeleton />;
  }
  const label =
    size === null
      ? `${line.label}: open watch history`
      : `Watch history: ${size.join(' · ')}`;
  const onClick = size === null ? open : promptSignIn;
  const track = (
    <>
      <ShowProgressTrack line={line} slide="ease-out" />
      {finish ? <Sheen key={finish.key} timing={FINISH_SHEEN} /> : null}
    </>
  );
  const percent =
    size === null ? <LinePercent line={line} roll={finish} /> : null;
  const facts =
    size === null ? <LineFacts line={line} /> : <SizeFacts facts={size} />;
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
      <ProgressLineLayout
        end={CHEVRON}
        facts={facts}
        percent={percent}
        track={track}
      />
    </button>
  );
}

ProgressBar.displayName = 'ProgressBar';

export default memo(ProgressBar);

const SKELETON_CLASS = cn(LINE_SPACE, 'flex animate-ghost items-center px-2.5');
const TRACK_GHOST = (
  <span className={`h-1 min-w-20 flex-1 rounded-2 ${GHOST_FILL}`} />
);
/** Ghosts of the %'s and the facts' text, each in its 20px line */
const PERCENT_GHOST = (
  <span className="flex h-5 items-center">
    <span className={`h-3 w-8 rounded-4 ${GHOST_FILL}`} />
  </span>
);
const FACTS_GHOST = (
  <span className="flex h-5 items-center">
    <span className={`h-3 w-32 rounded-4 ${GHOST_FILL}`} />
  </span>
);

/**
 * The line's exact space while the viewer's marks load, in the line's own
 * layout (one row; on a phone the bar and % over the facts): the same box
 * for everyone.
 */
export function ProgressSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={SKELETON_CLASS}
      data-placeholder="progress"
    >
      <ProgressLineLayout
        facts={FACTS_GHOST}
        percent={PERCENT_GHOST}
        track={TRACK_GHOST}
      />
    </div>
  );
}
