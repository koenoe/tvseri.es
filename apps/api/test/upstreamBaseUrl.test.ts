import { afterEach, describe, expect, it, vi } from 'vitest';

import { isAllowedOverride, upstreamBaseUrl } from '@/lib/upstream/baseUrl';

const REAL = 'https://api.themoviedb.org';

describe('the load rig’s upstream base-URL override', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is honoured for a local stub only', () => {
    vi.stubEnv('TMDB_BASE_URL', 'http://127.0.0.1:4010');
    expect(upstreamBaseUrl('TMDB', REAL)).toBe('http://127.0.0.1:4010');
    vi.stubEnv('TMDB_BASE_URL', 'http://localhost:4010');
    expect(upstreamBaseUrl('TMDB', REAL)).toBe('http://localhost:4010');
  });

  it('is ignored for any other host', () => {
    for (const url of [
      'https://example.com',
      'http://localhost.example.com',
      'http://127.0.0.2:4010',
      'file:///etc/hosts',
      'not a url',
    ]) {
      vi.stubEnv('TMDB_BASE_URL', url);
      expect(upstreamBaseUrl('TMDB', REAL)).toBe(REAL);
    }
  });

  it('is never honoured on the production stage', () => {
    expect(isAllowedOverride('http://127.0.0.1:4010', 'production')).toBe(
      false,
    );
    expect(isAllowedOverride('http://127.0.0.1:4010', 'pr-12')).toBe(true);
  });

  it('leaves the real URL without one', () => {
    expect(upstreamBaseUrl('OMDB', 'https://www.omdbapi.com')).toBe(
      'https://www.omdbapi.com',
    );
  });
});
