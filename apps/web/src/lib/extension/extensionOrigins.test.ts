import { describe, expect, it } from 'vitest';

/**
 * The extension's site (apps/extension/origins.js), read as the extension
 * runs it: it has no build step and no chrome globals at import. Typed
 * here, as the web doesn't compile the extension's JavaScript.
 */
type Origins = Readonly<{
  allowedOrigin: (origin: unknown) => boolean;
  PRODUCTION_ORIGIN: string;
  SITE_ORIGIN: string;
}>;

const ORIGINS_URL = new URL('../../../../extension/origins.js', import.meta.url)
  .href;
const { allowedOrigin, PRODUCTION_ORIGIN, SITE_ORIGIN } = (await import(
  ORIGINS_URL
)) as Origins;

describe('the extension’s site', () => {
  it('is www.tvseri.es in the source, the folder the zip is built from', () => {
    expect(PRODUCTION_ORIGIN).toBe('https://www.tvseri.es');
    expect(SITE_ORIGIN).toBe('https://www.tvseri.es');
  });

  it('trusts only that site', () => {
    expect(allowedOrigin('https://www.tvseri.es')).toBe(true);
    for (const origin of [
      'http://localhost:3000',
      'https://tvseri.es',
      'https://www.pr-12.dev.tvseri.es',
      'https://www.tvseri.es.evil.example',
      undefined,
      '',
    ]) {
      expect(allowedOrigin(origin), String(origin)).toBe(false);
    }
  });
});
