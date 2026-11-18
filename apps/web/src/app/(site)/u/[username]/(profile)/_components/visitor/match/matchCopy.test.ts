import { describe, expect, it } from 'vitest';

import {
  arcDash,
  levelLine,
  proofParts,
  ringLabel,
  separatorBefore,
} from './matchCopy';

describe('arcDash', () => {
  it('fills the ring to the arc, clamped', () => {
    expect(arcDash(92, 'super')).toBe('92 100');
    expect(arcDash(140, 'super')).toBe('100 100');
    expect(arcDash(-3, 'low')).toBe('0 100');
  });

  it('is an empty ring without a level', () => {
    expect(arcDash(60, null)).toBe('0 100');
  });
});

describe('copy', () => {
  it('names the ring', () => {
    expect(ringLabel('super', 34)).toBe(
      'Compatibility: Super, 34 shared series',
    );
    expect(ringLabel(null, 1)).toBe(
      'Compatibility not known yet, 1 shared series',
    );
  });

  it('leads with the level or says there is not enough', () => {
    expect(levelLine('juno', true)).toBe('Your compatibility');
    expect(levelLine('noor', false)).toBe(
      'Not enough shared yet to match you with noor.',
    );
  });

  it('words the proof per case', () => {
    const base = { notEnough: false, sharedCount: 34 };
    expect(proofParts({ ...base, level: 'super' })).toEqual({
      after: '.',
      before: 'You both watch ',
    });
    expect(
      proofParts({ level: 'very-low', notEnough: false, sharedCount: 6 }),
    ).toEqual({
      after: '. Here’s what they’d show you.',
      before: 'Different taste: you share 6 series, like ',
    });
    expect(
      proofParts({ level: null, notEnough: true, sharedCount: 2 }).before,
    ).toBe('You share 2 series so far, under the 5 a level needs: ');
  });

  it('joins names with commas and a last and', () => {
    expect([0, 1, 2].map((index) => separatorBefore(index, 3))).toEqual([
      '',
      ', ',
      ' and ',
    ]);
    expect(separatorBefore(1, 2)).toBe(' and ');
  });
});
