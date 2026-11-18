import { describe, expect, it } from 'vitest';

import { neverRepeat, plannedShows } from './neverRepeat';

const shows = (...ids: number[]) => ids.map((id) => ({ id }));

describe('plannedShows', () => {
  it('counts what a row can draw after the rows above, up to its limit', () => {
    const [, below] = neverRepeat(
      [
        { kind: 'shows', shows: shows(1, 2) },
        { kind: 'shows', shows: shows(1, 2, 3, 4) },
      ],
      20,
    );
    expect(below && plannedShows(below)).toBe(2);
    const [capped] = neverRepeat([{ kind: 'shows', shows: shows(1, 2, 3) }], 2);
    expect(capped && plannedShows(capped)).toBe(2);
  });

  it('takes the fullest tab of a switch row, and 0 for an empty row', () => {
    const [tabs, empty] = neverRepeat(
      [
        { kind: 'tabs', switchId: 's', tabs: { a: shows(1), b: shows(2, 3) } },
        { kind: 'shows', shows: [] },
      ],
      20,
    );
    expect(tabs && plannedShows(tabs)).toBe(2);
    expect(empty && plannedShows(empty)).toBe(0);
  });
});
