import { describe, expect, it } from 'vitest';

import {
  CACHE_HEADERS,
  failedJson,
  notFoundJson,
  publicJson,
  unavailableJson,
} from './cacheHeaders';

describe('CACHE_HEADERS', () => {
  it('caches on the CDN only (no max-age), per CACHE_LIFE profile', () => {
    expect(CACHE_HEADERS).toEqual({
      medium: 'public, s-maxage=604800, stale-while-revalidate=86400',
      short: 'public, s-maxage=86400, stale-while-revalidate=21600',
    });
  });
});

describe('public answers', () => {
  it('keeps a JSON answer for its profile, never, or sets nothing', async () => {
    const kept = publicJson({ year: 2020 }, { life: 'short' });
    expect(kept.status).toBe(200);
    expect(kept.headers.get('Cache-Control')).toBe(CACHE_HEADERS.short);
    await expect(kept.json()).resolves.toEqual({ year: 2020 });
    expect(
      publicJson({}, { life: 'no-store' }).headers.get('Cache-Control'),
    ).toBe('no-store');
    expect(publicJson({}).headers.get('Cache-Control')).toBeNull();
  });

  it('answers not found uncached, or kept short when the API said so', async () => {
    const malformed = notFoundJson();
    expect(malformed.status).toBe(404);
    expect(malformed.headers.get('Cache-Control')).toBeNull();
    await expect(malformed.json()).resolves.toEqual({ error: 'Not found' });
    expect(notFoundJson('short').headers.get('Cache-Control')).toBe(
      CACHE_HEADERS.short,
    );
  });

  it('answers a failed or unavailable read with an uncached 502', async () => {
    for (const [answer, error] of [
      [failedJson(), 'Failed'],
      [unavailableJson(), 'Unavailable'],
    ] as const) {
      expect(answer.status).toBe(502);
      expect(answer.headers.get('Cache-Control')).toBeNull();
      await expect(answer.json()).resolves.toEqual({ error });
    }
  });
});
