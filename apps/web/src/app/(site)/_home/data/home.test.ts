import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';
import type { NewRelease, Premiere, TvSeries } from '@tvseri.es/schemas';
import { featureKindOfDay, toyKindOfDay } from '@tvseri.es/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cacheLife = vi.fn();
vi.mock('next/cache', () => ({ cacheLife, cacheTag: vi.fn() }));

class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`API ${status}`);
    this.status = status;
  }
}

/** The API by path: a value, or an Error to throw */
let replies: Record<string, unknown> = {};
const apiFetch = vi.fn(async (path: string) => {
  const reply = replies[path];
  if (reply instanceof Error) {
    throw reply;
  }
  return reply;
});
vi.mock('@/lib/api/client', () => ({
  ApiError,
  apiFetch,
  isUpstreamFailure: (error: unknown) =>
    error instanceof ApiError && (error.status === 0 || error.status >= 500),
}));

const {
  getFeature,
  getFeatureSlot,
  getHiddenGems,
  getNewThisWeek,
  getPremieres,
  getToy,
  getToySlot,
  getTopPicks,
} = await import('./home');

const show = (id: number) =>
  ({
    backdropImage: 'b',
    id,
    posterImage: 'p',
    title: `Show ${id}`,
  }) as TvSeries;

const premiere = (id: number, date: string): Premiere => ({
  date,
  daysAway: 99,
  isBig: false,
  kind: 'season-premiere',
  release: 'weekly',
  seasonNumber: 2,
  series: show(id),
});

const DAY = '2026-11-12';

beforeEach(() => {
  replies = {
    '/collection/most-popular-this-month': [show(1), show(2), show(3)],
    '/collection/top-rated': [show(4), show(5)],
    '/collection/trending': [show(1)],
    '/home/feature': {
      date: DAY,
      feature: { kind: 'archive', rank: 1, series: show(7), yearsOld: 24 },
    },
    '/home/hidden-gems': [show(4), show(6), show(7), show(8)],
    '/home/new-this-week': { date: DAY, items: [] },
    '/home/toy': {
      date: DAY,
      toy: {
        channels: [
          {
            network: { id: 1, logo: '', logoKind: 'icon', name: 'N' },
            series: show(11),
          },
        ],
        kind: 'whats-on',
      },
    },
    '/premieres': {
      countdown: { isDue: false, items: [] },
      date: '2026-11-11',
      items: [
        premiere(10, '2026-11-11'),
        premiere(11, '2026-11-13'),
        premiere(12, '2026-11-20'),
      ],
    },
  };
  cacheLife.mockClear();
});

describe('Hidden gems', () => {
  it('asks the API for the ISO week of the page’s day (one key a week)', async () => {
    await getHiddenGems('2026-11-15');
    expect(apiFetch).toHaveBeenCalledWith('/home/hidden-gems', {
      query: { week: '2026-W46' },
    });
    await getHiddenGems('2026-11-16');
    expect(apiFetch).toHaveBeenCalledWith('/home/hidden-gems', {
      query: { week: '2026-W47' },
    });
  });
});

describe('neighbours never repeat across sections', () => {
  it('Top Picks gives way to the spotlight above it', async () => {
    const items = await getTopPicks('2026-11');
    expect(Array.isArray(items) && items.map((item) => item.id)).toEqual([
      2, 3,
    ]);
  });

  it('Hidden gems gives way to the deck above it and the feature below it', async () => {
    const items = await getHiddenGems(DAY);
    expect(Array.isArray(items) && items.map((item) => item.id)).toEqual([
      6, 8,
    ]);
  });

  it('Premieres counts days from the page’s day and gives way to the toy', async () => {
    const items = await getPremieres(DAY);
    expect(
      Array.isArray(items) &&
        items.map((item) => [item.series.id, item.daysAway]),
    ).toEqual([[12, 8]]);
  });
});

describe('a failed API read', () => {
  it('is Unavailable, kept for the unavailable 5 minutes, and never throws', async () => {
    replies['/home/hidden-gems'] = new ApiError(503);
    await expect(getHiddenGems('2026-11-13')).resolves.toEqual({
      unavailable: true,
    });
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
  });

  it('in a neighbour keeps the section, but only for the unavailable 5 minutes', async () => {
    replies['/collection/trending'] = new ApiError(0);
    const items = await getTopPicks('2026-12');
    expect(Array.isArray(items) && items.map((item) => item.id)).toEqual([
      1, 2, 3,
    ]);
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
  });
});

describe('yesterday’s build standing in for today’s', () => {
  // The API's window is yesterday..tomorrow of the real clock
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${DAY}T12:00:00Z`));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the day’s feature and toy for their profile', async () => {
    await getFeature(DAY);
    expect(cacheLife).toHaveBeenLastCalledWith('medium');
    await getToy(DAY);
    expect(cacheLife).toHaveBeenLastCalledWith('medium');
  });

  it('asks for the day’s moments with their version, so an older CDN copy is never reused', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${DAY}T12:00:00Z`));
    await getFeature(DAY);
    expect(apiFetch).toHaveBeenLastCalledWith('/home/feature', {
      notFound: 'null',
      query: { date: DAY, v: HOME_MOMENTS_VERSION },
    });
    await getToy(DAY);
    expect(apiFetch).toHaveBeenLastCalledWith('/home/toy', {
      notFound: 'null',
      query: { date: DAY, v: HOME_MOMENTS_VERSION },
    });
    vi.useRealTimers();
  });

  it('keeps another day’s feature, toy or premieres only for the outage life', async () => {
    const yesterday = '2026-11-11';
    replies['/home/feature'] = {
      ...(replies['/home/feature'] as object),
      date: yesterday,
    };
    replies['/home/toy'] = {
      ...(replies['/home/toy'] as object),
      date: yesterday,
    };

    await getFeature(DAY);
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
    await getToy(DAY);
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
    // The fixture's premieres were computed the day before DAY
    await getPremieres(DAY);
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
  });
});

describe('New this week', () => {
  const release = (id: number, rank: number, backdrop = true): NewRelease => ({
    date: '2026-11-10',
    kind: 'new-series',
    rank,
    seasonNumber: 1,
    series: { ...show(id), backdropImage: backdrop ? 'b' : '' },
  });

  // The API's window is yesterday..tomorrow of the real clock
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${DAY}T12:00:00Z`));
    replies['/home/new-this-week'] = {
      date: DAY,
      items: [
        release(1, 1),
        release(13, 2, false),
        release(7, 3),
        release(14, 4),
        release(11, 5),
        release(15, 6),
      ],
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the API for the page’s day', async () => {
    await getNewThisWeek(DAY);
    expect(apiFetch).toHaveBeenCalledWith('/home/new-this-week', {
      query: { date: DAY },
    });
  });

  it('gives way to the spotlight, the feature and the toy, and leads with the first left that has a backdrop', async () => {
    const items = await getNewThisWeek(DAY);
    expect(
      Array.isArray(items) && items.map((item) => [item.series.id, item.rank]),
    ).toEqual([
      [14, 4],
      [13, 2],
      [15, 6],
    ]);
    expect(cacheLife).toHaveBeenLastCalledWith('short');
  });

  it('keeps another day’s list only for the outage life', async () => {
    replies['/home/new-this-week'] = {
      ...(replies['/home/new-this-week'] as object),
      date: '2026-11-11',
    };
    await getNewThisWeek(DAY);
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
  });

  it('Premieres asks with the page’s day, so each day has its own CDN copy', async () => {
    await getPremieres(DAY);
    expect(apiFetch).toHaveBeenCalledWith('/premieres', {
      query: { date: DAY },
    });
  });

  it('is Unavailable when the API fails', async () => {
    replies['/home/new-this-week'] = new ApiError(503);
    await expect(getNewThisWeek(DAY)).resolves.toEqual({ unavailable: true });
  });

  it('is the neighbour Premieres gives way to', async () => {
    replies['/home/new-this-week'] = { date: DAY, items: [release(12, 1)] };
    const items = await getPremieres(DAY);
    expect(Array.isArray(items) && items.map((item) => item.series.id)).toEqual(
      [],
    );
  });
});

describe('the rotating slots’ placeholders', () => {
  it('take the kind the API drew, and the stills’ count', async () => {
    replies['/home/feature'] = {
      date: DAY,
      feature: {
        kind: 'stills',
        stills: [{}, {}, {}],
      },
    };
    await expect(getFeatureSlot(DAY)).resolves.toEqual({
      count: 3,
      kind: 'stills',
    });
    await expect(getToySlot(DAY)).resolves.toBe('whats-on');
  });

  it('draw nothing when the slot draws nothing (the API’s 404)', async () => {
    replies['/home/feature'] = null;
    replies['/home/toy'] = null;
    await expect(getFeatureSlot(DAY)).resolves.toEqual({
      count: null,
      kind: null,
    });
    await expect(getToySlot(DAY)).resolves.toBeNull();
  });

  it('take the day’s plan when the API is unavailable', async () => {
    replies['/home/feature'] = new ApiError(503);
    replies['/home/toy'] = new ApiError(503);
    await expect(getFeatureSlot(DAY)).resolves.toEqual({
      count: null,
      kind: featureKindOfDay(DAY),
    });
    await expect(getToySlot(DAY)).resolves.toBe(toyKindOfDay(DAY));
  });
});
