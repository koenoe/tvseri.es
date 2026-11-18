import { describe, expect, it } from 'vitest';

import { createSelectionStore, rangeBetween, SELECT_MAX } from './selection';

const ORDER = [10, 11, 12, 13, 14, 15];

describe('rangeBetween', () => {
  it('runs from the anchor to the click, in list order, both ways', () => {
    expect(rangeBetween(ORDER, 11, 13)).toEqual([11, 12, 13]);
    expect(rangeBetween(ORDER, 14, 12)).toEqual([12, 13, 14]);
  });

  it('is the click alone without an anchor on the list', () => {
    expect(rangeBetween(ORDER, null, 12)).toEqual([12]);
    expect(rangeBetween(ORDER, 99, 12)).toEqual([12]);
  });
});

describe('the selection store', () => {
  it('toggles a tile and remembers it as the anchor', () => {
    const store = createSelectionStore();
    store.getState().start();
    expect(store.getState().toggle(11)).toBe('added');
    expect(store.getState().toggle(12)).toBe('added');
    expect(store.getState().toggle(11)).toBe('removed');
    expect([...store.getState().selected]).toEqual([12]);
    expect(store.getState().anchor).toBe(11);
  });

  it('adds a Shift run from the anchor, either direction', () => {
    const store = createSelectionStore();
    store.getState().start();
    store.getState().toggle(10);
    store.getState().toggle(12, { order: ORDER, range: true });
    expect([...store.getState().selected].sort()).toEqual([10, 11, 12]);
    store.getState().toggle(15);
    store.getState().toggle(13, { order: ORDER, range: true });
    expect([...store.getState().selected].sort()).toEqual([
      10, 11, 12, 13, 14, 15,
    ]);
  });

  it('refuses the 51st show', () => {
    const store = createSelectionStore();
    store.getState().start();
    for (let id = 1; id <= SELECT_MAX; id++) {
      store.getState().toggle(id);
    }
    expect(store.getState().toggle(SELECT_MAX + 1)).toBe('capped');
    expect(store.getState().selected.size).toBe(SELECT_MAX);
    // a run past the cap changes nothing
    const order = Array.from({ length: 60 }, (_, index) => index + 1);
    store.getState().toggle(1);
    expect(store.getState().toggle(60, { order, range: true })).toBe('capped');
    expect(store.getState().selected.size).toBe(SELECT_MAX - 1);
  });

  it('clears on stop, and forgets tiles that left', () => {
    const store = createSelectionStore();
    store.getState().start();
    store.getState().toggle(10);
    store.getState().toggle(11);
    store.getState().forget([10]);
    expect([...store.getState().selected]).toEqual([11]);
    store.getState().stop();
    expect(store.getState().selecting).toBe(false);
    expect(store.getState().selected.size).toBe(0);
  });
});
