import type { PersonCareer, PersonShow, PersonShows } from '@tvseri.es/schemas';
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
  return reply ?? null;
});
vi.mock('@/lib/api/client', () => ({
  ApiError,
  apiFetch,
  isUpstreamFailure: (error: unknown) =>
    error instanceof ApiError && (error.status === 0 || error.status >= 500),
}));

const { loadCareerView, loadFamilyAndAwards, loadPerson, loadShowsView } =
  await import('./loaders');

/** The profile the loader itself chose: its call comes after its reads' */
const lastProfile = () => cacheLife.mock.calls.at(-1)?.[0];

const show = (id: number, extra: Partial<PersonShow> = {}): PersonShow => ({
  characters: ['Walter White'],
  episodeCount: 62,
  id,
  isCast: true,
  isCrew: false,
  isGuest: false,
  isVoice: false,
  jobs: [],
  name: `Show ${id}`,
  posterImage: '',
  role: 'Walter White',
  slug: `show-${id}`,
  year: 2008,
  ...extra,
});

const shows: PersonShows = {
  counts: {
    acting: 1,
    all: 1,
    behindTheCamera: 0,
    guest: 0,
    self: 0,
    upcoming: 0,
    voice: 0,
  },
  self: [],
  shows: [show(1396)],
  upcoming: [],
};

const career: PersonCareer = {
  guest: { count: 0, ticks: [] },
  rows: [
    {
      endYear: 2013,
      episodeCount: 62,
      id: 1396,
      name: 'Show 1396',
      ongoing: false,
      role: 'Walter White',
      slug: 'show-1396',
      startYear: 2008,
      weight: 3,
    },
  ],
  upcoming: [],
};

const DOWN = new ApiError(503);

beforeEach(() => {
  cacheLife.mockClear();
  replies = {
    '/person/:id': {
      age: 60,
      birthdate: '1956-03-07',
      id: 17419,
      isAdult: false,
      name: 'Bryan Cranston',
      slug: 'bryan-cranston',
    },
    '/person/:id/career': career,
    '/person/:id/family-and-awards': { awards: null, family: null },
    '/person/:id/known-for': [],
    '/person/:id/shows': shows,
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadShowsView', () => {
  it('takes each series’ years from the career, for the medium life', async () => {
    const view = await loadShowsView(17419, 'male');
    expect(view).toMatchObject({ shows: [{ years: '2008–2013' }] });
    expect(lastProfile()).toBe('medium');
  });

  it('is Unavailable for 5 minutes when the career is, never a degraded week', async () => {
    replies['/person/:id/career'] = DOWN;
    expect(await loadShowsView(17419, 'male')).toEqual({ unavailable: true });
    expect(lastProfile()).toBe('unavailable');
  });

  it('is Unavailable when the credits are', async () => {
    replies['/person/:id/shows'] = DOWN;
    expect(await loadShowsView(17419, 'male')).toEqual({ unavailable: true });
    expect(lastProfile()).toBe('unavailable');
  });
});

describe('loadCareerView', () => {
  it('lays out the chart for the medium life', async () => {
    const view = await loadCareerView(17419, undefined);
    expect(view).toMatchObject({ rows: [{ id: 1396 }] });
    expect(lastProfile()).toBe('medium');
  });

  it.each(['/person/:id/career', '/person/:id/shows', '/person/:id/known-for'])(
    'is Unavailable for 5 minutes when %s is',
    async (path) => {
      replies[path] = DOWN;
      expect(await loadCareerView(17419, undefined)).toEqual({
        unavailable: true,
      });
      expect(lastProfile()).toBe('unavailable');
    },
  );
});

describe('loadFamilyAndAwards', () => {
  it('is Unavailable for 5 minutes when Wikidata is down', async () => {
    replies['/person/:id/family-and-awards'] = {
      awards: null,
      degraded: true,
      family: null,
    };
    expect(await loadFamilyAndAwards(17419)).toEqual({ unavailable: true });
    expect(lastProfile()).toBe('unavailable');
  });

  it('keeps "nothing known" for a day, something for the medium life', async () => {
    await loadFamilyAndAwards(17419);
    expect(lastProfile()).toBe('short');

    replies['/person/:id/family-and-awards'] = {
      awards: null,
      family: { children: [], spouses: [{ id: 'Q1', name: 'A' }] },
    };
    await loadFamilyAndAwards(17419);
    expect(lastProfile()).toBe('medium');
  });
});

describe('loadPerson', () => {
  it('works the age out from the dates, against its own today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
    expect(await loadPerson(17419)).toMatchObject({
      person: { age: 70 },
      status: 'ok',
    });
  });

  it('is not found for an unknown or adult person', async () => {
    replies['/person/:id'] = null;
    expect(await loadPerson(1)).toEqual({ status: 'not-found' });
    replies['/person/:id'] = { id: 2, isAdult: true, name: 'X', slug: 'x' };
    expect(await loadPerson(2)).toEqual({ status: 'not-found' });
  });

  it('is Unavailable while the API is down', async () => {
    replies['/person/:id'] = DOWN;
    expect(await loadPerson(17419)).toEqual({ unavailable: true });
    expect(lastProfile()).toBe('unavailable');
  });
});
