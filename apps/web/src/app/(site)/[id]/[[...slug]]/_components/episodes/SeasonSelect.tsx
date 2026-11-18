'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useId, useRef } from 'react';
import { chevronDownGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import type { SeriesBase } from '@/lib/marking/types';

import { seasonName } from './panelRows';
import useSeasonSelect, { panel } from './useSeasonSelect';

/**
 * The season select: "Season 3 ▾" as the section title opens a calm panel
 * (a popover on desktop, a bottom sheet on a phone, loaded on first use). A select-only
 * combobox (WAI-ARIA APG): focus stays on the trigger and the active option
 * is its `aria-activedescendant` (the "Go to season" input's while typing
 * there). Keyboard: ↓/↑ opens, ↑↓ move, Home/End jump, digits and "s" type
 * ahead, Enter picks, Esc, Tab, focus leaving or a click outside closes.
 * Picking writes `?season`.
 */
export default function SeasonSelect({
  nextUp,
  personal,
  seasonNumber,
  seriesId,
  view,
}: Readonly<{
  seasonNumber: number;
  seriesId: number;
  /** The section's marks and Next up (drawn in the rows). */
  view: SeriesBase;
  /** Next up (the Continue row), null signed out. */
  nextUp: EpisodeRef | null;
  /** The marks are the viewer's: rows show personal states. */
  personal: boolean;
}>) {
  const listboxId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const {
    active,
    activeId,
    close,
    many,
    onBlur,
    onKeyDown,
    onQuery,
    pick,
    rows,
    state,
    toggle,
  } = useSeasonSelect({
    listboxId,
    nextUp,
    personal,
    seasonNumber,
    seriesId,
    trigger,
    view,
  });

  const chevron = cn(
    'size-5 transition-transform duration-180 md:size-5.5',
    state.open && 'rotate-180',
  );

  const started = Object.keys(view.watched).length > 0;
  const Panel = panel.get();
  return (
    <span
      className="static inline-flex flex-none"
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <button
        aria-activedescendant={activeId}
        aria-controls={state.open ? listboxId : undefined}
        aria-expanded={state.open}
        aria-haspopup="listbox"
        aria-label="Season"
        className="inline-flex h-8 items-center gap-2.5 whitespace-nowrap rounded-8 text-title-3 md:h-10 md:text-title-2"
        onClick={toggle}
        onFocus={panel.preload}
        onPointerDown={panel.preload}
        onPointerEnter={panel.preload}
        ref={trigger}
        role="combobox"
        type="button"
      >
        {seasonName(seasonNumber)}
        <Icon className={chevron} glyph={chevronDownGlyph} size={24} />
      </button>
      {state.open && Panel ? (
        <Panel
          active={active}
          activeId={activeId}
          keyboard={state.keyboard}
          listboxId={listboxId}
          nextUp={nextUp}
          onClose={close}
          onPick={pick}
          onQuery={many ? onQuery : null}
          query={state.query}
          rows={rows}
          selected={seasonNumber}
          seriesId={seriesId}
          started={started}
        />
      ) : null}
    </span>
  );
}
