// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { closesSheet, dimAt, sheetOffset, swipeMovesSheet } from './sheetSwipe';

describe('sheetOffset', () => {
  it('follows the finger 1:1 down', () => {
    expect(sheetOffset(0)).toBe(0);
    expect(sheetOffset(120)).toBe(120);
  });

  it('rubber-bands up: nothing at first, then less and less', () => {
    expect(sheetOffset(-5)).toBe(-0);
    const at40 = sheetOffset(-40);
    const at200 = sheetOffset(-200);
    expect(at40).toBeLessThan(0);
    expect(at40).toBeGreaterThan(-40);
    expect(at200).toBeLessThan(at40);
    expect(at200 - at40).toBeGreaterThan(-160);
  });
});

describe('dimAt', () => {
  it('fades the dim with the drag, never past its ends', () => {
    expect(dimAt(0, 400)).toBe(1);
    expect(dimAt(100, 400)).toBe(0.75);
    expect(dimAt(500, 400)).toBe(0);
    expect(dimAt(-20, 400)).toBe(1);
    expect(dimAt(10, 0)).toBe(1);
  });
});

describe('closesSheet', () => {
  const height = 400;

  it('closes past a quarter of the height, however slowly', () => {
    expect(closesSheet({ dy: 100, elapsedMs: 2000, height })).toBe(true);
    expect(closesSheet({ dy: 99, elapsedMs: 2000, height })).toBe(false);
  });

  it('closes on a flick faster than 0.4 px/ms', () => {
    expect(closesSheet({ dy: 50, elapsedMs: 100, height })).toBe(true);
    expect(closesSheet({ dy: 40, elapsedMs: 100, height })).toBe(false);
  });

  it('never closes on a swipe that ends above where it started', () => {
    expect(closesSheet({ dy: 0, elapsedMs: 1, height })).toBe(false);
    expect(closesSheet({ dy: -300, elapsedMs: 50, height })).toBe(false);
  });
});

describe('swipeMovesSheet', () => {
  function sheet() {
    const dialog = document.createElement('dialog');
    const panel = document.createElement('div');
    const list = document.createElement('div');
    const row = document.createElement('button');
    list.append(row);
    panel.append(list);
    dialog.append(panel);
    document.body.append(dialog);
    return { list, panel, row };
  }

  it('moves from anywhere while nothing is scrolled', () => {
    const { panel, row } = sheet();
    expect(swipeMovesSheet(row, panel)).toBe(true);
    expect(swipeMovesSheet(panel, panel)).toBe(true);
  });

  it('leaves a scrolled list to scroll back up', () => {
    const { list, panel, row } = sheet();
    list.scrollTop = 40;
    expect(swipeMovesSheet(row, panel)).toBe(false);
  });

  it('leaves selects and parts with their own drag alone', () => {
    const { list, panel, row } = sheet();
    list.dataset.noSheetSwipe = '';
    expect(swipeMovesSheet(row, panel)).toBe(false);
    const select = document.createElement('select');
    panel.append(select);
    expect(swipeMovesSheet(select, panel)).toBe(false);
  });

  it('leaves a dialog opened over the sheet to itself', () => {
    const { panel } = sheet();
    const picker = document.createElement('dialog');
    const day = document.createElement('button');
    picker.append(day);
    panel.append(picker);
    expect(swipeMovesSheet(day, panel)).toBe(false);
  });

  it('ignores presses outside the panel', () => {
    const { panel } = sheet();
    expect(swipeMovesSheet(document.body, panel)).toBe(false);
    expect(swipeMovesSheet(null, panel)).toBe(false);
  });
});
