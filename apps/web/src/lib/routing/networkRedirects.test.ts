import { NETWORKS } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { NETWORK_ID_REDIRECTS } from './networkRedirects';
import { REDIRECTS } from './redirects';

describe('NETWORK_ID_REDIRECTS', () => {
  it('sends a TMDB network id to its landing slug, permanently', () => {
    expect(NETWORK_ID_REDIRECTS).toContainEqual({
      destination: '/network/hbo',
      permanent: true,
      source: '/network/49',
    });
    expect(NETWORK_ID_REDIRECTS).toContainEqual({
      destination: '/network/netflix',
      permanent: true,
      source: '/network/213',
    });
  });

  it('has one row per network, each id once, and is in the redirect table', () => {
    const sources = NETWORK_ID_REDIRECTS.map((row) => row.source);
    expect(sources).toHaveLength(NETWORKS.length);
    expect(new Set(sources).size).toBe(sources.length);
    for (const row of NETWORK_ID_REDIRECTS) {
      expect(REDIRECTS).toContainEqual(row);
    }
  });
});
