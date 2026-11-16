import { describe, expect, it } from 'vitest';

import { onTmdb, requestedUrls } from './fakeHttp';
import { request } from './request';

const offer = (id: number, name: string) => ({
  display_priority: id,
  logo_path: `/l${id}.png`,
  provider_id: id,
  provider_name: name,
});

describe('where to watch, shared per show', () => {
  it('asks TMDB once a day per show, whatever the region or the caller', async () => {
    onTmdb('/tv/1396/watch/providers', {
      id: 1396,
      results: {
        NL: { flatrate: [offer(2, 'Service B')] },
        US: {
          buy: [offer(9, 'Shop')],
          flatrate: [offer(1, 'Service A')],
        },
      },
    });

    const us = await request('/series/1396/watch-providers?region=US');
    const nl = await request('/series/1396/watch-providers?region=NL');

    expect((await us.json()).map((p: { name: string }) => p.name)).toEqual([
      'Service A',
    ]);
    expect((await nl.json()).map((p: { name: string }) => p.name)).toEqual([
      'Service B',
    ]);
    expect(
      requestedUrls().filter((url) =>
        url.pathname.endsWith('/watch/providers'),
      ),
    ).toHaveLength(1);
  });

  it('includes ad-supported services like free ones', async () => {
    onTmdb('/tv/1399/watch/providers', {
      id: 1399,
      results: {
        US: {
          ads: [offer(3, 'Ad Service')],
          buy: [offer(9, 'Shop')],
          flatrate: [offer(1, 'Service A')],
          free: [offer(2, 'Free Service')],
        },
      },
    });

    const response = await request('/series/1399/watch-providers?region=US');

    expect(
      ((await response.json()) as Array<{ name: string }>)
        .map((p) => p.name)
        .sort(),
    ).toEqual(['Ad Service', 'Free Service', 'Service A']);
  });
});
