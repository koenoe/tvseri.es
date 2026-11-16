import { LambdaClient } from '@aws-sdk/client-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { groundColor } from '@/lib/groundColor';

import { db } from './db';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

/**
 * Every page colour the API serves follows `groundColor` (white/60 text on
 * it at 4.5:1), whichever rule it was stored under, and nothing stored is
 * rewritten or deleted to get there.
 */

const MUSTARD = '#d9a521';
const SERVED_MUSTARD = groundColor(MUSTARD)!;
const PALE_SKY = '#a9c4d8';

const v1 = (path: string) => `CACHE#detectDominantColorFromImage:v1:${path}`;
const v2 = (path: string) => `CACHE#detectDominantColorFromImage:v2:${path}`;

const lambdaReturns = (color: string) =>
  vi.spyOn(LambdaClient.prototype, 'send').mockImplementation(async () => ({
    Payload: new TextEncoder().encode(JSON.stringify({ color })),
  }));

const seriesColor = async (id: number) =>
  (
    (await (await request(`/series/${id}`)).json()) as Readonly<{
      backdropColor: string;
    }>
  ).backdropColor;

const show = (id: number, backdrop: string) =>
  fakeShow({
    extra: { backdrop_path: backdrop },
    id,
    seasons: [{ airDate: '2020-01-01', episodes: 1 }],
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a series’ detected colour', () => {
  it('serves a colour stored under the old rule (v1) corrected, without rewriting it or calling the Lambda', async () => {
    const send = lambdaReturns('#000000');
    show(1, '/old.jpg');
    const stored = { pk: v1('/old.jpg'), value: MUSTARD };
    db.seed('Cache', [stored]);

    expect(await seriesColor(1)).toBe(SERVED_MUSTARD);
    expect(send).not.toHaveBeenCalled();
    expect(db.dump('Cache')).toEqual([stored]);
  });

  it('prefers the current key (v2) over the old one', async () => {
    show(2, '/both.jpg');
    db.seed('Cache', [
      { pk: v1('/both.jpg'), value: MUSTARD },
      { pk: v2('/both.jpg'), value: '#29251f' },
    ]);

    expect(await seriesColor(2)).toBe('#29251f');
  });

  it('stores a new detection corrected under v2, even from a Lambda on the old rule', async () => {
    lambdaReturns(PALE_SKY);
    show(3, '/new.jpg');

    expect(await seriesColor(3)).toBe(groundColor(PALE_SKY));
    expect(db.dump('Cache')).toEqual([
      expect.objectContaining({
        pk: v2('/new.jpg'),
        value: groundColor(PALE_SKY),
      }),
    ]);
  });

  it('GET /dominant-color answers with the corrected colour', async () => {
    db.seed('Cache', [{ pk: v1('/dc.jpg'), value: MUSTARD }]);

    const response = await request(
      `/dominant-color?url=${encodeURIComponent('https://image.tmdb.org/t/p/w780/dc.jpg')}`,
    );

    expect(await response.json()).toEqual({ hex: SERVED_MUSTARD });
  });
});

describe('an admin’s saved page colour', () => {
  const saved = (id: number, backdropColor: string) => ({
    backdropColor,
    backdropImagePath: '/picked.jpg',
    pk: `SERIES#${id}`,
    updatedAt: 1,
  });

  it('is served corrected on the series and in the picker, the stored pick untouched', async () => {
    show(4, '/auto.jpg');
    onTmdb('/tv/4/images', { backdrops: [], logos: [] });
    const item = saved(4, MUSTARD);
    db.seed('PreferredImages', [item]);

    expect(await seriesColor(4)).toBe(SERVED_MUSTARD);
    const images = (await (
      await request('/series/4/images')
    ).json()) as Readonly<{
      preferred: Readonly<{ backdropColor: string }>;
    }>;
    expect(images.preferred.backdropColor).toBe(SERVED_MUSTARD);
    expect(db.dump('PreferredImages')).toEqual([item]);
  });

  it('serves a malformed stored colour as the unknown colour', async () => {
    show(5, '/auto.jpg');
    db.seed('PreferredImages', [saved(5, 'red')]);

    expect(await seriesColor(5)).toBe('#000000');
  });

  describe('a new save', () => {
    beforeEach(() => {
      seedUser({ role: 'admin' });
    });

    it('stores the colour as it will be served', async () => {
      await request('/admin/preferred-images/series/6', {
        admin: true,
        as: USER_ID,
        body: { backdropColor: MUSTARD, backdropImagePath: '/picked.jpg' },
        method: 'PUT',
      });

      expect(db.dump('PreferredImages')[0]).toMatchObject({
        backdropColor: SERVED_MUSTARD,
      });
    });
  });
});
