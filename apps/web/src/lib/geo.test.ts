import { describe, expect, it } from 'vitest';

import { getRegionFromHeaders, resolveRegionFromHeaders } from './geo';

const headers = (init: Record<string, string>) => new Headers(init);

describe('getRegionFromHeaders', () => {
  it("prefers Vercel's geo header over CloudFront's", () => {
    expect(
      getRegionFromHeaders(
        headers({
          'cloudfront-viewer-country': 'GB',
          'x-vercel-ip-country': 'NL',
        }),
      ),
    ).toBe('NL');
  });

  it("falls back to CloudFront's header", () => {
    expect(
      getRegionFromHeaders(headers({ 'cloudfront-viewer-country': 'GB' })),
    ).toBe('GB');
  });

  it('defaults to US, or to the given fallback', () => {
    expect(getRegionFromHeaders(headers({}))).toBe('US');
    expect(getRegionFromHeaders(headers({}), null)).toBeNull();
    expect(getRegionFromHeaders(headers({}), 'unknown')).toBe('unknown');
  });
});

describe('resolveRegionFromHeaders', () => {
  const geo = headers({ 'x-vercel-ip-country': 'NL' });

  it("uses the user's saved country first", () => {
    expect(resolveRegionFromHeaders({ country: 'DE' }, geo)).toBe('DE');
  });

  it.each([
    [null, 'NL'],
    [undefined, 'NL'],
    [{}, 'NL'],
    [{ country: '' }, 'NL'],
  ])('falls through to the geo country for user %j', (user, expected) => {
    expect(resolveRegionFromHeaders(user, geo)).toBe(expected);
  });
});
