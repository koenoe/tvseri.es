'use client';

import { type ReactNode, useCallback } from 'react';
import { flushSync } from 'react-dom';

import ExpandButton, {
  type ExpandLayout,
} from '@/components/ui/fold/ExpandButton';
import cn from '@/lib/cn';
import type { WallDispatch } from './EpisodesView';
import { WALL_GRID, WATCHED_GRID } from './tileLayout';
import { CompactTile, StackTile } from './WallCompact';
import { EpisodeTile, FocusTile, UpcomingTile } from './WallTiles';
import type { FocusLayout, WallSlot } from './wall';

type Props = Readonly<{
  seriesId: number;
  seasonNumber: number;
  slots: ReadonlyArray<WallSlot>;
  focusLayout: FocusLayout | null;
  dispatch: WallDispatch;
}>;

const MORE_ROW =
  'col-span-full flex min-h-14 items-center justify-center gap-3';
const PHONE_MORE_ROW = `${MORE_ROW} md:hidden`;

/**
 * Show all / Show fewer with a chevron: the dashed pill in both states. Both
 * labels share one grid cell (the other one invisible), so the pill keeps its
 * width when the label changes and nothing moves under the pointer.
 */
const TOGGLE: ExpandLayout = {
  button:
    'inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/22 border-dashed px-5.5 font-medium text-body-sm text-white/80 transition-colors hover:bg-white/6',
  chevron: 15,
};

/**
 * Shows every open episode at once, then gives keyboard focus to the first
 * tile it revealed, without scrolling.
 */
function revealAll(dispatch: WallDispatch, reveals: string | null) {
  flushSync(() => dispatch({ type: 'expand' }));
  if (reveals) {
    document
      .querySelector<HTMLElement>(`[data-episode-tile="${reveals}"] button`)
      ?.focus({ preventScroll: true });
  }
}

/**
 * Folds the wall back and brings the toggle into view, so a long season
 * doesn't leave the reader below the section it just closed.
 */
function foldBack(dispatch: WallDispatch) {
  flushSync(() => dispatch({ type: 'collapse' }));
  const toggle = [
    ...document.querySelectorAll<HTMLElement>('[data-wall-more] button'),
  ].find((button) => button.offsetParent);
  toggle?.scrollIntoView({ block: 'nearest' });
  toggle?.focus({ preventScroll: true });
}

/**
 * Show all / Show fewer: one button in one place
 * that turns its chevron; the desktop and the phone wording are two buttons
 * CSS picks between, so the server markup stays viewport-free.
 */
function FoldToggle({
  dispatch,
  slot,
}: Readonly<{
  dispatch: WallDispatch;
  slot: Extract<WallSlot, { kind: 'more' | 'fewer' }>;
}>) {
  const open = slot.kind === 'fewer';
  const desktop = slot.label !== null;
  const reveals = slot.kind === 'more' ? slot.reveals : null;
  const expand = useCallback(
    () => revealAll(dispatch, reveals?.desktop ?? null),
    [dispatch, reveals?.desktop],
  );
  const expandPhone = useCallback(
    () => revealAll(dispatch, reveals?.phone ?? null),
    [dispatch, reveals?.phone],
  );
  const fold = useCallback(() => foldBack(dispatch), [dispatch]);
  const rowClasses = desktop ? MORE_ROW : PHONE_MORE_ROW;
  const desktopLabel = slot.label ?? '';
  const phoneLabel = slot.phoneLabel ?? '';
  return (
    <div className={rowClasses} data-wall-more="">
      {desktop ? (
        <ExpandButton
          className="max-md:hidden"
          label={desktopLabel}
          layout={TOGGLE}
          onClick={open ? fold : expand}
          open={open}
        />
      ) : null}
      <ExpandButton
        className="md:hidden"
        label={phoneLabel}
        layout={TOGGLE}
        onClick={open ? fold : expandPhone}
        open={open}
      />
    </div>
  );
}

type SlotProps = Readonly<{
  dispatch: WallDispatch;
  focusLayout: FocusLayout;
  seriesId: number;
  slot: WallSlot;
}>;

function Slot({ dispatch, focusLayout, seriesId, slot }: SlotProps): ReactNode {
  switch (slot.kind) {
    case 'focus':
      return (
        <FocusTile
          episode={slot.item.episode}
          layout={focusLayout}
          left={slot.left}
          leftMinutes={slot.leftMinutes}
          mark={slot.item.mark}
          record={slot.item.record}
          seriesId={seriesId}
        />
      );
    case 'unwatched':
      return (
        <EpisodeTile
          deferred={slot.deferred}
          episode={slot.item.episode}
          mark={slot.item.mark}
          phoneHidden={slot.phoneHidden}
          record={slot.item.record}
          seriesId={seriesId}
        />
      );
    case 'upcoming':
      return (
        <UpcomingTile
          deferred={slot.deferred}
          episode={slot.item.episode}
          phoneHidden={slot.phoneHidden}
        />
      );
    case 'more':
    case 'fewer':
      return <FoldToggle dispatch={dispatch} slot={slot} />;
    case 'heading':
      return (
        <h3 className="col-span-full mt-2 text-overline text-white/60 uppercase">
          {slot.label}
        </h3>
      );
    case 'compact':
      return (
        <CompactTile
          episode={slot.item.episode}
          mark={slot.item.mark}
          record={slot.item.record}
          seriesId={seriesId}
        />
      );
    case 'stack':
      return (
        <StackTile dispatch={dispatch} first={slot.first} items={slot.items} />
      );
    default:
      return null;
  }
}

/**
 * The Focus wall: what you haven't seen first.
 * Three columns of 392 on desktop, two on a tablet, one on a phone. Two
 * grids: Focus with the open and upcoming episodes (Focus 2 × 2 with two
 * tiles beside it, or across the row when fewer than two can stand there),
 * then the "N watched" group, which never backfills the part above it.
 * The slots come from `planWall`; marks move tiles between groups live.
 */
export default function FocusWall({
  dispatch,
  focusLayout,
  seasonNumber,
  seriesId,
  slots,
}: Props) {
  const headingAt = slots.findIndex((slot) => slot.kind === 'heading');
  const main = headingAt === -1 ? slots : slots.slice(0, headingAt);
  const watched = headingAt === -1 ? [] : slots.slice(headingAt);
  const layout = focusLayout ?? 'tall';
  const render = (slot: WallSlot) => (
    <Slot
      dispatch={dispatch}
      focusLayout={layout}
      key={slot.key}
      seriesId={seriesId}
      slot={slot}
    />
  );
  const watchedClass = cn(WATCHED_GRID, main.length ? 'mt-3' : 'mt-1');
  const label = `Season ${seasonNumber} episodes, what you haven’t seen first`;
  return (
    <div aria-label={label} role="group">
      {main.length ? <div className={WALL_GRID}>{main.map(render)}</div> : null}
      {watched.length ? (
        <div className={watchedClass} data-wall-group="watched">
          {watched.map(render)}
        </div>
      ) : null}
    </div>
  );
}
