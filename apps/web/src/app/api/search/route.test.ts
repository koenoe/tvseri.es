import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_HEADERS } from '../cacheHeaders';
import { GET } from './route';

const BREAKING_BAD = {
  backdropColor: '#3b5b4f',
  countries: [],
  createdBy: [],
  description: 'A chemistry teacher…',
  firstAirDate: '2008-01-20',
  genres: [],
  id: 1396,
  languages: [],
  lastAirDate: '2013-09-29',
  originalLanguage: 'en',
  originalTitle: 'Breaking Bad',
  popularity: 310,
  posterImage:
    'https://image.tmdb.org/t/p/w300_and_h450_bestv2/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
  posterPath: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
  releaseYear: '2008',
  slug: 'breaking-bad',
  status: 'Ended',
  tagline: '',
  title: 'Breaking Bad',
  type: 'Scripted',
};

const BRYAN_CRANSTON = {
  id: 17419,
  image:
    'https://image.tmdb.org/t/p/w600_and_h900_bestv2/7Jahy5LZX2Fo8fGJltMreAI49hC.jpg',
  knownFor: ['Breaking Bad', 'Argo'],
  knownForDepartment: 'Acting',
  name: 'Bryan Cranston',
  slug: 'bryan-cranston',
};

const get = (search: string) =>
  GET(new NextRequest(`https://www.tvseri.es/api/search${search}`));

const apiUrl = () => String(vi.mocked(fetch).mock.lastCall?.[0]);

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.stubEnv('API_URL', 'https://api.test');
    vi.stubEnv('API_KEY', 'key');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          best: 'series',
          people: [BRYAN_CRANSTON],
          series: [BREAKING_BAD],
        }),
      ),
    );
  });

  it('asks the API once with the normalised query, so every spelling shares one key', async () => {
    await get('?q=%20%20Breaking%20%20%20BAD%20');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(apiUrl()).toBe('https://api.test/search?q=breaking+bad');
  });

  it('answers shows and people with only the fields the overlay draws, cached at the CDN only', async () => {
    const res = await get('?q=breaking');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.medium);
    expect(res.headers.get('cache-control')).not.toContain('max-age=');
    expect(await res.json()).toEqual({
      best: 'series',
      people: [BRYAN_CRANSTON],
      series: [
        {
          id: 1396,
          posterImage: BREAKING_BAD.posterImage,
          releaseYear: '2008',
          slug: 'breaking-bad',
          title: 'Breaking Bad',
        },
      ],
    });
  });

  it.each([
    ['no q', ''],
    ['an empty q', '?q='],
    ['a blank q', '?q=%20%20%20'],
    ['a q over 100 characters', `?q=${'a'.repeat(101)}`],
  ])('answers 400 for %s without calling the API', async (_, search) => {
    const res = await get(search);

    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts 100 characters after normalising', async () => {
    const res = await get(`?q=%20${'a'.repeat(100)}%20`);

    expect(res.status).toBe(200);
  });

  it('answers a failed API call with 502 that is never cached', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ message: 'Internal Server Error' }, { status: 500 }),
    );

    const res = await get('?q=breaking');

    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ error: 'SearchFailed' });
  });

  it('answers an unreachable or timed-out API with 502, never cached', async () => {
    vi.mocked(fetch).mockRejectedValue(
      new DOMException('The operation timed out.', 'TimeoutError'),
    );

    const res = await get('?q=breaking');

    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('answers a body that is not search results with 502, never cached', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json([BREAKING_BAD]));

    const res = await get('?q=breaking');

    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
