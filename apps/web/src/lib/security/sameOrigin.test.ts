import { describe, expect, it } from 'vitest';

import isSameOriginRequest, { crossSiteRefused } from './sameOrigin';

const request = (
  headers: Record<string, string>,
  method: 'GET' | 'POST' = 'POST',
) =>
  new Request('https://www.tvseri.es/api/account/import', {
    headers,
    method,
  });

describe('isSameOriginRequest', () => {
  it('accepts a fetch from the site’s own pages', () => {
    expect(
      isSameOriginRequest(request({ 'sec-fetch-site': 'same-origin' })),
    ).toBe(true);
  });

  it('refuses another site and a sibling subdomain', () => {
    expect(
      isSameOriginRequest(request({ 'sec-fetch-site': 'cross-site' })),
    ).toBe(false);
    expect(
      isSameOriginRequest(request({ 'sec-fetch-site': 'same-site' })),
    ).toBe(false);
  });

  it('accepts a typed-in GET but no typed-in POST', () => {
    expect(
      isSameOriginRequest(request({ 'sec-fetch-site': 'none' }, 'GET')),
    ).toBe(true);
    expect(isSameOriginRequest(request({ 'sec-fetch-site': 'none' }))).toBe(
      false,
    );
  });

  it('falls back to Origin against the request’s host', () => {
    expect(
      isSameOriginRequest(
        request({ host: 'www.tvseri.es', origin: 'https://www.tvseri.es' }),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        request({
          host: 'www.tvseri.es',
          origin: 'https://pr-12.dev.tvseri.es',
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(request({ host: 'www.tvseri.es', origin: 'null' })),
    ).toBe(false);
  });

  it('prefers the forwarded host behind a proxy', () => {
    expect(
      isSameOriginRequest(
        request({
          host: 'internal:3000',
          origin: 'https://www.tvseri.es',
          'x-forwarded-host': 'www.tvseri.es',
        }),
      ),
    ).toBe(true);
  });

  it('lets a request without browser headers through (no cookies)', () => {
    expect(isSameOriginRequest(request({}))).toBe(true);
  });
});

describe('crossSiteRefused', () => {
  it('is a private 403', async () => {
    const response = crossSiteRefused();
    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ error: 'Forbidden' });
  });
});
