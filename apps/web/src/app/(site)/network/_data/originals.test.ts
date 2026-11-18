import { describe, expect, it } from 'vitest';

import { originalsLine } from './originals';

const originals = (found: number, scanned: number, exact: boolean) => ({
  exact,
  found,
  items: [],
  scanned,
});

describe('originalsLine', () => {
  it('scales a sample and says "about" (HBO: 107 of the 120 scanned)', () => {
    expect(originalsLine(originals(107, 120, false), 381, 'HBO')).toBe(
      'First aired on HBO: about 340 of its 381 series',
    );
  });

  it('rounds big estimates to the hundred', () => {
    expect(originalsLine(originals(52, 120, false), 2939, 'Netflix')).toBe(
      'First aired on Netflix: about 1,300 of its 2,939 series',
    );
  });

  it('says "all" when every show was scanned and is an original', () => {
    expect(originalsLine(originals(244, 244, true), 244, 'Apple TV')).toBe(
      'All 244 of its series first aired on Apple TV',
    );
  });

  it('gives the exact number when every show was scanned', () => {
    expect(originalsLine(originals(30, 41, true), 41, 'DR2')).toBe(
      'First aired on DR2: 30 of its 41 series',
    );
  });

  it('never claims more than it has, nor fewer than it found', () => {
    expect(originalsLine(originals(119, 120, false), 381, 'HBO')).toBe(
      'First aired on HBO: almost all of its 381 series',
    );
    expect(originalsLine(originals(9, 10, false), 120, 'X')).toBe(
      'First aired on X: about 110 of its 120 series',
    );
    expect(originalsLine(originals(2, 120, false), 900, 'X')).toBe(
      'First aired on X: about 20 of its 900 series',
    );
  });

  it('is null without originals (the row is left out)', () => {
    expect(originalsLine(originals(0, 120, false), 381, 'HBO')).toBeNull();
  });
});
