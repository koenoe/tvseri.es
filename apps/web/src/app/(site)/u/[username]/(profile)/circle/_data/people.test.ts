import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Profile } from '../../_data/profile';
import { loadCirclePeople, loadVisitorCircle } from './people';

const apiFetch = vi.fn();
const loadFollowPage = vi.fn();

vi.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));
vi.mock('@/lib/profile/pages', () => ({
  loadFollowPage: (...args: unknown[]) => loadFollowPage(...args),
}));

const owner = {
  accessToken: 'token',
  user: { id: 'u-alex', username: 'alex' },
  viewer: 'owner',
  viewerId: 'u-alex',
} as unknown as Profile;

const visitor = {
  ...owner,
  user: { id: 'u-edw1n', username: 'edw1n' },
  viewer: 'visitor',
} as unknown as Profile;

beforeEach(() => {
  apiFetch.mockReset();
  loadFollowPage.mockReset();
});

describe('the Circle loaders', () => {
  it('read your own circle in one call, with your token', async () => {
    const people = {
      capped: false,
      followerCount: 6,
      followers: [],
      following: [],
      followingCount: 8,
    };
    apiFetch.mockResolvedValue(people);
    await expect(loadCirclePeople(owner)).resolves.toBe(people);
    expect(apiFetch).toHaveBeenCalledWith('/me/circle/people', {
      accessToken: 'token',
    });
  });

  it('read a visitor’s two lists with what each person is watching', async () => {
    const following = { items: [], nextCursor: 'f2' };
    const followers = { items: [], nextCursor: null };
    loadFollowPage.mockImplementation((type: string) =>
      Promise.resolve(type === 'following' ? following : followers),
    );
    await expect(loadVisitorCircle(visitor)).resolves.toEqual({
      followers,
      following,
    });
    const read = { accessToken: 'token', userId: 'u-edw1n' };
    expect(loadFollowPage).toHaveBeenCalledWith('following', read);
    expect(loadFollowPage).toHaveBeenCalledWith('followers', read);
  });
});
