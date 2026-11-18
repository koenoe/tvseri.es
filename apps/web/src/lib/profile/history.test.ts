import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadHistoryStart,
  loadHistoryYears,
  loadNewerMonth,
  loadThisWeek,
} from './history';

const loadHistoryPage = vi.fn();
/** `/stats/years` as the API answers it now */
const getYears = vi.fn();
/** The Stats page's cached copy of the same list */
const getCachedYears = vi.fn();
const getDaily = vi.fn();
const getStatsTimeZone = vi.fn();

vi.mock('@/lib/profile/pages', () => ({
  loadHistoryPage: (...args: unknown[]) => loadHistoryPage(...args),
}));
vi.mock('@/lib/stats/timeZone', () => ({
  getStatsTimeZone: (...args: unknown[]) => getStatsTimeZone(...args),
}));
vi.mock('@/lib/stats/loaders', () => ({
  getDaily: (...args: unknown[]) => getDaily(...args),
}));
vi.mock('@/lib/stats/getYears', () => ({
  getYears: (...args: unknown[]) => getCachedYears(...args),
}));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (path: string, options: unknown) =>
    path === '/user/:id/stats/years'
      ? getYears(options)
      : Promise.reject(new Error(`unexpected ${path}`)),
}));

const months = (counts: Readonly<Record<number, number>>) =>
  Array.from({ length: 12 }, (_, month) => ({
    episodes: counts[month] ?? 0,
    minutes: 0,
  }));

const READ = { accessToken: 'token', userId: 'u1' };

beforeEach(() => {
  loadHistoryPage.mockReset();
  getYears.mockReset().mockResolvedValue({
    years: [
      { episodes: 400, months: months({ 2: 300, 3: 90, 5: 10 }), year: 2024 },
    ],
  });
  getDaily.mockReset();
  getStatsTimeZone.mockReset().mockResolvedValue('Europe/London');
});

describe('loadHistoryYears: the header total and month lines', () => {
  it('agree with the diary right after a mark: read per request, not the Stats page’s 5-minute copy', async () => {
    getCachedYears.mockResolvedValue({
      undated: 0,
      years: [{ episodes: 4718, year: 2026 }],
    });
    getYears.mockResolvedValue({
      undated: 0,
      years: [{ episodes: 4719, year: 2026 }],
    });
    const years = await loadHistoryYears('u1');
    expect(years).toMatchObject({ years: [{ episodes: 4719 }] });
    expect(getYears).toHaveBeenCalledWith({ params: { id: 'u1' } });
  });

  it('is Unavailable in an outage', async () => {
    const { ApiError } = await import('@/lib/api/client');
    getYears.mockRejectedValue(new ApiError(503));
    expect(await loadHistoryYears('u1')).toEqual({ unavailable: true });
  });
});

describe('loadNewerMonth: "Newer" reads one whole month', () => {
  it('follows the month’s cursor to its end, the next newer month as prevCursor', async () => {
    getStatsTimeZone.mockResolvedValue('UTC');
    loadHistoryPage
      .mockResolvedValueOnce({ items: [1, 2], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [3, 4], nextCursor: 'c3' })
      .mockResolvedValueOnce({ items: [5], nextCursor: null });
    const page = await loadNewerMonth(READ, '2024-03');
    expect(page).toEqual({
      items: [1, 2, 3, 4, 5],
      nextCursor: null,
      prevCursor: '2024-04',
    });
    expect(loadHistoryPage).toHaveBeenNthCalledWith(3, {
      ...READ,
      cursor: 'c3',
      endDate: '2024-03-31T23:59:59.999Z',
      limit: 100,
      startDate: '2024-03-01T00:00:00.000Z',
    });
  });

  it('bounds the month at local midnight in the owner’s zone', async () => {
    getYears.mockResolvedValue({
      years: [{ episodes: 1, months: months({ 3: 1 }), year: 2025 }],
    });
    loadHistoryPage.mockResolvedValue({ items: [], nextCursor: null });
    await loadNewerMonth(READ, '2025-04');
    expect(loadHistoryPage).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: '2025-04-30T22:59:59.999Z',
        startDate: '2025-03-31T23:00:00.000Z',
      }),
    );
  });

  it('skips empty months above and stops at the newest', async () => {
    loadHistoryPage.mockResolvedValue({ items: [1], nextCursor: null });
    expect((await loadNewerMonth(READ, '2024-04')).prevCursor).toBe('2024-06');
    expect((await loadNewerMonth(READ, '2024-06')).prevCursor).toBeNull();
  });
});

describe('loadThisWeek', () => {
  it('is the owner’s local week: late Sunday in New York is still that week', async () => {
    getYears.mockResolvedValue({ timeZone: 'America/New_York', years: [] });
    getDaily.mockResolvedValue({
      days: [{ date: '2026-11-15', episodes: 2 }],
      timeZone: 'America/New_York',
    });
    // 22:30 on Sun 15 November in New York
    const week = await loadThisWeek(
      'u1',
      Date.parse('2026-11-16T03:30:00Z'),
      'America/New_York',
    );
    expect(week).toEqual({ episodes: 2, last: 'Sun 15' });
    // The zone comes from the caller: the years aren't waited on
    expect(getYears).not.toHaveBeenCalled();
  });

  it('reads the previous year’s days too when the week began in it', async () => {
    getDaily.mockImplementation((_id: string, year: number) =>
      Promise.resolve({
        days:
          year === 2026
            ? [{ date: '2026-12-29', episodes: 2 }]
            : [{ date: '2027-01-01', episodes: 1 }],
      }),
    );
    const week = await loadThisWeek(
      'u1',
      Date.parse('2027-01-02T10:00:00Z'),
      'UTC',
    );
    expect(week).toEqual({ episodes: 3, last: 'Fri 1' });
    expect(getDaily.mock.calls.map((call) => call[1])).toEqual([2027, 2026]);
  });
});

describe('loadHistoryStart: the diary doesn’t wait on /stats/years', () => {
  const NOW = Date.parse('2026-11-12T09:00:00Z');
  const diaryItem = (iso: string, seasonNumber = 1) => ({
    seasonNumber,
    watchedAt: Date.parse(iso),
  });

  it('starts the diary read before the years answer', async () => {
    let release: (value: unknown) => void = () => {};
    getYears.mockReturnValue(new Promise((resolve) => (release = resolve)));
    loadHistoryPage.mockResolvedValue({ items: [], nextCursor: null });

    const start = loadHistoryStart(READ, null, true, NOW);
    await vi.waitFor(() => expect(loadHistoryPage).toHaveBeenCalled());
    release({ timeZone: 'Europe/London', undated: 0, years: [] });

    expect(await start).toMatchObject({ timeZone: 'Europe/London' });
  });

  it('draws This week from the first page when it reaches back before Monday', async () => {
    loadHistoryPage.mockResolvedValue({
      items: [
        diaryItem('2026-11-11T20:00:00Z'),
        diaryItem('2026-11-07T20:00:00Z'),
      ],
      nextCursor: 'more',
    });

    const { week } = await loadHistoryStart(READ, null, true, NOW);

    expect(week).toEqual({ episodes: 1, last: 'Wed 11' });
    expect(getDaily).not.toHaveBeenCalled();
  });

  it('reads the days when the first page is all inside the week', async () => {
    loadHistoryPage.mockResolvedValue({
      items: [diaryItem('2026-11-11T20:00:00Z')],
      nextCursor: 'more',
    });
    getDaily.mockResolvedValue({
      days: [{ date: '2026-11-10', episodes: 140 }],
    });

    const { week } = await loadHistoryStart(READ, null, true, NOW);

    expect(week).toEqual({ episodes: 140, last: 'Tue 10' });
  });

  it('a visitor gets no week; the diary is in UTC while the zone can’t be read', async () => {
    getStatsTimeZone.mockResolvedValue({ unavailable: true });
    loadHistoryPage.mockResolvedValue({ items: [], nextCursor: null });

    const start = await loadHistoryStart(READ, '2025-04', false, NOW);

    expect(start.week).toBeNull();
    expect(start.timeZone).toBe('UTC');
    expect(loadHistoryPage).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: '2000-01-01T00:00:00.000Z' }),
    );
  });

  it('starts the newest page before the zone answers', async () => {
    let release: (value: string) => void = () => {};
    getStatsTimeZone.mockReturnValue(
      new Promise((resolve) => (release = resolve)),
    );
    loadHistoryPage.mockResolvedValue({ items: [], nextCursor: null });

    const start = loadHistoryStart(READ, null, false, NOW);
    await vi.waitFor(() =>
      expect(loadHistoryPage).toHaveBeenCalledWith({ ...READ, limit: 100 }),
    );
    release('Europe/London');

    expect(await start).toMatchObject({ timeZone: 'Europe/London' });
  });

  it('a jump waits for the zone: its month is bounded in it', async () => {
    let release: (value: string) => void = () => {};
    getStatsTimeZone.mockReturnValue(
      new Promise((resolve) => (release = resolve)),
    );
    loadHistoryPage.mockResolvedValue({ items: [], nextCursor: null });

    const start = loadHistoryStart(READ, '2025-04', false, NOW);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loadHistoryPage).not.toHaveBeenCalled();
    release('UTC');
    await start;
    expect(loadHistoryPage).toHaveBeenCalledTimes(1);
  });

  it('a failed zone read fails the page and leaves the other reads handled', async () => {
    getStatsTimeZone.mockRejectedValue(new Error('invalid zone answer'));
    getYears.mockRejectedValue(new Error('invalid years answer'));
    loadHistoryPage.mockRejectedValue(new Error('invalid page answer'));

    await expect(loadHistoryStart(READ, null, true, NOW)).rejects.toThrow(
      'invalid zone answer',
    );
    // an unobserved rejection of the years or the page would fail this run
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
