import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const getViewer = vi.fn();
const resolveProfileUser = vi.fn();
const loadHistoryPage = vi.fn();

vi.mock('@/auth/viewer', () => ({
  getViewer: (...args: unknown[]) => getViewer(...args),
}));
vi.mock('@/lib/profile/user', () => ({
  resolveProfileUser: (...args: unknown[]) => resolveProfileUser(...args),
}));
const loadNewerMonth = vi.fn();
vi.mock('@/lib/profile/pages', () => ({
  loadHistoryPage: (...args: unknown[]) => loadHistoryPage(...args),
}));
const loadHistoryTimeZone = vi.fn();
vi.mock('@/app/(site)/u/[username]/(profile)/history/_data/history', () => ({
  loadHistoryTimeZone: (...args: unknown[]) => loadHistoryTimeZone(...args),
  loadNewerMonth: (...args: unknown[]) => loadNewerMonth(...args),
}));

const PAGE = { items: [], nextCursor: 'next' };
const get = (query: string) =>
  GET(new NextRequest(`http://localhost/api/u/juno/watched${query}`), {
    params: Promise.resolve({ username: 'juno' }),
  });

beforeEach(() => {
  getViewer.mockResolvedValue({ accessToken: 'token', id: 'v1', role: 'user' });
  resolveProfileUser.mockResolvedValue({
    isOwner: false,
    user: { id: 'u1', username: 'juno' },
  });
  loadHistoryPage.mockReset().mockResolvedValue(PAGE);
  loadHistoryTimeZone.mockReset().mockResolvedValue('UTC');
  loadNewerMonth
    .mockReset()
    .mockResolvedValue({ items: [], nextCursor: null, prevCursor: '2024-05' });
});

describe('/api/u/:username/watched: the History diary pages', () => {
  it('a jumped list (`month`) reads everything up to the end of that month, on every page', async () => {
    const response = await get('?month=2024-03&cursor=c2');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(loadHistoryPage).toHaveBeenCalledWith({
      accessToken: 'token',
      cursor: 'c2',
      endDate: '2024-03-31T23:59:59.999Z',
      limit: 100,
      startDate: '2000-01-01T00:00:00.000Z',
      userId: 'u1',
    });
  });

  it('ends a jump at the month’s end in the owner’s zone', async () => {
    loadHistoryTimeZone.mockResolvedValue('Europe/London');
    await get('?month=2025-04');
    expect(loadHistoryTimeZone).toHaveBeenCalledWith('u1');
    expect(loadHistoryPage).toHaveBeenCalledWith(
      expect.objectContaining({ endDate: '2025-04-30T22:59:59.999Z' }),
    );
  });

  it('"Newer" (`within`) reads that whole month, the month above as prevCursor, over `month`', async () => {
    const response = await get('?month=2024-03&within=2024-04');
    expect(await response.json()).toEqual({
      items: [],
      nextCursor: null,
      prevCursor: '2024-05',
    });
    expect(loadNewerMonth).toHaveBeenCalledWith(
      { accessToken: 'token', userId: 'u1' },
      '2024-04',
    );
    expect(loadHistoryPage).not.toHaveBeenCalled();
  });

  it('without either it pages the whole history', async () => {
    await get('?cursor=c3');
    expect(loadHistoryPage).toHaveBeenCalledWith({
      accessToken: 'token',
      cursor: 'c3',
      limit: 100,
      userId: 'u1',
    });
    expect(loadHistoryPage.mock.calls[0]?.[0]).not.toHaveProperty('startDate');
  });

  it('refuses a malformed month without reading', async () => {
    for (const query of [
      '?month=2024-13',
      '?within=March',
      '?month=1999-12',
      '?month=2024-03&within=2024-4',
    ]) {
      const response = await get(query);
      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(loadHistoryPage).not.toHaveBeenCalled();
    expect(loadNewerMonth).not.toHaveBeenCalled();
  });
});
