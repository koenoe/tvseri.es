// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChipGrid from './ChipGrid';
import type { ChipState, SheetChip } from './chips';
import type { SheetMode } from './paint';
import { createSheetUi, SheetUiContext, type SheetUiStore } from './sheetUi';

const chips = (...states: ChipState[]): SheetChip[] =>
  states.map((state, index) => ({
    ref: { episodeNumber: index + 1, seasonNumber: 3 },
    state,
  }));

const rect = (x: number, width: number) =>
  ({
    bottom: 30,
    height: 30,
    left: x,
    right: x + width,
    top: 0,
    width,
    x,
    y: 0,
  }) as DOMRect;

function setup(
  states: ReadonlyArray<ChipState>,
  mode: SheetMode = 'mark',
  store = createSheetUi(),
) {
  store.setState({ mode });
  const onTap = vi.fn();
  const onCommit = vi.fn();
  const list = chips(...states);
  const titles = list.map((chip) => `E${chip.ref.episodeNumber}`);
  render(
    <SheetUiContext value={store}>
      <ChipGrid
        chips={list}
        onCommit={onCommit}
        onTap={onTap}
        seasonNumber={3}
        titles={titles}
      />
    </SheetUiContext>,
  );
  const buttons = screen.getAllByRole('button');
  const grid = buttons[0]!.parentElement!;
  grid.getBoundingClientRect = () => rect(0, 500);
  buttons.forEach((button, index) => {
    button.getBoundingClientRect = () => rect(index * 70, 60);
  });
  return { buttons, grid, onCommit, onTap, store };
}

const at = (index: number) => ({ clientX: index * 70 + 30, clientY: 15 });
// A real press: the primary pointer, the button held while it moves.
const mouse = {
  button: 0,
  buttons: 1,
  isPrimary: true,
  pointerId: 1,
  pointerType: 'mouse',
} as const;

describe('ChipGrid', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('a tap is a tap', () => {
    const t = setup(['w', '', '']);
    fireEvent.pointerDown(t.buttons[1]!, { ...mouse, ...at(1) });
    fireEvent.pointerUp(t.grid, { ...mouse, ...at(1) });
    fireEvent.click(t.buttons[1]!);
    expect(t.onTap).toHaveBeenCalledWith(chips('w', '', '')[1]);
    expect(t.onCommit).not.toHaveBeenCalled();
  });

  it('a drag paints a run from the first chip and swallows the click', () => {
    const t = setup(['w', '', '', '', 'na']);
    fireEvent.pointerDown(t.buttons[1]!, { ...mouse, ...at(1) });
    fireEvent.pointerMove(t.grid, { ...mouse, ...at(2) });
    fireEvent.pointerMove(t.grid, { ...mouse, ...at(3) });
    expect(t.store.getState().run).toEqual({
      direction: 'mark',
      from: 1,
      seasonNumber: 3,
      to: 3,
    });
    expect(t.buttons[2]!.className).toContain('bg-white/24');
    fireEvent.pointerUp(t.grid, { ...mouse, ...at(3) });
    fireEvent.click(t.buttons[3]!, { detail: 1 });
    expect(t.onCommit).toHaveBeenCalledWith({
      direction: 'mark',
      kind: 'paint',
      refs: [2, 3, 4].map((episodeNumber) => ({
        episodeNumber,
        seasonNumber: 3,
      })),
    });
    expect(t.onTap).not.toHaveBeenCalled();
    expect(t.store.getState().run).toBeNull();
  });

  it('a watched start unmarks; not-aired chips never join', () => {
    const t = setup(['w', 'w', '', 'na']);
    fireEvent.pointerDown(t.buttons[0]!, { ...mouse, ...at(0) });
    fireEvent.pointerMove(t.grid, { ...mouse, ...at(3) });
    expect(t.store.getState().run?.to).toBe(0);
    fireEvent.pointerMove(t.grid, { ...mouse, ...at(1) });
    fireEvent.pointerUp(t.grid, { ...mouse, ...at(1) });
    expect(t.onCommit).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'unmark', kind: 'paint' }),
    );
  });

  it('Tap sets a date: the release opens one picker', () => {
    const t = setup(['', '', ''], 'date');
    fireEvent.pointerDown(t.buttons[0]!, { ...mouse, ...at(0) });
    fireEvent.pointerMove(t.grid, { ...mouse, ...at(2) });
    fireEvent.pointerUp(t.grid, { ...mouse, ...at(2) });
    expect(t.onCommit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'picker', what: 'S03E01–S03E03' }),
    );
  });

  it('touch: a vertical move scrolls, a long press starts a run', () => {
    vi.useFakeTimers();
    const store: SheetUiStore = createSheetUi();
    const t = setup(['', '', ''], 'mark', store);
    const touch = {
      button: 0,
      buttons: 1,
      isPrimary: true,
      pointerId: 2,
      pointerType: 'touch',
    } as const;
    fireEvent.pointerDown(t.buttons[0]!, { ...touch, ...at(0) });
    fireEvent.pointerMove(t.grid, { ...touch, clientX: 30, clientY: 40 });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(store.getState().run).toBeNull();

    fireEvent.pointerDown(t.buttons[0]!, { ...touch, ...at(0) });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(store.getState().run?.from).toBe(0);
    fireEvent.pointerMove(t.grid, { ...touch, ...at(1) });
    fireEvent.pointerUp(t.grid, { ...touch, ...at(1) });
    expect(t.onCommit).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'mark', kind: 'paint' }),
    );
  });
});
