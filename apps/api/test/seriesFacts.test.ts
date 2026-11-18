import { describe, expect, it, vi } from 'vitest';

import { getSeriesFacts, getSeriesFactsReport } from '@/lib/seriesFacts';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';

describe('series facts', () => {
  it('reads the facts of many shows: two TMDB calls per show, cached after', async () => {
    fakeShow({
      extra: {
        episode_run_time: [45, 55],
        networks: [{ id: 49, logo_path: '/hbo.png', name: 'HBO' }],
        origin_country: ['US'],
        original_language: 'en',
        type: 'Miniseries',
      },
      id: 87108,
      name: 'Chernobyl',
      seasons: [{ airDate: '2019-05-06', episodes: 5, runtime: 60 }],
    });

    const first = await getSeriesFacts([87108, 999]);
    expect(first.get(999)).toBeUndefined();
    expect(first.get(87108)).toMatchObject({
      episodeRuntime: 50,
      id: 87108,
      networks: [{ id: 49, name: 'HBO' }],
      numberOfEpisodes: 5,
      originCountries: ['US'],
      seasons: [{ episodeCount: 5, seasonNumber: 1 }],
      title: 'Chernobyl',
      totalRuntime: 250,
      type: 'Miniseries',
    });

    // Served from the Cache table now, even with TMDB gone
    onTmdb('/tv/87108', {}, { status: 500 });
    const second = await getSeriesFacts([87108]);
    expect(second.get(87108)).toEqual(first.get(87108));
  });

  it('uses the last episode runtime when TMDB has no typical runtime', async () => {
    fakeShow({
      extra: { episode_run_time: [] },
      id: 1,
      seasons: [{ airDate: '2019-05-06', episodes: 4, runtime: 30 }],
    });
    onTmdb('/tv/1', {
      ...(await (await fetch('https://api.themoviedb.org/3/tv/1')).json()),
      last_episode_to_air: {
        air_date: '2019-05-27',
        episode_number: 4,
        id: 1,
        runtime: 28,
        season_number: 1,
      },
    });
    const facts = await getSeriesFacts([1]);
    expect(facts.get(1)).toMatchObject({
      episodeRuntime: 28,
      totalRuntime: 112,
    });
  });

  it('reports the shows TMDB failed to answer apart from the ones it does not know', async () => {
    fakeShow({ id: 1, seasons: [{ airDate: '2019-05-06', episodes: 4 }] });
    onTmdb('/tv/2', { status_message: 'boom' }, { status: 500 });

    const { facts, failed } = await getSeriesFactsReport([1, 2, 999]);

    expect([...facts.keys()]).toEqual([1]);
    expect([...failed]).toEqual([2]);
  });

  describe("the backdrop: the show page's default", () => {
    const backdrop = (path: string, language: string | null) => ({
      file_path: path,
      iso_639_1: language,
    });
    const showWithTitledBackdrop = () =>
      fakeShow({
        extra: { backdrop_path: '/titled.jpg', original_language: 'ja' },
        id: 7,
        seasons: [{ airDate: '2019-05-06', episodes: 4 }],
      });

    it('is the first text-free backdrop, the one the show page draws', async () => {
      showWithTitledBackdrop();
      onTmdb(
        '/tv/7/images',
        {
          backdrops: [
            backdrop('/titled.jpg', 'en'),
            backdrop('/plain.jpg', null),
            backdrop('/plain-2.jpg', null),
          ],
          logos: [],
        },
        // The show page's language rule: English, none, the original's
        { query: { include_image_language: 'en,null,ja' } },
      );

      const facts = await getSeriesFacts([7]);
      const page = (await (
        await request('/series/7?include_images=true')
      ).json()) as Readonly<{ backdropPath: string }>;

      expect(facts.get(7)?.backdropPath).toBe('/plain.jpg');
      expect(facts.get(7)?.backdropPath).toBe(page.backdropPath);
    });

    it("keeps TMDB's backdrop_path when the show has no images", async () => {
      showWithTitledBackdrop();

      const facts = await getSeriesFacts([7]);

      expect(facts.get(7)?.backdropPath).toBe('/titled.jpg');
    });

    it("keeps TMDB's backdrop_path when the images call fails", async () => {
      showWithTitledBackdrop();
      onTmdb('/tv/7/images', { status_message: 'boom' }, { status: 500 });
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { facts, failed } = await getSeriesFactsReport([7]);

      expect(failed.size).toBe(0);
      expect(facts.get(7)?.backdropPath).toBe('/titled.jpg');
    });
  });
});
