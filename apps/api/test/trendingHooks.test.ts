import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { onGet, onTmdb } from './fakeHttp';
import { request } from './request';

/**
 * `/collection/trending` carries what the spotlight's derived hook line
 * needs (rule 3): the top three cast and a
 * creator's best-known other show.
 */

const trending = (ids: number[]) =>
  onGet('https://api.mdblist.com/lists/koenoe/trending/items', {
    shows: ids.map((id) => ({ id, mediaType: 'show', title: `Show ${id}` })),
  });

const castMember = (name: string, order: number) => ({
  character: 'Someone',
  id: order + 100,
  name,
  order,
});

const show = (
  id: number,
  name: string,
  fields: Readonly<Record<string, unknown>> = {},
) => {
  // The backdrop's colour is known, so no colour detection runs
  db.seed('Cache', [
    {
      pk: `CACHE#detectDominantColorFromImage:v1:/b${id}.jpg`,
      value: '#112233',
    },
  ]);
  onTmdb(`/tv/${id}`, {
    backdrop_path: `/b${id}.jpg`,
    created_by: [],
    credits: { cast: [] },
    external_ids: { imdb_id: null },
    genres: [{ id: 18, name: 'Drama' }],
    id,
    name,
    poster_path: `/p${id}.jpg`,
    status: 'Returning Series',
    tagline: '',
    vote_count: 500,
    ...fields,
  });
  onTmdb(`/tv/${id}/images`, { backdrops: [], logos: [], posters: [] });
};

const creator = (id: number, name: string) => ({
  id,
  name,
  profile_path: null,
});

const created = (id: number, name: string, voteCount: number) => ({
  department: 'Creator',
  id,
  job: 'Creator',
  name,
  vote_count: voteCount,
});

const personCredits = (
  personId: number,
  crew: ReadonlyArray<Readonly<Record<string, unknown>>>,
) => onTmdb(`/person/${personId}/tv_credits`, { cast: [], crew, id: personId });

const get = async () => {
  const response = await request('/collection/trending');
  const items = (await response.json()) as TvSeries[];
  return {
    byTitle: new Map(items.map((item) => [item.title, item])),
    items,
    status: response.status,
  };
};

describe('GET /collection/trending: the hook line’s facts', () => {
  it('names the top three cast in billing order', async () => {
    show(1, 'MobLand', {
      credits: {
        cast: [
          castMember('Paddy Considine', 3),
          castMember('Helen Mirren', 1),
          castMember('Tom Hardy', 0),
          castMember('Pierce Brosnan', 2),
        ],
      },
    });
    trending([1]);

    const { byTitle, status } = await get();

    expect(status).toBe(200);
    expect(byTitle.get('MobLand')?.topCast).toEqual([
      'Tom Hardy',
      'Helen Mirren',
      'Pierce Brosnan',
    ]);
  });

  it('gives the title treatment its aspect ratio, so the spotlight can reserve its box', async () => {
    show(1, 'MobLand');
    onTmdb('/tv/1/images', {
      backdrops: [],
      logos: [
        {
          aspect_ratio: 3.2,
          file_path: '/logo.png',
          height: 500,
          iso_639_1: 'en',
          width: 1600,
        },
      ],
      posters: [],
    });
    trending([1]);

    const { byTitle } = await get();

    expect(byTitle.get('MobLand')).toMatchObject({
      titleTreatmentAspectRatio: 3.2,
      titleTreatmentImage: expect.stringContaining('/logo.png'),
    });
  });

  it('names a creator’s best-known other show when it has more votes than this one', async () => {
    show(1, 'Pluribus', {
      created_by: [creator(10, 'Vince Gilligan')],
      vote_count: 600,
    });
    personCredits(10, [
      created(1, 'Pluribus', 600),
      created(60059, 'Better Call Saul', 5000),
      created(1396, 'Breaking Bad', 15000),
      // Written, not created: never counts
      {
        ...created(2, 'The X-Files', 90000),
        department: 'Writing',
        job: 'Writer',
      },
    ]);
    trending([1]);

    const { byTitle } = await get();

    expect(byTitle.get('Pluribus')?.creatorOf).toEqual({
      title: 'Breaking Bad',
    });
  });

  it('picks the best show across the creators', async () => {
    show(1, 'Task', {
      created_by: [creator(10, 'Writer A'), creator(11, 'Writer B')],
    });
    personCredits(10, [created(5, 'Smaller Show', 900)]);
    personCredits(11, [created(6, 'Mare of Easttown', 4000)]);
    trending([1]);

    const { byTitle } = await get();

    expect(byTitle.get('Task')?.creatorOf).toEqual({
      title: 'Mare of Easttown',
    });
  });

  it('names none when the creators’ other shows are less known', async () => {
    show(1, 'Stranger Things', {
      created_by: [creator(10, 'Matt Duffer'), creator(11, 'Ross Duffer')],
      vote_count: 18000,
    });
    personCredits(10, [
      created(1, 'Stranger Things', 18000),
      created(7, 'Spin-off', 200),
    ]);
    personCredits(11, [created(1, 'Stranger Things', 18000)]);
    trending([1]);

    const { byTitle } = await get();

    expect(byTitle.get('Stranger Things')?.creatorOf).toBeNull();
  });

  it('names none without creators, and a person TMDB doesn’t know counts as none', async () => {
    show(1, 'No Creators');
    show(2, 'Unknown Creator', { created_by: [creator(404, 'Nobody')] });
    onTmdb(
      '/person/404/tv_credits',
      { status_message: 'nope' },
      { status: 404 },
    );
    trending([1, 2]);

    const { byTitle } = await get();

    expect(byTitle.get('No Creators')?.creatorOf).toBeNull();
    expect(byTitle.get('Unknown Creator')?.creatorOf).toBeNull();
  });

  it('looks each creator up once a week through the Cache table', async () => {
    show(1, 'Pluribus', { created_by: [creator(10, 'Vince Gilligan')] });
    personCredits(10, [created(1396, 'Breaking Bad', 15000)]);
    trending([1]);

    await get();

    const stored = db
      .dump('Cache')
      .find((item) => item.pk === 'CACHE#person-created:v1:10');
    const daysLeft =
      (Number(stored?.expiresAt) - Date.now() / 1000) / (24 * 60 * 60);
    expect(daysLeft).toBeCloseTo(7, 0);
  });

  it('answers from the cached lookup without asking TMDB', async () => {
    show(1, 'Pluribus', { created_by: [creator(10, 'Vince Gilligan')] });
    db.seed('Cache', [
      {
        pk: 'CACHE#person-created:v1:10',
        value: JSON.stringify([
          { id: 1396, title: 'Breaking Bad', voteCount: 15000 },
        ]),
      },
    ]);
    // No /person/10/tv_credits on the fake TMDB: a request would 404
    trending([1]);

    const { byTitle } = await get();

    expect(byTitle.get('Pluribus')?.creatorOf).toEqual({
      title: 'Breaking Bad',
    });
  });

  it('looks up at most two creators per show', async () => {
    show(1, 'Writers Room', {
      created_by: [creator(10, 'A'), creator(11, 'B'), creator(12, 'C')],
    });
    personCredits(10, []);
    personCredits(11, []);
    personCredits(12, [created(9, 'Big Show', 99000)]);
    trending([1]);

    const { byTitle } = await get();

    expect(byTitle.get('Writers Room')?.creatorOf).toBeNull();
  });

  it('keeps everything else the show had', async () => {
    show(1, 'Pluribus', {
      tagline: 'Vince Gilligan’s first show since Better Call Saul',
    });
    trending([1]);

    const { byTitle } = await get();
    const pluribus = byTitle.get('Pluribus');

    expect(pluribus?.tagline).toBe(
      'Vince Gilligan’s first show since Better Call Saul',
    );
    expect(pluribus?.backdropColor).toBe('#112233');
    expect(pluribus?.createdBy).toEqual([]);
  });
});
