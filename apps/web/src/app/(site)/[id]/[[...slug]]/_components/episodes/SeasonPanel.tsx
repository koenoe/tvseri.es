'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useCallback, useId, useLayoutEffect, useRef } from 'react';

import { CENTER_MOTION } from '@/components/ui/dialog/dialogMotion';
import { SURFACE } from '@/components/ui/dialog/dialogStyles';
import ModalShell from '@/components/ui/dialog/ModalShell';
import SheetHandle from '@/components/ui/dialog/SheetHandle';
import { holdScrollLock } from '@/components/ui/dialog/scrollLock';
import { closeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';
import { useShow } from '../../_lib/ShowProvider';
import { PANEL_QUERY_ABOVE, type PanelRow } from './panelRows';
import { centreRow, POPOVER_GAP, placePopover } from './popoverPlacement';
import SeasonPanelBody from './SeasonPanelBody';
import styles from './seasonPanel.module.css';

export type SeasonPanelProps = Readonly<{
  seriesId: number;
  rows: ReadonlyArray<PanelRow>;
  selected: number;
  active: number;
  /** The listbox's id, and its active option's (undefined: no rows). */
  listboxId: string;
  activeId: string | undefined;
  keyboard: boolean;
  nextUp: EpisodeRef | null;
  /** Anything watched: the pinned row reads Continue, else Start. */
  started: boolean;
  /** "Go to season" (above 12 seasons), else null. */
  onQuery: ((query: string) => void) | null;
  query: string;
  onPick: (seasonNumber: number) => void;
  onClose: (refocus: boolean) => void;
}>;

const POPOVER = cn(
  'absolute top-13 left-[-6px] z-20 flex max-h-150 w-110 flex-col gap-1.5 rounded-20 p-2 shadow-[0_30px_60px_-16px_rgb(0_0_0/0.85),0_0_0_1px_rgb(255_255_255/0.08)]',
  SURFACE.dialog,
  styles.pop,
);

const SHEET = cn(
  'flex max-h-160 w-full flex-col gap-2 self-end rounded-t-[28px] px-3 pt-2 pb-7 shadow-[0_-20px_40px_-10px_rgb(0_0_0/0.6),0_0_0_1px_rgb(255_255_255/0.08)]',
  SURFACE.dialog,
);

/**
 * The sheet title's quiet note: the show,
 * and the season count when there are enough to need "Go to season"
 * ("The Bear", "Long-runner · 40").
 */
function useTitleNote(): string {
  const show = useShow();
  const regular = show.seasons.filter(
    (season) => season.seasonNumber > 0,
  ).length;
  return regular > PANEL_QUERY_ABOVE
    ? `${show.title} · ${regular}`
    : show.title;
}

function PhoneSheet(props: SeasonPanelProps) {
  const titleId = useId();
  const note = useTitleNote();
  const { onClose } = props;
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose(true);
      }
    },
    [onClose],
  );
  const close = useCallback(() => onClose(true), [onClose]);
  return (
    <ModalShell
      backdropClassName="bg-black/60"
      labelledBy={titleId}
      motion={CENTER_MOTION}
      onOpenChange={onOpenChange}
      open
      panelClassName={SHEET}
    >
      <SheetHandle className="self-center" />
      <div className="flex h-13 flex-none items-center gap-3 pr-1 pl-2.5">
        <b className="flex-1 text-title-3" id={titleId}>
          Seasons{' '}
          <span className="text-meta font-normal leading-5 text-white/60">
            {note}
          </span>
        </b>
        <button
          aria-label="Close"
          className="flex size-11 items-center justify-center rounded-full text-white/75"
          onClick={close}
          type="button"
        >
          <span className="flex size-8 items-center justify-center rounded-full border-2 border-white/20">
            <Icon glyph={closeGlyph} size={14} />
          </span>
        </button>
      </div>
      <SeasonPanelBody {...props} padded={false} />
    </ModalShell>
  );
}

/**
 * Keeps the popover in the window: measured once as it opens, it
 * stays under the trigger when it fits, else opens on the side with more
 * room, capped there with the list scrolling inside; then the active row is
 * centred again in the list's final height.
 */
function usePlacement(active: number) {
  const panel = useRef<HTMLDivElement>(null);
  const placedFor = useRef(false);
  useLayoutEffect(() => {
    const element = panel.current;
    const trigger = element?.parentElement?.getBoundingClientRect();
    if (!element || !trigger || placedFor.current) {
      return;
    }
    placedFor.current = true;
    const box = element.getBoundingClientRect();
    const place = placePopover({
      natural: box.height,
      triggerBottom: trigger.bottom,
      triggerTop: trigger.top,
      viewport: window.innerHeight,
    });
    if (place.maxHeight !== null) {
      element.style.maxHeight = `${place.maxHeight}px`;
    }
    if (place.side === 'above') {
      const height = Math.min(box.height, place.maxHeight ?? box.height);
      const top = trigger.top - POPOVER_GAP - height;
      element.style.top = `${element.offsetTop + top - box.top}px`;
    }
    const list = element.querySelector<HTMLElement>('[role="listbox"]');
    const row = list?.querySelector<HTMLElement>(`[data-row="${active}"]`);
    if (list && row) {
      centreRow(list, row);
    }
  }, [active]);
  return panel;
}

function Popover(props: SeasonPanelProps) {
  const { onClose } = props;
  const closeOutside = useCallback(() => onClose(false), [onClose]);
  const panel = usePlacement(props.active);
  return (
    <>
      {/* the page holds still while a menu is open, as under the ⋯ (no dim) */}
      <span hidden ref={holdScrollLock} />
      <button
        aria-label="Close seasons"
        className="fixed inset-0 z-15 cursor-default"
        onClick={closeOutside}
        tabIndex={-1}
        type="button"
      />
      <div className={POPOVER} data-slot="season-popover" ref={panel}>
        <SeasonPanelBody {...props} padded />
      </div>
    </>
  );
}

/**
 * The open panel: a 440px popover under the trigger on desktop (with a
 * transparent layer that closes it on an outside click, and the page's
 * scroll locked while it is open), a bottom sheet on a phone. Lazy-loaded
 * on first use (`panel` in `useSeasonSelect`).
 */
export default function SeasonPanel(props: SeasonPanelProps) {
  const phone = useMediaQuery(PHONE);
  return phone ? <PhoneSheet {...props} /> : <Popover {...props} />;
}
