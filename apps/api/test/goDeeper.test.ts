import { beforeEach, describe, expect, it, vi } from 'vitest';

import { onGet, onTmdb } from './fakeHttp';
import { request } from './request';

// Worked out by hand from rotationIndex (FNV-1a of the salt decides step and start):
// 2026-11-12: Essentials index 2 of 8 = BBC One; with 3 seeds the start is 2 (seed order 3, 1, 2)
// 2026-11-13: Essentials index 3 of 8 = Netflix; with 3 seeds the start is 0 (seed order 1, 2, 3)
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
});

const DISCOVER_DEFAULTS = {
  include_adult: 'false',
  include_null_first_air_dates: 'false',
  page: '1',
};

const poster = (id: number, extra: Record<string, unknown> = {}) => ({
  first_air_date: '2015-01-01',
  genre_ids: [18],
  id,
  name: `Show ${id}`,
  poster_path: `/${id}.jpg`,
  vote_average: 8,
  vote_count: 1000,
  ...extra,
});

const discover = (
  query: Record<string, string>,
  ids: number[],
  total = ids.length,
) =>
  onTmdb(
    '/discover/tv',
    {
      page: 1,
      results: ids.map((id) => poster(id)),
      total_pages: 1,
      total_results: total,
    },
    { exact: true, query: { ...DISCOVER_DEFAULTS, ...query } },
  );

/** What the facts of a destination count: every show, no vote floor */
const total = (query: Record<string, string>, count: number) =>
  discover(
    { ...query, sort_by: 'popularity.desc', 'vote_count.gte': '0' },
    [],
    count,
  );

const best = (network: string, floor: string, ids: number[]) =>
  discover(
    {
      sort_by: 'vote_average.desc',
      'vote_count.gte': floor,
      with_networks: network,
    },
    ids,
  );

const trending = (ids: number[]) =>
  onGet('https://api.mdblist.com/lists/koenoe/trending/items', {
    shows: ids.map((id) => ({ id, mediaType: 'show', title: `Seed ${id}` })),
  });

const seed = (
  id: number,
  {
    creator,
    keywords = [],
    network,
  }: Readonly<{
    creator?: { id: number; name: string };
    keywords?: Array<[number, string]>;
    network?: { id: number; name: string };
  }>,
) => {
  onTmdb(`/tv/${id}`, {
    created_by: creator ? [{ ...creator, profile_path: null }] : [],
    id,
    name: `Seed ${id}`,
    networks: network ? [network] : [],
    poster_path: `/${id}.jpg`,
  });
  onTmdb(`/tv/${id}/keywords`, {
    id,
    results: keywords.map(([keywordId, name]) => ({ id: keywordId, name })),
  });
};

const goDeeper = async (date: string) => {
  const response = await request(`/discover/go-deeper?date=${date}`);
  expect(response.status).toBe(200);
  return response.json();
};

const ids = (items: Array<{ id: number }>) => items.map((item) => item.id);

describe('GET /discover/go-deeper', () => {
  it('rotates the Essentials network per day and builds a theme, creator and network card', async () => {
    // Essentials on 2026-11-13: Netflix
    best('213', '250', [901, 902, 903]);
    total({ with_networks: '213' }, 381);
    trending([1, 2, 3]);
    seed(1, {
      creator: { id: 7, name: 'Jane Doe' },
      // a keyword of dystopia's set other than its strongest
      keywords: [[12190, 'cyberpunk']],
      network: { id: 2552, name: 'Apple TV' },
    });
    // Theme: 901 is in the Essentials row above and 1 is the seed: both dropped
    discover(
      {
        sort_by: 'vote_average.desc',
        'vote_count.gte': '300',
        with_keywords: '4565|12190|178712',
      },
      [901, 1, 301, 302, 303, 304],
    );
    total({ with_keywords: '4565|12190|178712' }, 146);
    // Creator: 301 is in the theme card above
    onTmdb('/person/7/tv_credits', {
      cast: [],
      crew: [poster(301), poster(401), poster(402), poster(403), poster(1)],
      id: 7,
    });
    // Network
    best('2552', '500', [501, 502, 503, 504]);
    total({ with_networks: '2552' }, 244);

    const body = await goDeeper('2026-11-13');

    expect(body.date).toBe('2026-11-13');
    expect(body.essentials.network).toEqual({
      id: 213,
      name: 'Netflix',
      slug: 'netflix',
    });
    expect(body.essentials.total).toBe(381);
    expect(ids(body.essentials.items)).toEqual([901, 902, 903]);
    expect(
      body.cards.map(
        (card: {
          kind: string;
          from: { id: number };
          to: unknown;
          total: number;
        }) => ({
          from: card.from.id,
          kind: card.kind,
          to: card.to,
          total: card.total,
        }),
      ),
    ).toEqual([
      {
        from: 1,
        kind: 'theme',
        to: { id: 4565, name: 'Dystopia', slug: 'dystopia' },
        total: 146,
      },
      {
        from: 1,
        kind: 'creator',
        to: { id: 7, name: 'Jane Doe', slug: 'jane-doe' },
        total: 4,
      },
      {
        from: 1,
        kind: 'network',
        to: { id: 2552, name: 'Apple TV', slug: 'apple-tv' },
        total: 244,
      },
    ]);
    expect(
      body.cards.map((card: { items: Array<{ id: number }> }) =>
        ids(card.items),
      ),
    ).toEqual([
      [301, 302, 303],
      [401, 402, 403],
      [501, 502, 503],
    ]);
    // the keyword the seed carries, the theme it belongs to
    expect(body.cards[0].why).toBe('Also tagged cyberpunk, like Seed 1.');
  });

  it('is a different Essentials network and different seeds on another day', async () => {
    // 2026-11-12: BBC One, and the seeds start at the third one
    best('4', '250', [911, 912, 913]);
    total({ with_networks: '4' }, 900);
    trending([1, 2, 3]);
    seed(1, { creator: { id: 7, name: 'Jane Doe' } });
    seed(2, { network: { id: 49, name: 'HBO' } });
    seed(3, { keywords: [[4565, 'dystopia']] });
    discover(
      {
        sort_by: 'vote_average.desc',
        'vote_count.gte': '300',
        with_keywords: '4565|12190|178712',
      },
      [301, 302, 303],
    );
    total({ with_keywords: '4565|12190|178712' }, 146);
    best('49', '500', [601, 602, 603]);
    total({ with_networks: '49' }, 381);
    onTmdb('/person/7/tv_credits', {
      cast: [],
      crew: [poster(401), poster(402), poster(403)],
      id: 7,
    });

    const body = await goDeeper('2026-11-12');

    expect(body.essentials.network.slug).toBe('bbc-one');
    // the rank is the seed's place in the trending list, not in the day's rotation
    expect(
      body.cards.map(
        (card: { kind: string; from: { id: number; rank: number } }) => [
          card.kind,
          card.from.id,
          card.from.rank,
        ],
      ),
    ).toEqual([
      ['theme', 3, 3],
      ['creator', 1, 1],
      ['network', 2, 2],
    ]);
  });

  it('takes the next seed when a card is left with fewer than 3 shows', async () => {
    best('4', '250', [901, 902, 903]);
    total({ with_networks: '4' }, 381);
    trending([1, 2, 3]);
    seed(1, { keywords: [[4565, 'dystopia']] });
    seed(2, { keywords: [[10854, 'time loop']] });
    seed(3, {});
    // Seed 1's theme: only 2 shows are not in the row above
    discover(
      {
        sort_by: 'vote_average.desc',
        'vote_count.gte': '300',
        with_keywords: '4565|12190|178712',
      },
      [901, 902, 903, 301, 302],
    );
    discover(
      {
        sort_by: 'vote_average.desc',
        'vote_count.gte': '300',
        with_keywords: '4379|5455|10854',
      },
      [311, 312, 313],
    );
    total({ with_keywords: '4379|5455|10854' }, 50);

    const body = await goDeeper('2026-11-12');

    expect(body.cards).toHaveLength(1);
    expect(body.cards[0].from.id).toBe(2);
    expect(body.cards[0].to).toEqual({
      id: 4379,
      name: 'Time travel',
      slug: 'time-travel',
    });
  });

  it('leaves out an Essentials row under 3 posters, and the cards may use its shows', async () => {
    best('4', '250', [901, 902]);
    total({ with_networks: '4' }, 381);
    trending([1]);
    seed(1, { keywords: [[4565, 'dystopia']] });
    discover(
      {
        sort_by: 'vote_average.desc',
        'vote_count.gte': '300',
        with_keywords: '4565|12190|178712',
      },
      [901, 902, 301],
    );
    total({ with_keywords: '4565|12190|178712' }, 146);

    const body = await goDeeper('2026-11-12');

    expect(body.essentials.items).toEqual([]);
    expect(
      body.cards.map((card: { items: Array<{ id: number }> }) =>
        ids(card.items),
      ),
    ).toEqual([[901, 902, 301]]);
  });

  it('answers the same for the same day', async () => {
    best('4', '250', [901]);
    total({ with_networks: '4' }, 381);
    trending([]);

    expect(await goDeeper('2026-11-12')).toEqual(await goDeeper('2026-11-12'));
  });

  it('is cached for a day', async () => {
    best('4', '250', [901]);
    total({ with_networks: '4' }, 381);
    trending([]);

    const response = await request('/discover/go-deeper?date=2026-11-12');

    expect(response.headers.get('cache-control')).toContain('max-age=86400');
  });

  it('needs a real date within two days of today', async () => {
    for (const query of [
      '',
      '?date=tomorrow',
      '?date=2026-02-30',
      '?date=2026-11-20',
      '?date=2026-11-09',
    ]) {
      const response = await request(`/discover/go-deeper${query}`);
      expect(response.status, query).toBe(400);
    }
  });
});
