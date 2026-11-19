'use client';

import { lazy, Suspense, useCallback, useState } from 'react';

import { Segmented, SegmentedItem } from '@/components/ui/button/Segmented';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { useLoadedNow } from '../../_components/useLoadedNow';
import {
  defaultSince,
  formatSinceDay,
  type SyncScopeChoice,
  sinceLine,
} from '../_lib/syncScope';
import { SEGMENT_CLASS, SEGMENTED_CLASS } from './layout';
import OptionRow from './OptionRow';

// The month grid (react-day-picker) loads on the first open, not with Settings
const loadSinceDialog = () => import('./SinceDialog');
const SinceDialog = lazy(loadSinceDialog);

/** The day field: the segmented control's well, a calendar and the day */
const DAY_FIELD =
  'inline-flex h-9 cursor-pointer items-center gap-2 rounded-10 bg-black/28 px-3 text-body-sm text-white tabular-nums transition-colors hover:bg-black/40 disabled:cursor-default';

/** Until the browser knows its own day, a "today"-sized placeholder */
const PLACEHOLDER_DAY = '19 August 2026';

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
  const [loaded, setLoaded] = useState(false);
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
  const openPicker = useCallback(() => {
    setLoaded(true);
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
        From {PLACEHOLDER_DAY} to today.
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
      formatSinceDay(since)
    );
  const fieldLabel =
    since === null
      ? undefined
      : `Sync since ${formatSinceDay(since)}, change day`;
  return (
    <OptionRow description={line} title="How far back">
      <div className="flex flex-wrap items-center gap-2">
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
          <button
            aria-haspopup="dialog"
            aria-label={fieldLabel}
            className={DAY_FIELD}
            disabled={since === null}
            onClick={openPicker}
            onFocus={loadSinceDialog}
            onPointerEnter={loadSinceDialog}
            type="button"
          >
            <Icon className="text-white/60" glyph={calendarGlyph} size={16} />
            {dayLabel}
          </button>
        )}
      </div>
      {loaded && now !== null && since !== null ? (
        <Suspense fallback={null}>
          <SinceDialog
            now={now}
            onOpenChange={setOpen}
            onPick={pickDay}
            open={open}
            resumeFrom={resumeFrom}
            selected={since}
          />
        </Suspense>
      ) : null}
    </OptionRow>
  );
}
