import { describe, expect, it } from 'vitest';

import { compatibilityLead, proofParts, separatorBefore } from './matchCopy';

describe('copy', () => {
  it('leads with the level or says there is not enough', () => {
    expect(compatibilityLead('juno', true)).toBe('Your compatibility');
    expect(compatibilityLead('noor', false)).toBe(
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
