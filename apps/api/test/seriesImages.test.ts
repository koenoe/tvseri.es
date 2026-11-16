import { beforeEach, describe, expect, it } from 'vitest';

import { db } from './db';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const backdrop = (
  path: string,
  vote: number,
  language: string | null = null,
) => ({
  aspect_ratio: 1.778,
  file_path: path,
  height: 1080,
  iso_639_1: language,
  vote_average: vote,
  width: 1920,
});

const logo = (
  path: string,
  vote: number,
  language: string | null,
  size: Readonly<{ width: number; height: number }> = {
    height: 300,
    width: 1200,
  },
) => ({
  aspect_ratio: size.width / size.height,
  file_path: path,
  height: size.height,
  iso_639_1: language,
  vote_average: vote,
  width: size.width,
});

const IMAGES = {
  backdrops: [
    // TMDB's own order: the first text-free one is the automatic backdrop
    backdrop('/text.jpg', 9, 'en'),
    backdrop('/auto.jpg', 5),
    backdrop('/top.jpg', 8),
  ],
  logos: [
    logo('/ja.png', 9, 'ja'),
    logo('/en.png', 6, 'en', { height: 678, width: 4318 }),
    logo('/en-2.svg', 7, 'en'),
  ],
};

type ImagesBody = Readonly<{
  automatic: Readonly<{
    backdropPath: string | null;
    titleTreatmentPath: string | null;
  }>;
  backdrops: ReadonlyArray<Readonly<{ path: string; url: string }>>;
  preferred: unknown;
  titleTreatment: ReadonlyArray<
    Readonly<{
      height: number;
      language: string | null;
      path: string;
      url: string;
      width: number;
    }>
  >;
}>;

const getImages = async (id: number) =>
  (await (
    await request(`/series/${id}/images?language=ja`)
  ).json()) as ImagesBody;

describe('GET /series/:id/images (admin image picker)', () => {
  it('lists text-free backdrops and every logo in vote order, logos with size and language', async () => {
    onTmdb('/tv/1/images', IMAGES);

    const body = await getImages(1);

    expect(body.backdrops.map((item) => item.path)).toEqual([
      '/top.jpg',
      '/auto.jpg',
    ]);
    expect(body.titleTreatment.map((item) => item.path)).toEqual([
      '/ja.png',
      '/en-2.svg',
      '/en.png',
    ]);
    expect(body.titleTreatment[2]).toMatchObject({
      height: 678,
      language: 'en',
      width: 4318,
    });
  });

  it('names the automatic images by the show page rule (first text-free backdrop, first English PNG/SVG logo)', async () => {
    onTmdb('/tv/2/images', IMAGES);

    const body = await getImages(2);

    expect(body.automatic).toEqual({
      backdropPath: '/auto.jpg',
      titleTreatmentPath: '/en.png',
    });
  });

  it('has null automatic paths when TMDB has nothing', async () => {
    onTmdb('/tv/3/images', { backdrops: [], logos: [] });

    const body = await getImages(3);

    expect(body.automatic).toEqual({
      backdropPath: null,
      titleTreatmentPath: null,
    });
    expect(body.preferred).toBeNull();
  });

  it('returns the saved pick so the strips can mark it', async () => {
    onTmdb('/tv/4/images', IMAGES);
    db.seed('PreferredImages', [
      {
        backdropColor: '#112233',
        backdropImagePath: '/top.jpg',
        pk: 'SERIES#4',
        titleTreatmentImagePath: '/en-2.svg',
        updatedAt: 1,
      },
    ]);

    const body = await getImages(4);

    expect(body.preferred).toEqual({
      backdropColor: '#112233',
      backdropImagePath: '/top.jpg',
      titleTreatmentImagePath: '/en-2.svg',
    });
  });
});

describe('the text title as a preferred title treatment', () => {
  beforeEach(() => {
    seedUser({ role: 'admin' });
  });

  it('accepts titleTreatment "text" from an admin', async () => {
    const response = await request('/admin/preferred-images/series/5', {
      admin: true,
      as: USER_ID,
      body: {
        backdropColor: '#112233',
        backdropImagePath: '/top.jpg',
        titleTreatment: 'text',
      },
      method: 'PUT',
    });

    expect(response.status).toBe(200);
    expect(db.dump('PreferredImages')[0]).toMatchObject({
      titleTreatment: 'text',
    });
  });

  it('refuses any other titleTreatment value', async () => {
    const response = await request('/admin/preferred-images/series/5', {
      admin: true,
      as: USER_ID,
      body: {
        backdropColor: '#112233',
        backdropImagePath: '/top.jpg',
        titleTreatment: 'logo',
      },
      method: 'PUT',
    });

    expect(response.status).toBe(400);
  });

  it('serves the show without a title treatment image when the text title is saved', async () => {
    fakeShow({ id: 6, seasons: [{ airDate: '2020-01-01', episodes: 1 }] });
    onTmdb('/tv/6/images', IMAGES);
    db.seed('PreferredImages', [
      {
        backdropColor: '#112233',
        backdropImagePath: '/top.jpg',
        pk: 'SERIES#6',
        titleTreatment: 'text',
      },
    ]);

    const body = (await (
      await request('/series/6?include_images=true')
    ).json()) as Readonly<{
      backdropColor: string;
      backdropImage: string;
      titleTreatmentImage?: string;
    }>;

    expect(body.titleTreatmentImage).toBeUndefined();
    expect(body.backdropColor).toBe('#112233');
    expect(body.backdropImage).toContain('/top.jpg');
  });
});

describe("the title treatment's aspect ratio on the series", () => {
  type Body = Readonly<{
    titleTreatmentAspectRatio?: number;
    titleTreatmentImage?: string;
  }>;

  const show = async (id: number) =>
    (await (await request(`/series/${id}?include_images=true`)).json()) as Body;

  it("is the automatic logo's, from the images response the show already reads", async () => {
    fakeShow({ id: 7, seasons: [{ airDate: '2020-01-01', episodes: 1 }] });
    onTmdb('/tv/7/images', IMAGES);

    const body = await show(7);

    expect(body.titleTreatmentImage).toContain('/en.png');
    expect(body.titleTreatmentAspectRatio).toBeCloseTo(4318 / 678);
  });

  it("is the picked logo's when an admin picked one", async () => {
    fakeShow({ id: 8, seasons: [{ airDate: '2020-01-01', episodes: 1 }] });
    onTmdb('/tv/8/images', IMAGES);
    db.seed('PreferredImages', [
      {
        backdropColor: '#112233',
        backdropImagePath: '/top.jpg',
        pk: 'SERIES#8',
        titleTreatmentImagePath: '/en-2.svg',
      },
    ]);

    const body = await show(8);

    expect(body.titleTreatmentImage).toContain('/en-2.svg');
    expect(body.titleTreatmentAspectRatio).toBe(4);
  });

  it('is absent without a logo, or with the text title picked', async () => {
    fakeShow({ id: 9, seasons: [{ airDate: '2020-01-01', episodes: 1 }] });
    onTmdb('/tv/9/images', { backdrops: [], logos: [] });
    expect(await show(9)).not.toHaveProperty('titleTreatmentAspectRatio');

    fakeShow({ id: 10, seasons: [{ airDate: '2020-01-01', episodes: 1 }] });
    onTmdb('/tv/10/images', IMAGES);
    db.seed('PreferredImages', [
      {
        backdropColor: '#112233',
        backdropImagePath: '/top.jpg',
        pk: 'SERIES#10',
        titleTreatment: 'text',
      },
    ]);
    expect(await show(10)).not.toHaveProperty('titleTreatmentAspectRatio');
  });
});
