import { describe, expect, it } from 'vitest';

import { buildStatsCacheKey, getStatsInvalidationKeys } from './keys';

describe('buildStatsCacheKey', () => {
  it('keeps the plain key for unchanged segments', () => {
    expect(buildStatsCacheKey('u1', 2025, 'weekly')).toBe(
      'stats:u1:2025:weekly',
    );
  });

  it('versions segments whose answers gained fields', () => {
    expect(buildStatsCacheKey('u1', 2025, 'providers')).toBe(
      'stats:u1:2025:providers:v2',
    );
    expect(buildStatsCacheKey('u1', 2025, 'when')).toBe(
      'stats:u1:2025:when:v2',
    );
    expect(buildStatsCacheKey('u1', 0, 'all-time')).toBe(
      'stats:u1:0:all-time:v3',
    );
    expect(buildStatsCacheKey('u1', 2025, 'daily')).toBe(
      'stats:u1:2025:daily:v2',
    );
  });

  it('invalidates the versioned keys', () => {
    expect(getStatsInvalidationKeys('u1', 2025)).toEqual(
      expect.arrayContaining([
        'stats:u1:2025:providers:v2',
        'stats:u1:2025:when:v2',
        'stats:u1:0:all-time:v3',
        'stats:u1:2025:daily:v2',
      ]),
    );
  });
});
