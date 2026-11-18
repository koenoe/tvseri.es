import { describe, expect, it } from 'vitest';

import { GET } from './route';

const redirectFrom = (search: string) =>
  GET(new Request(`https://www.tvseri.es/api/discover/legacy${search}`));

describe('GET /api/discover/legacy', () => {
  it.each([
    ['?with_genres=80', '/genre/crime'],
    ['?with_networks=49&sort_by=vote_average.desc', '/network/hbo'],
    ['?with_keywords=4565', '/theme/dystopia'],
    ['?with_origin_country=GB', '/country/gb'],
    ['?with_original_language=ja', '/language/ja'],
    [
      '?first_air_date.gte=2010-01-01&first_air_date.lte=2019-12-31',
      '/decade/2010s',
    ],
    // keys that aren't filters (tracking, paging) don't change the landing
    ['?with_genres=80&utm_source=newsletter&utm_medium=email', '/genre/crime'],
    ['?with_networks=49&fbclid=abc&gclid=def&page=2', '/network/hbo'],
  ])('redirects %s permanently to %s', (search, location) => {
    const response = redirectFrom(search);
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(location);
  });

  it('sends a query that is not one landing to the hub, without its filters', () => {
    for (const search of [
      '?with_genres=80,18',
      '?with_genres=80&with_networks=49',
      '?with_watch_providers=8&watch_region=GB',
      '?sort_by=vote_average.desc',
      '?with_genres=1',
    ]) {
      expect(redirectFrom(search).headers.get('location')).toBe('/discover');
    }
  });

  it('lets the CDN cache the answer', () => {
    expect(
      redirectFrom('?with_genres=80').headers.get('cache-control'),
    ).toMatch(/^public, s-maxage=\d+/);
  });
});
