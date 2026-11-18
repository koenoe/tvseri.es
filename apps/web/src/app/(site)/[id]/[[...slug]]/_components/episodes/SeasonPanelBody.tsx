'use client';

import { useLayoutEffect, useRef } from 'react';

import { searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import ContinueRow from './ContinueRow';
import { optionId } from './panelRows';
import { centreRow, keepRowInView } from './popoverPlacement';
import type { SeasonPanelProps } from './SeasonPanel';
import SeasonRow from './SeasonRow';

/**
 * The panel's content, shared by the popover and the sheet: the pinned
 * Continue row, "Go to season" above 12 seasons (an editable combobox on
 * the same listbox), and the season rows as a listbox. Opens with the
 * selected season centred, then keeps the keyboard row in view. On the
 * popover focus stays on the trigger; in the sheet (a modal dialog) the
 * listbox itself takes focus with Tab and carries the active descendant.
 */
export default function SeasonPanelBody({
  active,
  activeId,
  keyboard,
  listboxId,
  nextUp,
  onPick,
  onQuery,
  padded,
  query,
  rows,
  selected,
  seriesId,
  started,
}: SeasonPanelProps & Readonly<{ padded: boolean }>) {
  const list = useRef<HTMLDivElement>(null);
  const centred = useRef(false);

  // Scrolls the list (one layout read per open or key move, never per frame).
  useLayoutEffect(() => {
    const element = list.current;
    const row = element?.querySelector<HTMLElement>(`[data-row="${active}"]`);
    if (!element || !row) {
      return;
    }
    if (!centred.current) {
      centred.current = true;
      centreRow(element, row);
      return;
    }
    if (keyboard) {
      keepRowInView(element, row);
    }
  }, [active, keyboard]);

  const onChange = onQuery
    ? (event: React.ChangeEvent<HTMLInputElement>) =>
        onQuery(event.target.value)
    : undefined;

  return (
    <>
      {nextUp ? (
        <ContinueRow
          nextUp={nextUp}
          onPick={onPick}
          seriesId={seriesId}
          started={started}
        />
      ) : null}
      {onChange ? (
        // contrast-exempt: the search label colours its icon only; the input text is white
        <label className="flex h-11 flex-none items-center gap-2.5 rounded-12 bg-white/6 px-3.5 text-white/55 focus-within:shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.5)]">
          <Icon glyph={searchGlyph} size={16} />
          <input
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded="true"
            aria-label="Go to season"
            className="h-11 min-w-0 flex-1 bg-transparent text-body-sm text-white outline-hidden placeholder:text-white/60"
            inputMode="numeric"
            onChange={onChange}
            placeholder="Go to season"
            role="combobox"
            type="text"
            value={query}
          />
        </label>
      ) : null}
      <div
        aria-activedescendant={padded ? undefined : activeId}
        aria-label="Seasons"
        className="relative min-h-0 flex-auto overflow-y-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline-offset-[-2px]"
        id={listboxId}
        ref={list}
        role="listbox"
        tabIndex={padded ? undefined : 0}
      >
        {rows.map((row, index) => {
          const rowId = optionId(listboxId, row.seasonNumber);
          const isActive = keyboard && index === active;
          const isSelected = row.seasonNumber === selected;
          return (
            <SeasonRow
              id={rowId}
              index={index}
              isActive={isActive}
              isSelected={isSelected}
              key={row.seasonNumber}
              onPick={onPick}
              padded={padded}
              row={row}
            />
          );
        })}
      </div>
    </>
  );
}
