// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AnimatePresence } from 'motion/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useStore } from 'zustand';

import MotionProvider from '@/components/motion/MotionProvider';

import { createSelectionStore, type SelectionStore } from '../_lib/selection';
import { SHELVES } from '../_lib/shelves';
import ActionBar, { SelectionStatus } from './ActionBar';
import { TileContext } from './tileContext';
import { SELECT_PILL } from './toolbarStyles';

const watchlistAction = () => {
  const action = SHELVES.watchlist.action;
  if (!action) {
    throw new Error('Watchlist has an action');
  }
  return action;
};
const ACTION = watchlistAction();
const pill = { [SELECT_PILL]: '' };
const noop = () => {};

let store: SelectionStore | null = null;
const selection = () => {
  if (!store) {
    throw new Error('rendered');
  }
  return store;
};

/**
 * The shelf as LibraryView draws it: the toolbar with Select, the selection's
 * status and the bar while selecting. The action can take the last tile, and
 * Select with it (`emptied`).
 */
function Shelf({ emptied = false }: Readonly<{ emptied?: boolean }>) {
  const [own] = useState(createSelectionStore);
  store = own;
  const selecting = useStore(own, (state) => state.selecting);
  const [empty, setEmpty] = useState(false);
  const toolbar = useRef<HTMLDivElement>(null);
  const context = useMemo(
    () => ({
      leave: noop,
      longPress: noop,
      owner: true,
      pick: noop,
      selection: own,
      shelf: 'watchlist' as const,
    }),
    [own],
  );
  const start = useCallback(() => own.getState().start(), [own]);
  const stop = useCallback(() => own.getState().stop(), [own]);
  const act = useCallback(() => {
    own.getState().stop();
    setEmpty(emptied);
  }, [emptied, own]);
  return (
    <MotionProvider>
      <TileContext value={context}>
        <div ref={toolbar}>
          <button type="button">Sort</button>
          {empty ? null : (
            <button {...pill} onClick={start} type="button">
              Select
            </button>
          )}
        </div>
        <SelectionStatus selection={own} />
        <AnimatePresence>
          {selecting ? (
            <ActionBar
              action={ACTION}
              key="bar"
              onAct={act}
              onCancel={stop}
              returnFocusTo={toolbar}
            />
          ) : null}
        </AnimatePresence>
      </TileContext>
    </MotionProvider>
  );
}

/** The action names itself twice (the phone's short name is only hidden by CSS) */
const actionButton = () =>
  screen.getByRole('button', { name: new RegExp(`^${ACTION.label}`) });
const startSelecting = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Select' }));
const pick = (id: number) => act(() => void selection().getState().toggle(id));

describe('the select bar leaving', () => {
  it('hands focus on its Cancel back to Select', () => {
    render(<Shelf />);
    startSelecting();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    act(() => cancel.focus());
    fireEvent.click(cancel);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Select' }),
    );
  });

  it('hands focus on its action back to Select', () => {
    render(<Shelf />);
    startSelecting();
    pick(1);
    const action = actionButton();
    act(() => action.focus());
    fireEvent.click(action);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Select' }),
    );
  });

  it('hands focus to the toolbar’s first control when the action took Select too', () => {
    render(<Shelf emptied />);
    startSelecting();
    pick(1);
    const action = actionButton();
    act(() => action.focus());
    fireEvent.click(action);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Sort' }),
    );
  });

  it('leaves focus that is elsewhere where it is', () => {
    render(<Shelf />);
    startSelecting();
    const sort = screen.getByRole('button', { name: 'Sort' });
    act(() => sort.focus());
    act(() => selection().getState().stop());
    expect(document.activeElement).toBe(sort);
  });
});

describe('the selection’s status', () => {
  it('is one region, there before the first pick, that speaks each count', () => {
    render(<Shelf />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    startSelecting();
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('');
    pick(1);
    expect(status.textContent).toBe('1 series selected');
    pick(2);
    expect(status.textContent).toBe('2 series selected');
    pick(1);
    pick(2);
    expect(status.textContent).toBe('');
    pick(3);
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('1 series selected');
  });

  it('is the only place a screen reader reads the count from', () => {
    render(<Shelf />);
    startSelecting();
    pick(1);
    const status = screen.getByRole('status');
    const live = document.querySelectorAll('[aria-live], [role="status"]');
    expect(Array.from(live)).toEqual([status]);
    for (const shown of screen.getAllByText(/selected$/)) {
      expect(
        status.contains(shown) || shown.closest('[aria-hidden="true"]'),
      ).toBeTruthy();
    }
  });
});
