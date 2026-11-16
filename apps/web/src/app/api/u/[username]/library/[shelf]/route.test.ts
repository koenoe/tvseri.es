import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { GET } from './route';

const getViewer = vi.fn();
const resolveProfileUser = vi.fn();
const loadShelfPage = vi.fn();

vi.mock('@/auth/viewer', () => ({
  getViewer: (...args: unknown[]) => getViewer(...args),
}));
vi.mock('@/lib/profile/user', () => ({
  resolveProfileUser: (...args: unknown[]) => resolveProfileUser(...args),
}));
vi.mock('@/app/(site)/u/[username]/(profile)/library/_data/library', () => ({
  loadShelfPage: (...args: unknown[]) => loadShelfPage(...args),
}));

const PAGE = {
  before: 0,
  filters: null,
  items: [{ id: 1, title: 'The Bear' }],
  letters: ['t'],
  nextCursor: 'n2',
  prevCursor: null,
  total: 30,
};

const get = (path: string, shelf: string, username = 'juno') =>
  GET(new NextRequest(`http://localhost${path}`), {
    params: Promise.resolve({ shelf, username }),
  });

beforeEach(() => {
  getViewer.mockResolvedValue({ accessToken: 'token', id: 'v1', role: 'user' });
  resolveProfileUser.mockResolvedValue({
    isOwner: false,
    user: { id: 'u1', username: 'juno' },
  });
  loadShelfPage.mockReset().mockResolvedValue(PAGE);
});

describe('/api/u/:username/library/:shelf', () => {
  it('answers 401 signed out, privately, without reading', async () => {
    getViewer.mockResolvedValue(null);
    const response = await get('/api/u/juno/library/watchlist', 'watchlist');
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(loadShelfPage).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown profile or shelf', async () => {
    expect((await get('/api/u/juno/library/junk', 'junk')).status).toBe(404);
    resolveProfileUser.mockResolvedValue(null);
    expect(
      (await get('/api/u/nobody/library/watchlist', 'watchlist', 'nobody'))
        .status,
    ).toBe(404);
    expect(loadShelfPage).not.toHaveBeenCalled();
  });

  it('keeps Hidden to its owner', async () => {
    expect((await get('/api/u/juno/library/hidden', 'hidden')).status).toBe(
      404,
    );
    getViewer.mockResolvedValue({ accessToken: 'token', id: 'u1' });
    expect((await get('/api/u/juno/library/hidden', 'hidden')).status).toBe(
      200,
    );
  });

  it('answers 400 for cursor and before together', async () => {
    const response = await get(
      '/api/u/juno/library/watchlist?cursor=a&before=b',
      'watchlist',
    );
    expect(response.status).toBe(400);
  });

  it('reads the next page with the page’s own query, privately', async () => {
    const response = await get(
      '/api/u/juno/library/finished?sort=az&from=p&q=the&with=new&cursor=c1',
      'finished',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual(PAGE);
    expect(loadShelfPage).toHaveBeenCalledWith(
      { accessToken: 'token', userId: 'u1' },
      { from: 'p', q: 'the', shelf: 'finished', sort: 'az', with: 'new' },
      { before: undefined, cursor: 'c1' },
    );
  });

  it('drops what the URL can’t mean, like the page', async () => {
    getViewer.mockResolvedValue({ accessToken: 'token', id: 'u1' });
    await get(
      '/api/u/juno/library/watchlist?sort=left&with=new&before=b1',
      'watchlist',
    );
    expect(loadShelfPage).toHaveBeenCalledWith(
      expect.anything(),
      { from: null, q: '', shelf: 'watchlist', sort: 'newest', with: null },
      { before: 'b1', cursor: undefined },
    );
  });

  it('passes the API’s AccountGone through, not as a 4xx of the shelf', async () => {
    loadShelfPage.mockRejectedValue(new ApiError(401, 'AccountGone'));
    const response = await get('/api/u/juno/library/watchlist', 'watchlist');
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'AccountGone' });
  });

  it('passes on the API’s 4xx, a 403 as a 404', async () => {
    loadShelfPage.mockRejectedValue(new ApiError(403));
    expect(
      (await get('/api/u/juno/library/watchlist', 'watchlist')).status,
    ).toBe(404);
    loadShelfPage.mockRejectedValue(new ApiError(400, 'bad cursor'));
    expect(
      (await get('/api/u/juno/library/watchlist?cursor=x', 'watchlist')).status,
    ).toBe(400);
  });
});
