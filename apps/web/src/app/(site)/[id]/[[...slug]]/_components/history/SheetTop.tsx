'use client';

import { AnimatePresence } from 'motion/react';
import { type MouseEvent, memo, useCallback, useId, useMemo } from 'react';
import FoldPresence from '@/components/motion/FoldPresence';
import { HIT_Y } from '@/components/ui/button/hitArea';
import { SegmentedItem } from '@/components/ui/button/Segmented';
import { helpGlyph, trendingGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { WHOLE_SHOW } from '@/lib/marking/copy';
import { useSeriesProgress, useSeriesView } from '@/lib/marking/hooks';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import { pressMark, scopeKey } from '@/lib/marking/pressGate';
import { openEpisodes } from '@/lib/marking/progress';
import useMarking from '@/lib/marking/useMarking';

import { openPicker } from '../../_lib/dialogs';
import { useShow } from '../../_lib/ShowProvider';
import { countsText, unseeded } from '../progress/progressLine';
import DateButton from './DateButton';
import Legend from './Legend';
import type { SheetMode } from './paint';
import SheetToggle from './SheetToggle';
import { rememberSheetMode } from './sheetMode';
import { useSheetUi, useSheetUiStore } from './sheetUi';

const MODES: ReadonlyArray<readonly [SheetMode, string]> = [
  ['mark', 'Tap marks'],
  ['upto', 'Up to here'],
  ['date', 'Tap sets a date'],
];

/** The phone's one-line hint: what a tap and a drag do in the picked mode. */
const HINTS: Readonly<Record<SheetMode, string>> = {
  date: 'Tap picks a date · drag across episodes to date a run',
  mark: 'Tap toggles · drag paints a run: start on unwatched marks, on watched unmarks',
  upto: 'Tap picks the last episode you saw · drag marks a run from the season start',
};

/**
 * Phones only (no show row): the hint follows the mode pill, with the
 * legend toggle at its end, as the pills row has no room for it.
 */
function PaintHint({ legendId }: Readonly<{ legendId: string }>) {
  const mode = useSheetUi((state) => state.mode);
  return (
    <div className="flex items-start gap-2 sm:hidden">
      <p className="inline-flex min-w-0 flex-1 items-center gap-2 text-caption text-white/60">
        <Icon className="shrink-0" glyph={trendingGlyph} size={16} />
        {HINTS[mode]}
      </p>
      <LegendButton
        className="-my-1 shrink-0 px-2 text-caption"
        controls={legendId}
      />
    </div>
  );
}

/**
 * "The Bear · 21 of 47 watched" (with skips "21 watched · 1 skipped", the
 * progress line's counts: `countsText`), the calendar (one date for every open aired
 * episode, skipped ones left skipped) and Mark all watched / Unmark all
 * (desktop).
 */
function ShowRow() {
  const show = useShow();
  const view = useSeriesView(show.id);
  const progress = useSeriesProgress(show.id);
  const marking = useMarking();
  const counts = useMemo(
    () => countsText(view ?? unseeded(show.seasons)),
    [view, show.seasons],
  );
  // Finished (skips included) reads as done, as the hero's eye has it
  const complete = progress?.isFinished ?? false;
  const toggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      pressMark(scopeKey(show.id), event, () => marking.toggleScope(show.id));
    },
    [marking, show.id],
  );
  const markingStore = useMarkingStoreApi();
  const dateAll = useCallback(() => {
    const view = markingStore.getState().series[show.id]?.view;
    // Skipped episodes stay skipped: only the open ones get the date
    const refs = view ? openEpisodes(view) : [];
    if (refs.length > 0) {
      openPicker({ kind: 'set', refs, seriesId: show.id, what: WHOLE_SHOW });
    }
  }, [markingStore, show.id]);
  const label = complete ? 'Unmark the whole series' : 'Mark the whole series';
  const calendarLabel = `When did you watch ${show.title}?`;
  const nothingOpen = (progress?.left ?? 0) === 0;
  return (
    <div className="flex items-center gap-4 rounded-14 bg-white/3.5 px-4 py-3.5 max-sm:hidden">
      <p className="min-w-0 flex-1 truncate text-body-sm text-white/60 tabular-nums">
        <b className="font-semibold text-white">{show.title}</b>
        {` · ${counts}`}
      </p>
      <DateButton
        disabled={nothingOpen}
        label={calendarLabel}
        onClick={dateAll}
      />
      <SheetToggle onClick={toggle} pressed={complete} size="md" title={label}>
        {complete ? 'Unmark all' : 'Mark all watched'}
      </SheetToggle>
    </div>
  );
}

function ModeItem({
  label,
  mode,
}: Readonly<{ mode: SheetMode; label: string }>) {
  const store = useSheetUiStore();
  const pressed = useSheetUi((state) => state.mode === mode);
  const pick = useCallback(() => {
    store.setState({ ask: null, last: null, mode });
    rememberSheetMode(mode);
  }, [mode, store]);
  return (
    <SegmentedItem
      className="h-8 px-3.5 max-sm:h-7.5 max-sm:text-caption"
      onClick={pick}
      pressed={pressed}
    >
      {label}
    </SegmentedItem>
  );
}

function LegendButton({
  className,
  controls,
}: Readonly<{
  className?: string;
  /** the legend's id, named only while it is drawn */
  controls: string;
}>) {
  const store = useSheetUiStore();
  const open = useSheetUi((state) => state.legend);
  const toggle = useCallback(() => {
    store.setState((state) => ({ legend: !state.legend }));
  }, [store]);
  return (
    <button
      aria-controls={open ? controls : undefined}
      aria-expanded={open}
      className={cn(
        // 44px tall to the thumb, still clear of the mode pills above on a phone
        'relative inline-flex h-7.5 min-w-7.5 cursor-pointer items-center gap-1.5 rounded-8 px-2.5 text-body-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white aria-expanded:bg-white/6 aria-expanded:text-white',
        HIT_Y[7],
        className,
      )}
      onClick={toggle}
      type="button"
    >
      <Icon glyph={helpGlyph} size={14} />
      Legend
    </button>
  );
}

/**
 * The block above the seasons: the show row, the
 * mode pills (what a tap does) with the legend toggle, the legend (it folds
 * open and shut); on phones
 * the paint hint (with the legend toggle) instead of the show row.
 */
function SheetTop() {
  const legend = useSheetUi((state) => state.legend);
  const legendId = useId();
  // 24px above the pills row and 24px below it (the sheet's own gap to the
  // seasons): the row sits evenly between the show line and the first season
  return (
    <div className="flex flex-col gap-6 max-sm:gap-3">
      <ShowRow />
      <div className="flex items-center justify-between gap-2.5">
        <div
          aria-label="What a tap does"
          className="inline-flex items-center gap-1 rounded-full bg-black/25 p-1"
          role="group"
        >
          {MODES.map(([mode, label]) => (
            <ModeItem key={mode} label={label} mode={mode} />
          ))}
        </div>
        <LegendButton className="max-sm:hidden" controls={legendId} />
      </div>
      <PaintHint legendId={legendId} />
      <AnimatePresence initial={false}>
        {legend ? (
          // takes the column's gap back and draws it inside, so the gap
          // folds with the legend instead of jumping
          <FoldPresence className="-mt-6 max-sm:-mt-3" key="legend">
            <div className="pt-6 max-sm:pt-3" id={legendId}>
              <Legend />
            </div>
          </FoldPresence>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const SheetTopMemo = memo(SheetTop);
SheetTopMemo.displayName = 'SheetTop';

export default SheetTopMemo;
