'use client';

import { type KeyboardEvent, useCallback } from 'react';
import { FILL_BEFORE } from '@/components/motion/glide';
import ChoiceButton from '@/components/ui/button/ChoiceButton';
import {
  calendarGlyph,
  globeGlyph,
  languageGlyph,
  tagGlyph,
  variantBuildingGlyph,
  variantHourglassGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';

import { LENS_KEYS, LENS_LABELS, type LensKey } from '../../_data/hubTiles';
import { lensPanelId, lensTabId, useLens, useLensStore } from './LensProvider';

const LENS_GLYPH: Readonly<Record<LensKey, Glyph>> = {
  country: globeGlyph,
  decade: calendarGlyph,
  duration: variantHourglassGlyph,
  language: languageGlyph,
  network: variantBuildingGlyph,
  theme: tagGlyph,
};

// Phones: 34px pills that scroll sideways, white when chosen; the scroller
// has 6px above and below so the tabs' taller targets aren't clipped.
// Desktop: the 10px-padded dark bar with icon tabs, its corner the tabs'
// 8 plus the padding.
const BAR =
  '-mx-gutter flex gap-1.5 overflow-x-auto px-gutter scrollbar-none max-md:-my-1.5 max-md:py-1.5 md:mx-0 md:gap-1 md:overflow-visible md:rounded-18 md:bg-black/22 md:p-2.5';
// 5px above and below (44px on a phone), half the gap at the sides
const TAB = [
  'flex h-8.5 shrink-0 after:absolute after:-inset-x-[3px] after:-inset-y-[5px] md:after:-inset-x-0.5 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-white/6 px-3.5 text-body-sm font-medium text-white/80',
  'transition-[background-color,color] duration-200',
  // the chosen fill is the tab's ::before, so it glides to the next tab
  // chosen (`ChoiceButton`) without moving the words
  FILL_BEFORE,
  'aria-selected:before:bg-white aria-selected:text-black/90',
  'md:h-auto md:rounded-8 md:bg-transparent md:px-4 md:py-1.5 md:text-white/60 md:hover:text-white',
  'md:aria-selected:before:bg-white/15 md:aria-selected:text-white',
].join(' ');

function LensTab({ lens }: Readonly<{ lens: LensKey }>) {
  const selected = useLens((state) => state.lens === lens);
  const selectLens = useLens((state) => state.selectLens);
  const onClick = useCallback(() => selectLens(lens), [lens, selectLens]);
  const panelId = lensPanelId(lens);
  const tabId = lensTabId(lens);
  return (
    <ChoiceButton
      aria-controls={panelId}
      aria-selected={selected}
      className={TAB}
      id={tabId}
      on={selected}
      onClick={onClick}
      role="tab"
      tabIndex={selected ? 0 : -1}
    >
      <Icon className="max-md:hidden" glyph={LENS_GLYPH[lens]} size={14} />
      {LENS_LABELS[lens]}
    </ChoiceButton>
  );
}

const LAST = LENS_KEYS.length - 1;

/** Where a key moves in the tab list (APG tabs), or null for another key */
const moveTo = (key: string, index: number): number | null => {
  switch (key) {
    case 'ArrowRight':
      return index === LAST ? 0 : index + 1;
    case 'ArrowLeft':
      return index === 0 ? LAST : index - 1;
    case 'Home':
      return 0;
    case 'End':
      return LAST;
    default:
      return null;
  }
};

/**
 * The six lens tabs (APG tabs): one tab stop, the arrow keys, Home and End
 * move and select at once (every panel is already in the page, so selecting
 * costs nothing).
 */
export default function LensTabBar() {
  // read when a key is pressed: the bar itself never re-renders
  const store = useLensStore();
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { lens: current, selectLens } = store.getState();
      const next = moveTo(event.key, LENS_KEYS.indexOf(current));
      const lens = next === null ? undefined : LENS_KEYS[next];
      if (!lens) {
        return;
      }
      event.preventDefault();
      selectLens(lens);
      document.getElementById(lensTabId(lens))?.focus();
    },
    [store],
  );
  return (
    <div
      aria-label="Look at TV by"
      className={BAR}
      onKeyDown={onKeyDown}
      role="tablist"
    >
      {LENS_KEYS.map((lens) => (
        <LensTab key={lens} lens={lens} />
      ))}
    </div>
  );
}
