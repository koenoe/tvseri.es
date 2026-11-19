import { describe, expect, it } from 'vitest';

import { canSyncNow } from './connection-sync-policy';

describe('canSyncNow', () => {
  it('lets anyone run the first sync, and only admins after it', () => {
    expect(canSyncNow('user', null)).toBe(true);
    expect(canSyncNow(undefined, null)).toBe(true);
    expect(canSyncNow('user', 1)).toBe(false);
    expect(canSyncNow('admin', 1)).toBe(true);
  });
});
