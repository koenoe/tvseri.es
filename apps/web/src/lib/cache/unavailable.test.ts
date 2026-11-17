import { CACHE_LIFE } from '@tvseri.es/constants';
import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import {
  allAvailable,
  cacheLifeFor,
  isUnavailable,
  tryApi,
} from './unavailable';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));

const failWith = (error: unknown) => () => Promise.reject(error);

describe('tryApi', () => {
  it('passes a successful read through', async () => {
    await expect(tryApi(async () => ({ id: 1 }))).resolves.toEqual({ id: 1 });
  });

  // which statuses are an outage is isUpstreamFailure's (client.test)
  it('turns an upstream failure into Unavailable', async () => {
    const timeout = new ApiError(0, 'ApiTimeout');
    expect(isUnavailable(await tryApi(failWith(timeout)))).toBe(true);
  });

  it.each([
    ['a 404 (the caller forgot notFound)', new ApiError(404)],
    ['an invalid body', new ApiError(200, 'ApiInvalidResponse')],
  ])('rethrows %s, so the row error boundary shows it', async (_, error) => {
    await expect(tryApi(failWith(error))).rejects.toBe(error);
  });

  it('rethrows anything that is not an API error', async () => {
    await expect(tryApi(failWith(new TypeError('bug')))).rejects.toThrow('bug');
  });
});

describe('isUnavailable', () => {
  it('tells the placeholder from data', () => {
    expect(isUnavailable({ unavailable: true })).toBe(true);
    expect(isUnavailable({ items: [] })).toBe(false);
    expect(isUnavailable(null)).toBe(false);
    expect(isUnavailable('unavailable')).toBe(false);
  });

  it('does not mistake an API body with an `unavailable` field for it', () => {
    expect(isUnavailable({ unavailable: false })).toBe(false);
    expect(isUnavailable({ id: 1, unavailable: 'soon' })).toBe(false);
  });
});

describe('allAvailable', () => {
  it('gives the values when every read worked', () => {
    expect(allAvailable([1, 2])).toEqual([1, 2]);
  });

  it('gives Unavailable when one read failed', () => {
    expect(isUnavailable(allAvailable([1, { unavailable: true }]))).toBe(true);
  });
});

describe('cacheLifeFor', () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockClear();
  });

  it('names the profile when every read worked', () => {
    cacheLifeFor('medium', [1], null, { items: [] });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['medium']]);
  });

  it('names the profile when there is no read to check', () => {
    cacheLifeFor('stats');
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['stats']]);
  });

  it('names `unavailable` when any read failed', () => {
    cacheLifeFor('short', [1], { unavailable: true });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['unavailable']]);
  });
});

describe('the unavailable cache life', () => {
  // next.config.ts maps a profile to { stale: maxAge, revalidate: sMaxAge,
  // expire: sMaxAge + staleWhileRevalidate }. Next drops an entry from the
  // prerender when expire < 300 s and from the static shell when stale < 300 s.
  const { maxAge, sMaxAge, staleWhileRevalidate } = CACHE_LIFE.unavailable;

  it('regenerates a failed section on a visit within a minute', () => {
    expect(sMaxAge).toBeLessThanOrEqual(60);
  });

  it('stays in the prerender and the static shell', () => {
    expect(sMaxAge + staleWhileRevalidate).toBeGreaterThanOrEqual(300);
    expect(maxAge).toBeGreaterThanOrEqual(300);
  });
});
