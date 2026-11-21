import { LambdaClient } from '@aws-sdk/client-lambda';
import { describe, expect, it, vi } from 'vitest';

import { getShow, getShows } from '@/lib/catalogue';
import { preferredImagesPk } from '@/lib/db/preferredImages/keys';

import { db } from './db';
import { onTmdb, requestedUrls } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';

/**
 * The show catalogue: one show from TMDB with the enrichment a caller asks
 * for, and the stored copies each use keeps (a container's, the Cache
 * table's) in front of TMDB.
 */

const tmdbPaths = () =>
  requestedUrls()
    .filter((url) => url.host === 'api.themoviedb.org')
    .map((url) => url.pathname);

const showWithBackdrop = (id: number) =>
  fakeShow({
    extra: {
      backdrop_path: `/backdrop-${id}.jpg`,
      networks: [{ id: 49, logo_path: '/hbo.png', name: 'HBO' }],
    },
    id,
    seasons: [{ airDate: '2020-01-01', episodes: 2 }],
  });

const imagesOf = (id: number) =>
  onTmdb(`/tv/${id}/images`, {
    backdrops: [{ file_path: `/clean-${id}.jpg`, iso_639_1: null }],
    logos: [],
    posters: [],
  });

describe('getShow', () => {
  it('reads only the details: no images, no picks, no image checks', async () => {
    showWithBackdrop(501);
    const lambda = vi.spyOn(LambdaClient.prototype, 'send');

    const show = await getShow(501);

    expect(show?.title).toBe('Show 501');
    expect(tmdbPaths()).toEqual(['/3/tv/501']);
    expect(lambda).not.toHaveBeenCalled();
  });

  it('artwork: TMDB’s images and the admin’s pick, no image checks', async () => {
    showWithBackdrop(502);
    imagesOf(502);
    db.seed('PreferredImages', [
      { backdropImagePath: '/picked.jpg', pk: preferredImagesPk(502) },
    ]);
    const lambda = vi.spyOn(LambdaClient.prototype, 'send');

    const show = await getShow(502, { artwork: true });

    expect(tmdbPaths()).toEqual(['/3/tv/502', '/3/tv/502/images']);
    expect(show?.backdropImage).toContain('/picked.jpg');
    expect(lambda).not.toHaveBeenCalled();
  });

  it('colour: the backdrop’s colour and the network logo check, no images call', async () => {
    showWithBackdrop(503);
    const lambda = vi.spyOn(LambdaClient.prototype, 'send');

    await getShow(503, { colour: true });

    expect(tmdbPaths()).toEqual(['/3/tv/503']);
    // one colour detection and one logo check (both fail in tests)
    expect(lambda).toHaveBeenCalledTimes(2);
  });

  it('undefined for a show TMDB doesn’t know', async () => {
    expect(await getShow(504)).toBeUndefined();
    expect(await getShow(504, { artwork: true, colour: true })).toBeUndefined();
  });
});

describe('getShows', () => {
  it('drops shows TMDB doesn’t know and keeps the order', async () => {
    showWithBackdrop(511);
    showWithBackdrop(513);

    const shows = await getShows([511, 512, 513]);

    expect(shows.map((show) => show.id)).toEqual([511, 513]);
  });

  it('colour: one batched colour read, no logo checks, the top cast', async () => {
    fakeShow({
      extra: {
        backdrop_path: '/backdrop-521.jpg',
        credits: {
          cast: [
            { name: 'B', order: 1 },
            { name: 'A', order: 0 },
          ],
        },
        networks: [{ id: 49, logo_path: '/hbo.png', name: 'HBO' }],
      },
      id: 521,
      seasons: [{ airDate: '2020-01-01', episodes: 1 }],
    });
    imagesOf(521);
    const lambda = vi.spyOn(LambdaClient.prototype, 'send');

    const [show] = await getShows([521], {
      artwork: true,
      cast: true,
      colour: true,
    });

    expect(show?.topCast).toEqual(['A', 'B']);
    // the colour batch only: a failed batch leaves the default colour
    expect(lambda).toHaveBeenCalledTimes(1);
  });
});
