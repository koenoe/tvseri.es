import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as socialGET } from './[username]/social/[type]/route';
import { GET as watchedGET } from './[username]/watched/route';

const getViewer = vi.fn();
const resolveProfileUser = vi.fn();
const loadHistoryPage = vi.fn();
const loadFollowPage = vi.fn();

vi.mock('@/auth/viewer', () => ({
  getViewer: (...args: unknown[]) => getViewer(...args),
}));
vi.mock('@/lib/profile/user', () => ({
  resolveProfileUser: (...args: unknown[]) => resolveProfileUser(...args),
}));
vi.mock('@/lib/profile/pages', () => ({
  loadFollowPage: (...args: unknown[]) => loadFollowPage(...args),
  loadHistoryPage: (...args: unknown[]) => loadHistoryPage(...args),
}));

const PAGE = { items: [{ id: 1 }], nextCursor: 'next' };
const request = (path: string) => new NextRequest(`http://localhost${path}`);
const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});

beforeEach(() => {
  getViewer.mockResolvedValue({ accessToken: 'token', id: 'v1', role: 'user' });
  resolveProfileUser.mockResolvedValue({
    isOwner: false,
    user: { id: 'u1', username: 'juno' },
  });
  for (const load of [loadHistoryPage, loadFollowPage]) {
    load.mockReset().mockResolvedValue(PAGE);
  }
});

describe('/api/u/:username/*', () => {
  it('answers 401 signed out, privately, without reading anything', async () => {
    getViewer.mockResolvedValue(null);
    const response = await watchedGET(
      request('/api/u/juno/watched'),
      params({ username: 'juno' }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(loadHistoryPage).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown profile', async () => {
    resolveProfileUser.mockResolvedValue(null);
    const response = await watchedGET(
      request('/api/u/nobody/watched'),
      params({ username: 'nobody' }),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('refuses follow types that do not exist', async () => {
    const social = await socialGET(
      request('/api/u/juno/social/fans'),
      params({ type: 'fans', username: 'juno' }),
    );
    expect(social.status).toBe(400);
    expect(loadFollowPage).not.toHaveBeenCalled();
  });

  it('pages history 100 at a time and follows by type', async () => {
    await watchedGET(
      request('/api/u/juno/watched?cursor=c2'),
      params({ username: 'juno' }),
    );
    await socialGET(
      request('/api/u/juno/social/followers'),
      params({ type: 'followers', username: 'juno' }),
    );
    expect(loadHistoryPage).toHaveBeenCalledWith({
      accessToken: 'token',
      cursor: 'c2',
      limit: 100,
      userId: 'u1',
    });
    expect(loadFollowPage).toHaveBeenCalledWith('followers', {
      accessToken: 'token',
      cursor: null,
      userId: 'u1',
    });
  });
  it('answers the Circle’s next page privately', async () => {
    const response = await socialGET(
      request('/api/u/juno/social/following?cursor=c3'),
      params({ type: 'following', username: 'juno' }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(loadFollowPage).toHaveBeenCalledWith('following', {
      accessToken: 'token',
      cursor: 'c3',
      userId: 'u1',
    });
  });
});
