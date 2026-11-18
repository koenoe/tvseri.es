import { describe, expect, it } from 'vitest';

import {
  cacheHeader,
  dayBuildCacheControl,
  PARTIAL_CACHE_CONTROL,
  STAND_IN_CACHE_CONTROL,
  todayBuildCacheControl,
} from './cacheHeader';

const SATURDAY = '2026-11-14';
const FRIDAY = '2026-11-13';

/** The seconds a shared cache (the CDN) may keep it */
const sharedLife = (header: string) =>
  Number(/s-maxage=(\d+)/.exec(header)?.[1] ?? Number.NaN);

describe('dayBuildCacheControl', () => {
  it("keeps Friday's build standing in for Saturday's 30 s at most, never stale", () => {
    // what the CDN held for `?date=2026-11-14`: Friday's pair, kept for a
    // week or an hour, so Saturday's build never reached the page
    for (const partial of [false, true]) {
      const header = dayBuildCacheControl(SATURDAY, { date: FRIDAY }, partial);
      expect(header).toBe(STAND_IN_CACHE_CONTROL);
      expect(sharedLife(header)).toBeLessThanOrEqual(30);
      expect(header).not.toContain('stale-while-revalidate');
    }
  });

  it("keeps the day's own build for the medium profile, an incomplete one an hour", () => {
    expect(dayBuildCacheControl(SATURDAY, { date: SATURDAY }, false)).toBe(
      cacheHeader('medium'),
    );
    expect(dayBuildCacheControl(SATURDAY, { date: SATURDAY }, true)).toBe(
      PARTIAL_CACHE_CONTROL,
    );
  });
});

describe('todayBuildCacheControl', () => {
  const at = (iso: string) => Date.parse(iso);

  it('keeps today’s complete build the short profile, never past midnight UTC', () => {
    expect(
      todayBuildCacheControl(
        { date: SATURDAY },
        false,
        at(`${SATURDAY}T00:00:00Z`),
      ),
    ).toBe(cacheHeader('short'));
    expect(
      todayBuildCacheControl(
        { date: SATURDAY },
        false,
        at(`${SATURDAY}T22:00:00Z`),
      ),
    ).toBe(
      'public, max-age=7200, s-maxage=7200, stale-while-revalidate=21600, stale-if-error=21600',
    );
  });

  it('keeps an incomplete build an hour at most, never past midnight UTC', () => {
    expect(
      todayBuildCacheControl(
        { date: SATURDAY },
        true,
        at(`${SATURDAY}T10:00:00Z`),
      ),
    ).toBe(PARTIAL_CACHE_CONTROL);
    expect(
      todayBuildCacheControl(
        { date: SATURDAY },
        true,
        at(`${SATURDAY}T23:59:00Z`),
      ),
    ).toBe('public, max-age=60, s-maxage=60');
  });

  it('keeps another day’s build standing in 30 s at most', () => {
    expect(
      todayBuildCacheControl(
        { date: FRIDAY },
        false,
        at(`${SATURDAY}T00:00:05Z`),
      ),
    ).toBe(STAND_IN_CACHE_CONTROL);
  });
});
