import { beforeEach, describe, expect, it, vi } from 'vitest';

import getBaseUrl from './getBaseUrl';

const ENV_KEYS = [
  'PORT',
  'SITE_URL',
  'VERCEL_BRANCH_URL',
  'VERCEL_ENV',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
];

describe('getBaseUrl', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const key of ENV_KEYS) {
      vi.stubEnv(key, undefined);
    }
  });

  it('uses localhost on the dev server port in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SITE_URL', 'https://www.tvseri.es');

    expect(getBaseUrl()).toBe('http://localhost:3000');

    vi.stubEnv('PORT', '3101');
    expect(getBaseUrl()).toBe('http://localhost:3101');
  });

  it('prefers the configured SITE_URL over Vercel system URLs', () => {
    vi.stubEnv('SITE_URL', 'https://www.pr-12.dev.tvseri.es/');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_BRANCH_URL', 'tvseries-git-x.vercel.app');

    expect(getBaseUrl()).toBe('https://www.pr-12.dev.tvseri.es');
  });

  it.each([
    [
      {
        VERCEL_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: 'www.tvseri.es',
      },
      'https://www.tvseri.es',
    ],
    [
      { VERCEL_BRANCH_URL: 'tvseries-git-x.vercel.app', VERCEL_ENV: 'preview' },
      'https://tvseries-git-x.vercel.app',
    ],
    [
      { VERCEL_URL: 'tvseries-abc.vercel.app' },
      'https://tvseries-abc.vercel.app',
    ],
    [{}, 'http://localhost:3000'],
    [{ PORT: '3100' }, 'http://localhost:3100'],
  ])('falls back to Vercel system URLs: %j', (env, expected) => {
    for (const [key, value] of Object.entries(env)) {
      vi.stubEnv(key, value);
    }

    expect(getBaseUrl()).toBe(expected);
  });
});
