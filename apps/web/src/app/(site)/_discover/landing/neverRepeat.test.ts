import { describe, expect, it } from 'vitest';

import {
  idsOf,
  neverRepeat,
  type PlannedRow,
  type PressedTabs,
  visibleShows,
  withoutShown,
} from './neverRepeat';

const shows = (...list: number[]) => list.map((id) => ({ id }));

const visible = (
  row: PlannedRow<{ id: number }> | undefined,
  pressed: PressedTabs,
  limit = 3,
) => {
  if (!row) {
    throw new Error('no row');
  }
  const list =
    row.kind === 'shows'
      ? row.shows
      : (row.tabs[pressed[row.switchId] ?? Object.keys(row.tabs)[0] ?? ''] ??
        []);
  return visibleShows(list, row.drops, pressed, limit).map((show) => show.id);
};

describe('neverRepeat', () => {
  it('drops the shows of every row above, and refills from the rest', () => {
    const [trending, start, fresh] = neverRepeat(
      [
        { kind: 'shows', shows: shows(1, 2, 3) },
        { kind: 'shows', shows: shows(3, 4, 5) },
        { kind: 'shows', shows: shows(1, 4, 6, 7, 8) },
      ],
      3,
    );
    expect(visible(trending, {})).toEqual([1, 2, 3]);
    expect(visible(start, {})).toEqual([4, 5]);
    expect(visible(fresh, {})).toEqual([6, 7, 8]);
  });

  it('keeps a show a list names twice once, in every row and tab', () => {
    const [row, tabbed] = neverRepeat(
      [
        { kind: 'shows', shows: shows(1, 2, 1, 3, 2) },
        {
          kind: 'tabs',
          switchId: 'kind',
          tabs: { a: shows(4, 4, 5), b: shows(6, 6) },
        },
      ],
      5,
    );
    expect(visible(row, {})).toEqual([1, 2, 3]);
    expect(visible(tabbed, { kind: 'a' })).toEqual([4, 5]);
    expect(visible(tabbed, { kind: 'b' })).toEqual([6]);
  });

  it('only counts what a row draws (its first `limit` shows) as shown', () => {
    const [top, below] = neverRepeat(
      [
        { kind: 'shows', shows: shows(1, 2, 3, 4) },
        { kind: 'shows', shows: shows(4, 5) },
      ],
      3,
    );
    expect(visible(top, {})).toEqual([1, 2, 3]);
    expect(visible(below, {})).toEqual([4, 5]);
  });

  it('drops per tab below a switch, in every tab state (Crime by kind → New in crime)', () => {
    const rows = neverRepeat(
      [
        { kind: 'shows', shows: shows(1, 2) },
        {
          kind: 'tabs',
          switchId: 'kind',
          tabs: {
            detective: shows(2, 10, 11),
            killer: shows(12, 13, 1),
          },
        },
        { kind: 'shows', shows: shows(10, 12, 20, 21, 1) },
      ],
      3,
    );
    const [, kind, fresh] = rows;
    expect(visible(kind, { kind: 'detective' })).toEqual([10, 11]);
    expect(visible(kind, { kind: 'killer' })).toEqual([12, 13]);
    expect(visible(fresh, { kind: 'detective' })).toEqual([12, 20, 21]);
    expect(visible(fresh, { kind: 'killer' })).toEqual([10, 20, 21]);
    // no tab pressed yet: the first tab's drops
    expect(visible(fresh, {})).toEqual([12, 20, 21]);
  });

  it('carries per-tab drops through a row below the switch', () => {
    const [, , middle, last] = neverRepeat(
      [
        { kind: 'shows', shows: shows(1) },
        { kind: 'tabs', switchId: 'kind', tabs: { a: shows(2), b: shows(3) } },
        { kind: 'shows', shows: shows(2, 3, 4) },
        { kind: 'shows', shows: shows(2, 3, 4, 5) },
      ],
      2,
    );
    expect(visible(middle, { kind: 'a' }, 2)).toEqual([3, 4]);
    expect(visible(last, { kind: 'a' }, 2)).toEqual([5]);
    expect(visible(middle, { kind: 'b' }, 2)).toEqual([2, 4]);
    expect(visible(last, { kind: 'b' }, 2)).toEqual([5]);
  });

  it('never repeats below two switches (drops the union)', () => {
    const [, , last] = neverRepeat(
      [
        { kind: 'tabs', switchId: 's1', tabs: { a: shows(1), b: shows(2) } },
        { kind: 'tabs', switchId: 's2', tabs: { c: shows(3), d: shows(4) } },
        { kind: 'shows', shows: shows(1, 2, 3, 4, 5) },
      ],
      5,
    );
    expect(visible(last, { s1: 'b', s2: 'c' }, 5)).toEqual([1, 4, 5]);
  });
});

describe('neverRepeat with a minimum (3 posters or more)', () => {
  it('leaves out a row with fewer than the minimum after the rows above, and drops none of its shows below', () => {
    const [top, thin, below] = neverRepeat(
      [
        { kind: 'shows', shows: shows(1, 2, 3) },
        // 3 and 1 are above: two left, under the minimum
        { kind: 'shows', shows: shows(3, 1, 4, 5) },
        { kind: 'shows', shows: shows(4, 5, 6) },
      ],
      20,
      3,
    );
    expect(visible(top, {}, 20)).toEqual([1, 2, 3]);
    expect(thin?.kind === 'shows' && thin.shows).toEqual([]);
    // the row that was left out drops nothing: 4 and 5 show here
    expect(visible(below, {}, 20)).toEqual([4, 5, 6]);
  });

  it('leaves out the tabs of a switch with fewer than the minimum, and the row with none left', () => {
    const [, kinds, none, below] = neverRepeat(
      [
        { kind: 'shows', shows: shows(1, 2, 3) },
        {
          kind: 'tabs',
          switchId: 'kind',
          tabs: { full: shows(4, 5, 6), thin: shows(1, 7, 8) },
        },
        { kind: 'tabs', switchId: 'other', tabs: { a: shows(9), b: shows() } },
        { kind: 'shows', shows: shows(7, 8, 9, 10) },
      ],
      20,
      3,
    );
    expect(kinds?.kind === 'tabs' && Object.keys(kinds.tabs)).toEqual(['full']);
    expect(none?.kind === 'tabs' && Object.keys(none.tabs)).toEqual([]);
    // the thin tab and the empty switch drop nothing below
    expect(visible(below, {}, 20)).toEqual([7, 8, 9, 10]);
  });

  it('keeps a one-show block (a spotlight) whatever the minimum, and its show stays dropped below', () => {
    const [spotlight, row] = neverRepeat(
      [
        { kind: 'shows', limit: 1, shows: shows(1), single: true },
        { kind: 'shows', shows: shows(1, 2, 3, 4) },
      ],
      20,
      3,
    );
    expect(visible(spotlight, {}, 1)).toEqual([1]);
    expect(visible(row, {}, 20)).toEqual([2, 3, 4]);
  });

  it('counts only what a short block draws: two picks are under the minimum', () => {
    const [start, row] = neverRepeat(
      [
        { kind: 'shows', limit: 2, shows: shows(1, 2) },
        { kind: 'shows', shows: shows(1, 2, 3) },
      ],
      20,
      3,
    );
    expect(start?.kind === 'shows' && start.shows).toEqual([]);
    expect(visible(row, {}, 20)).toEqual([1, 2, 3]);
  });
});

const titled = (id: number) => ({ id, title: `Show ${id}` });

describe('withoutShown', () => {
  it('drops the shows the section above already shows, keeping the order', () => {
    const above = idsOf([titled(2), titled(4)]);
    expect(
      withoutShown([titled(1), titled(2), titled(3), titled(4)], above),
    ).toEqual([titled(1), titled(3)]);
  });

  it('keeps everything when nothing is shown above', () => {
    expect(withoutShown([titled(1)], new Set())).toEqual([titled(1)]);
  });
});

describe('idsOf', () => {
  it('collects ids from several lists', () => {
    expect([...idsOf([titled(1)], [titled(2), titled(1)])].sort()).toEqual([
      1, 2,
    ]);
  });
});
