import { describe, expect, it, vi } from 'vitest';

const updateTag = vi.fn();
const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag, updateTag }));
vi.mock('server-only', () => ({}));

const { expireDeletedUser, revalidateUser } = await import('./revalidateUser');

describe('revalidateUser', () => {
  it('expires the user, their stats and every username given', () => {
    revalidateUser('user-1', ['old-name', 'new-name']);
    expect(updateTag.mock.calls.map(([tag]) => tag)).toEqual([
      'user:user-1',
      'stats:user-1',
      'username:old-name',
      'username:new-name',
    ]);
  });
});

describe('expireDeletedUser', () => {
  // `updateTag` would re-render the page the delete ran on as the 401
  it('expires the same tags without updateTag', () => {
    updateTag.mockClear();
    expireDeletedUser('user-1', ['wren']);
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidateTag.mock.calls).toEqual([
      ['user:user-1', { expire: 1 }],
      ['stats:user-1', { expire: 1 }],
      ['username:wren', { expire: 1 }],
    ]);
  });
});
