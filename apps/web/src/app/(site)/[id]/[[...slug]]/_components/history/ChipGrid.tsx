'use client';

import { memo } from 'react';

import { FLAT, PULSE } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import { chipLabel, isPressedChip, type SheetChip } from './chips';
import {
  ChipGlyph,
  type ChipOverlay,
  ChipText,
  markChipClass,
} from './MarkChip';
import { type RunCommit, runSpan } from './paint';
import { useSheetUi, useSheetUiStore } from './sheetUi';
import usePaintGesture from './usePaintGesture';

type ChipProps = Readonly<{
  index: number;
  chip: SheetChip;
  overlay: ChipOverlay | undefined;
  title: string;
}>;

const CHIP_LAYOUT =
  'w-full min-w-14 max-sm:w-auto max-sm:min-w-12 max-sm:px-1.5';

/** The grid's layout, the same for its ghost so nothing shifts */
const GRID =
  'grid select-none grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2 max-sm:flex max-sm:flex-wrap max-sm:gap-[5px]';

function GridChip({ chip, index, overlay, title }: ChipProps) {
  const classes = markChipClass(chip.state, overlay, CHIP_LAYOUT);
  const na = chip.state === 'na';
  const unavailable = na || undefined;
  const pressed = isPressedChip(chip.state);
  const struck = chip.state === 'sk';
  return (
    <button
      aria-disabled={unavailable}
      aria-label={title}
      aria-pressed={pressed}
      className={classes}
      data-chip={index}
      tabIndex={na ? -1 : undefined}
      title={title}
      type="button"
    >
      <ChipGlyph overlay={overlay} state={chip.state} />
      <ChipText struck={struck}>{chipLabel(chip.ref)}</ChipText>
    </button>
  );
}

const GridChipMemo = memo(GridChip);
GridChipMemo.displayName = 'GridChip';

/**
 * One season's episode chip grid and its paint gesture: a tap is a click (`onTap`); a drag paints a
 * consecutive run, the first chip deciding, and the release applies it per
 * mode (`onCommit`). Touch starts a run with a 350ms press or a sideways
 * 6px move; vertical moves scroll. Chip boxes are measured once per drag,
 * so a move is a lookup, not a layout read; the highlight is a class.
 */
function ChipGrid({
  chips,
  onCommit,
  onTap,
  seasonNumber,
  titles,
}: Readonly<{
  seasonNumber: number;
  chips: ReadonlyArray<SheetChip>;
  /** Tooltip / accessible name per chip, same order. */
  titles: ReadonlyArray<string>;
  onTap: (chip: SheetChip) => void;
  onCommit: (commit: RunCommit) => void;
}>) {
  const store = useSheetUiStore();
  const run = useSheetUi((state) =>
    state.run?.seasonNumber === seasonNumber ? state.run : null,
  );
  const mode = useSheetUi((state) => state.mode);
  const handlers = usePaintGesture({
    chips,
    onCommit,
    onTap,
    seasonNumber,
    store,
  });

  const span = run ? runSpan(mode, run) : null;
  const unmarking = run?.direction === 'unmark' && mode !== 'upto';
  const classes = cn(GRID, run ? 'touch-none' : 'touch-pan-y');

  return (
    // the chips' own drag (a run), never the sheet's swipe
    <div className={classes} data-no-sheet-swipe="" {...handlers}>
      {chips.map((chip, index) => {
        const painted =
          span !== null &&
          index >= span[0] &&
          index <= span[1] &&
          chip.state !== 'na';
        const overlay: ChipOverlay | undefined = painted
          ? unmarking
            ? 'unrun'
            : 'run'
          : undefined;
        const title = titles[index] ?? '';
        return (
          <GridChipMemo
            chip={chip}
            index={index}
            key={chip.ref.episodeNumber}
            overlay={overlay}
            title={title}
          />
        );
      })}
    </div>
  );
}

const GHOST_GRID = cn(GRID, PULSE);
const GHOST_CHIP = markChipClass('', undefined, cn(CHIP_LAYOUT, FLAT));

/**
 * The grid until the viewer's marks have seeded the show: one flat chip per
 * episode in the chip's box (its label sizes it, unseen), nothing pressable
 */
export function ChipGridGhost({
  count,
  seasonNumber,
}: Readonly<{ count: number; seasonNumber: number }>) {
  return (
    <div aria-hidden="true" className={GHOST_GRID} data-chip-ghost="">
      {Array.from({ length: count }, (_, index) => (
        <span className={GHOST_CHIP} key={index}>
          {chipLabel({ episodeNumber: index + 1, seasonNumber })}
        </span>
      ))}
    </div>
  );
}

const ChipGridMemo = memo(ChipGrid);
ChipGridMemo.displayName = 'ChipGrid';

export default ChipGridMemo;
