import { describe, expect, it } from 'vitest';

import { getSeriesFacts, getSeriesFactsReport } from '@/lib/seriesFacts';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';

describe('series facts', () => {
  it('reads the facts of many shows: one TMDB call per show, cached after', async () => {
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

  it('carries each season’s first episode number where TMDB numbers on across seasons', async () => {
    fakeShow({
      id: 31910,
      numberedOn: true,
      seasons: [
        { airDate: '2007-02-15', episodes: 32 },
        { airDate: '2007-10-04', episodes: 21 },
        { airDate: '2008-03-20', episodes: 18 },
      ],
    });
    fakeShow({
      id: 1396,
      seasons: [
        { airDate: '2008-01-20', episodes: 7 },
        { airDate: '2009-03-08', episodes: 13 },
      ],
    });

    const facts = await getSeriesFacts([31910, 1396]);
    expect(facts.get(31910)?.seasons).toEqual([
      { airDate: '2007-02-15', episodeCount: 32, seasonNumber: 1 },
      {
        airDate: '2007-10-04',
        episodeCount: 21,
        firstEpisodeNumber: 33,
        seasonNumber: 2,
      },
      {
        airDate: '2008-03-20',
        episodeCount: 18,
        firstEpisodeNumber: 54,
        seasonNumber: 3,
      },
    ]);
    expect(facts.get(1396)?.seasons).toEqual([
      { airDate: '2008-01-20', episodeCount: 7, seasonNumber: 1 },
      { airDate: '2009-03-08', episodeCount: 13, seasonNumber: 2 },
    ]);
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
});
