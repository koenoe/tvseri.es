import { describe, expect, it } from 'vitest';

import { pickReasonKeyword } from './picks';

describe('pickReasonKeyword', () => {
  it('skips a keyword that reads badly as a reason', () => {
    expect(
      pickReasonKeyword([
        { id: 1, name: 'rape' },
        { id: 2, name: 'courtroom' },
      ]),
    ).toEqual({ id: 2, name: 'courtroom' });
  });

  it('keeps the first keyword otherwise', () => {
    expect(pickReasonKeyword([{ id: 3, name: 'heist' }])).toEqual({
      id: 3,
      name: 'heist',
    });
  });
});
