'use client';

import { lazy, type MouseEvent, Suspense, useCallback, useState } from 'react';

import Button from '@/components/ui/button/Button';
import { Segmented, SegmentedItem } from '@/components/ui/button/Segmented';
import { clampToViewport, type Point } from '@/components/ui/dialog/atPoint';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';

import { useLoadedNow } from '../../_components/useLoadedNow';
import { MD_BUTTON } from '../../_lib/appButtons';
import {
  defaultSince,
  formatSinceButton,
  formatSinceDay,
  type SyncScopeChoice,
  sinceLine,
} from '../_lib/syncScope';
import { SEGMENT_CLASS, SEGMENTED_CLASS } from './layout';
import OptionRow from './OptionRow';

// The month grid (react-day-picker) loads on the first open, not with Settings
const loadSinceDialog = () => import('./SinceDialog');
const SinceDialog = lazy(loadSinceDialog);

/**
 * The switch and the day button, each as wide as its words: side by side on
 * desktop; on phones the row's full width, the button at the right edge, or
 * on its own line when a narrow screen has no room for both
 */
const CONTROLS =
  'flex flex-wrap items-center gap-2 md:gap-3 max-md:w-full max-md:justify-between';
/** Sync now's pill, with the day, at the switch's height */
const DAY_BUTTON = cn(MD_BUTTON, 'h-9 tabular-nums');

/** "Sync since"'s box (the marking picker's width), to place it by its button */
const PICKER_BOX = { height: 446, width: 560 } as const;
const GAP = 8;

/**
 * Under the button, right edges lined up; above it when the window has no
 * room below; kept inside the window either way.
 */
const pickerSpot = (button: DOMRect): Point => {
  const viewport = { height: window.innerHeight, width: window.innerWidth };
  const below = button.bottom + GAP;
  const fitsBelow = below + PICKER_BOX.height <= viewport.height - 16;
  return clampToViewport(
    {
      left: button.right - PICKER_BOX.width,
      top: fitsBelow ? below : button.top - GAP - PICKER_BOX.height,
    },
    PICKER_BOX,
    viewport,
  );
};

/** Until the browser knows its own day, a day-sized placeholder */
const PLACEHOLDER_DAY = 'Aug 19';

/**
 * The first sync's "How far back": Since a day (three months back, or where
 * the last connection's sync reached) or Everything. Its day comes from the
 * viewer's clock, so the server renders it invisible (no mismatch).
 */
export default function ServiceScopeRow({
  resumeFrom,
  scope,
  setScope,
  total,
}: Readonly<{
  resumeFrom: number | null;
  /** Null: the default day */
  scope: SyncScopeChoice | null;
  setScope: (scope: SyncScopeChoice) => void;
  total: number | null;
}>) {
  const now = useLoadedNow();
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState<Point | null>(null);
  const since =
    scope?.kind === 'since'
      ? scope.since
      : now === null
        ? null
        : defaultSince(now, resumeFrom);
  const everything = scope?.kind === 'everything';
  const pickSince = useCallback(() => {
    if (since !== null) {
      setScope({ kind: 'since', since });
    }
  }, [setScope, since]);
  const pickEverything = useCallback(
    () => setScope({ kind: 'everything' }),
    [setScope],
  );
  const openPicker = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setSpot(pickerSpot(event.currentTarget.getBoundingClientRect()));
    setOpen(true);
  }, []);
  const pickDay = useCallback(
    (day: number) => {
      setScope({ kind: 'since', since: day });
      setOpen(false);
    },
    [setScope],
  );
  const shown: SyncScopeChoice | null = everything
    ? { kind: 'everything' }
    : since === null
      ? null
      : { kind: 'since', since };
  const line =
    shown === null ? (
      <span aria-hidden="true" className="invisible">
        From August 19, 2026 to today.
      </span>
    ) : (
      sinceLine(shown, resumeFrom, total)
    );
  const dayLabel =
    since === null ? (
      <span aria-hidden="true" className="invisible">
        {PLACEHOLDER_DAY}
      </span>
    ) : (
      formatSinceButton(since, now ?? since)
    );
  const buttonLabel =
    since === null
      ? undefined
      : `Sync since ${formatSinceDay(since)}, change day`;
  return (
    <OptionRow description={line} title="How far back">
      <div className={CONTROLS}>
        <Segmented className={SEGMENTED_CLASS} label="How far back">
          <SegmentedItem
            className={SEGMENT_CLASS}
            onClick={pickSince}
            pressed={!everything}
          >
            Since
          </SegmentedItem>
          <SegmentedItem
            className={SEGMENT_CLASS}
            onClick={pickEverything}
            pressed={everything}
          >
            Everything
          </SegmentedItem>
        </Segmented>
        {everything ? null : (
          <Button
            aria-haspopup="dialog"
            aria-label={buttonLabel}
            className={DAY_BUTTON}
            disabled={since === null}
            icon={calendarGlyph}
            onClick={openPicker}
            onFocus={loadSinceDialog}
            onPointerEnter={loadSinceDialog}
            variant="tonal"
          >
            {dayLabel}
          </Button>
        )}
      </div>
      {spot && now !== null && since !== null ? (
        <Suspense fallback={null}>
          <SinceDialog
            now={now}
            onOpenChange={setOpen}
            onPick={pickDay}
            open={open}
            resumeFrom={resumeFrom}
            selected={since}
            spot={spot}
          />
        </Suspense>
      ) : null}
    </OptionRow>
  );
}
