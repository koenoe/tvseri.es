import { describe, expect, it } from 'vitest';

import { followersPk, followingPk, followPk } from './keys';

// Stored items keep the format they were written with: these strings must
// never change
describe('Follow table keys', () => {
  it('builds the follow item key', () => {
    expect(followPk('01JA', '01JB')).toBe('FOLLOW#01JA#01JB');
  });

  it('builds the gsi1 and gsi2 keys', () => {
    expect(followersPk('01JA')).toBe('USER#01JA#FOLLOWERS');
    expect(followingPk('01JA')).toBe('USER#01JA#FOLLOWING');
  });
});
