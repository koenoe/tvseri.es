import { describe, expect, it, vi } from 'vitest';

import { readShow } from '@/lib/catalogue';

import { requestedUrls, setUpstreamConditions } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';

/**
 * The stored copies of a show each use keeps in front of TMDB: a
 * container's for list placement, the Cache table's for marks.
 */

const tmdbPaths = () =>
  requestedUrls()
    .filter((url) => url.host === 'api.themoviedb.org')
    .map((url) => url.pathname);

const show = (id: number) =>
  fakeShow({ id, seasons: [{ airDate: '2020-01-01', episodes: 2 }] });

describe('readShow', () => {
  it('placement: this container keeps a copy, unknown shows too', async () => {
    show(531);

    expect((await readShow(531, 'placement'))?.id).toBe(531);
    expect((await readShow(532, 'placement')) ?? null).toBeNull();
    setUpstreamConditions({ outage: { status: 500 } });

    expect((await readShow(531, 'placement'))?.id).toBe(531);
    expect((await readShow(532, 'placement')) ?? null).toBeNull();
  });

  it('placement: a TMDB failure throws and is not kept', async () => {
    setUpstreamConditions({ outage: { status: 500 } });
    await expect(readShow(533, 'placement')).rejects.toThrow();

    setUpstreamConditions({});
    show(533);
    expect((await readShow(533, 'placement'))?.id).toBe(533);
  });

  it('placement: the copy lasts 15 minutes', async () => {
    vi.useFakeTimers({
      now: new Date('2026-11-14T10:00:00Z'),
      toFake: ['Date'],
    });
    show(534);
    await readShow(534, 'placement');
    vi.setSystemTime(new Date('2026-11-14T10:14:00Z'));
    await readShow(534, 'placement');
    expect(tmdbPaths()).toEqual(['/3/tv/534']);

    vi.setSystemTime(new Date('2026-11-14T10:16:00Z'));
    await readShow(534, 'placement');
    expect(tmdbPaths()).toEqual(['/3/tv/534', '/3/tv/534']);
  });

  it('mark: the shared copy serves while TMDB is down', async () => {
    vi.useFakeTimers({
      now: new Date('2026-11-14T10:00:00Z'),
      toFake: ['Date'],
    });
    show(541);
    expect((await readShow(541, 'mark'))?.id).toBe(541);

    // fresh for an hour: TMDB isn't asked
    vi.setSystemTime(new Date('2026-11-14T10:59:00Z'));
    await readShow(541, 'mark');
    expect(tmdbPaths()).toEqual(['/3/tv/541']);

    // older, with TMDB down: the stored copy
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'));
    setUpstreamConditions({ outage: { status: 500 } });
    expect((await readShow(541, 'mark'))?.id).toBe(541);
  });

  it('stored: the shared copy, however old, without asking TMDB', async () => {
    show(551);
    expect(await readShow(551, 'stored')).toBeUndefined();
    await readShow(551, 'mark');
    const before = tmdbPaths().length;

    expect((await readShow(551, 'stored'))?.id).toBe(551);
    expect(tmdbPaths()).toHaveLength(before);
  });
});
