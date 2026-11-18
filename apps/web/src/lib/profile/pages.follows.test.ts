import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadFollowPage } from './pages';

const apiFetch = vi.fn();

vi.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const READ = { accessToken: 'token', cursor: 'c1', userId: 'u1' } as const;

const row = {
  // fields the API sends that no list draws
  createdAt: 1,
  followerCount: 6,
  followingCount: 8,
  id: 'u2',
  isFollower: true,
  isFollowing: false,
  isMe: false,
  username: 'wren',
};

beforeEach(() => {
  apiFetch.mockReset();
});

describe('loadFollowPage', () => {
  it('keeps a row without a show as watching nothing', async () => {
    apiFetch.mockResolvedValue({ items: [row], nextCursor: null });
    const page = await loadFollowPage('followers', READ);
    expect(apiFetch).toHaveBeenCalledWith('/user/:id/followers', {
      accessToken: 'token',
      params: { id: 'u1' },
      query: { cursor: 'c1', include: 'watching', limit: 24 },
    });
    expect(page.items[0]).toEqual({
      followerCount: 6,
      followingCount: 8,
      id: 'u2',
      isFollower: true,
      isFollowing: false,
      isMe: false,
      username: 'wren',
      watching: null,
    });
  });

  it('reads 24 a page (the API’s cap with watching) and keeps each row’s show', async () => {
    const watching = { seriesId: 1396, slug: 'the-bear', title: 'The Bear' };
    apiFetch.mockResolvedValue({
      items: [{ ...row, watching }],
      nextCursor: 'c2',
    });
    const page = await loadFollowPage('following', { ...READ, limit: 50 });
    expect(apiFetch).toHaveBeenCalledWith('/user/:id/following', {
      accessToken: 'token',
      params: { id: 'u1' },
      query: { cursor: 'c1', include: 'watching', limit: 24 },
    });
    expect(page).toEqual({
      items: [expect.objectContaining({ username: 'wren', watching })],
      nextCursor: 'c2',
    });
  });
});
