import { describe, expect, it } from 'vitest';

import { onTmdb } from './fakeHttp';
import { request } from './request';

const tv = (
  id: number,
  name: string,
  popularity: number,
  poster = '/p.jpg',
) => ({
  id,
  name,
  popularity,
  poster_path: poster,
});

const person = (
  id: number,
  name: string,
  popularity: number,
  profile: string | null = '/face.jpg',
  knownFor: ReadonlyArray<Record<string, unknown>> = [],
) => ({
  id,
  known_for: knownFor,
  known_for_department: 'Acting',
  name,
  popularity,
  profile_path: profile,
});

const search = async (q: string) => {
  const response = await request(`/search?q=${encodeURIComponent(q)}`);
  return {
    body: (await response.json()) as {
      best: string | null;
      people: Array<Record<string, unknown>>;
      series: Array<{ title: string }>;
    },
    response,
  };
};

describe('B07 GET /search', () => {
  it('rejects a missing, blank or too long query', async () => {
    expect((await request('/search')).status).toBe(400);
    expect((await request('/search?q=%20%20')).status).toBe(400);
    expect((await request(`/search?q=${'a'.repeat(101)}`)).status).toBe(400);
  });

  it('puts the exact title first and tags it as the best match', async () => {
    onTmdb('/search/tv', {
      results: [
        tv(1, 'Breaking Bad Fans', 90),
        tv(2, 'Better Call Saul', 70),
        tv(3, 'Breaking Bad', 60),
        tv(4, 'Making Breaking Bad', 80),
      ],
    });
    onTmdb('/search/person', { results: [] });

    const { body, response } = await search('Breaking  Bad ');

    expect(body.series.map((s) => s.title)).toEqual([
      'Breaking Bad',
      'Breaking Bad Fans',
      'Making Breaking Bad',
      'Better Call Saul',
    ]);
    expect(body.best).toBe('series');
    expect(response.headers.get('cache-control')).toContain('s-maxage');
  });

  it('keeps 8 shows with a poster and 4 people with a photo', async () => {
    onTmdb('/search/tv', {
      results: [
        ...Array.from({ length: 10 }, (_, i) => tv(i + 1, `Bry ${i}`, 10 - i)),
        tv(99, 'Bry no poster', 100, ''),
      ],
    });
    onTmdb('/search/person', {
      results: [
        person(1, 'Bry A', 5, null),
        ...Array.from({ length: 5 }, (_, i) => person(i + 10, `Bry P${i}`, 5)),
      ],
    });

    const { body } = await search('bry');

    expect(body.series).toHaveLength(8);
    expect(body.series.map((s) => s.title)).not.toContain('Bry no poster');
    expect(body.people).toHaveLength(4);
    expect(body.people.map((p) => p.id)).not.toContain(1);
  });

  it('draws a person with a face, department and known-for titles', async () => {
    onTmdb('/search/tv', { results: [] });
    onTmdb('/search/person', {
      results: [
        person(17419, 'Bryan Cranston', 50, '/bc.jpg', [
          { id: 1396, media_type: 'tv', name: 'Breaking Bad' },
          { id: 2, media_type: 'movie', title: 'Argo' },
          { id: 3, media_type: 'movie', title: 'Drive' },
        ]),
      ],
    });

    const { body } = await search('bryan cranston');

    expect(body.best).toBe('people');
    expect(body.people).toEqual([
      {
        id: 17419,
        image: expect.stringContaining('/bc.jpg'),
        knownFor: ['Breaking Bad', 'Argo'],
        knownForDepartment: 'Acting',
        name: 'Bryan Cranston',
        slug: 'bryan-cranston',
      },
    ]);
  });

  it('lists the show first on a tie of tier and popularity', async () => {
    onTmdb('/search/tv', { results: [tv(1, 'The Bear', 80)] });
    onTmdb('/search/person', { results: [person(2, 'The Bear', 80)] });

    expect((await search('the bear')).body.best).toBe('series');
  });

  it('lets a person with an exact name beat a show that only starts with it', async () => {
    onTmdb('/search/tv', { results: [tv(1, 'Bryan Adams Live', 99)] });
    onTmdb('/search/person', { results: [person(2, 'Bryan', 1)] });

    expect((await search('bryan')).body.best).toBe('people');
  });

  it('ranks a match on any word by popularity: a surname finds the famous one', async () => {
    onTmdb('/search/tv', { results: [tv(1, 'Cranston Hall', 2)] });
    onTmdb('/search/person', {
      results: [
        person(2, 'Cranston Johnson', 1),
        person(3, 'Bryan Cranston', 60),
      ],
    });

    const { body } = await search('cranston');

    // Enter opens the first cell of the best block: Bryan Cranston
    expect(body.best).toBe('people');
    expect(body.people.map((p) => p.name)).toEqual([
      'Bryan Cranston',
      'Cranston Johnson',
    ]);
  });

  it('keeps an exact name above any word match, and a word match above a mid-word one', async () => {
    onTmdb('/search/tv', {
      results: [
        tv(1, 'Lostboys', 99),
        tv(2, 'Lost in Space', 50),
        tv(3, 'Lost', 10),
      ],
    });
    onTmdb('/search/person', { results: [] });

    expect((await search('lost')).body.series.map((s) => s.title)).toEqual([
      'Lost',
      'Lost in Space',
      'Lostboys',
    ]);
  });

  it('returns nothing found as empty lists', async () => {
    onTmdb('/search/tv', { results: [] });
    onTmdb('/search/person', { results: [] });

    expect((await search('zzzz')).body).toEqual({
      best: null,
      people: [],
      series: [],
    });
  });
});
