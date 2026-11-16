import { describe, expect, it, vi } from 'vitest';

import { claim } from '@/lib/db/cache/singleFlight';
import { getSeriesFactsReport } from '@/lib/seriesFacts';

import {
  onGet,
  onTmdb,
  requestedUrls,
  resetRequests,
  setUpstreamConditions,
} from './fakeHttp';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

/**
 * What a cold person page costs TMDB for a prolific person, once the
 * shows' series facts are warm (every profile, Library and landing read keeps
 * them so). Before shared data this page made ~99 calls: tv_credits and the 8
 * undated lookups three times (Shows, Career, Collaborators each in their own
 * Lambda), 52 `/tv/:id` for the career bars, 15 aggregate credits, the person
 * three times, the external ids and Known for's search; and the signed-in
 * Watched line made 1 + 8 again on every view.
 */

const PERSON = 7;
const SHOWS = Array.from({ length: 60 }, (_, index) => 1000 + index);

const tmdbCalls = () =>
  requestedUrls().filter((url) => url.host === 'api.themoviedb.org');

const setup = () => {
  seedUser();
  onTmdb(`/person/${PERSON}`, { id: PERSON, name: 'Prolific Person' });
  onTmdb(`/person/${PERSON}/external_ids`, { id: PERSON });
  onTmdb('/search/person', { results: [] });
  onGet('https://query.wikidata.org/sparql', { results: { bindings: [] } });
  onTmdb(`/person/${PERSON}/tv_credits`, {
    cast: SHOWS.map((id, index) => ({
      character: `Role ${index}`,
      episode_count: 1 + (index % 30),
      // Every 8th show has no date yet: it is looked up for its status
      first_air_date: index % 8 === 0 ? null : `20${10 + (index % 15)}-01-01`,
      genre_ids: [18],
      id,
      name: `Show ${id}`,
      poster_path: `/p${id}.jpg`,
    })),
    crew: [],
  });
  for (const id of SHOWS) {
    onTmdb(`/tv/${id}`, {
      first_air_date: '2015-01-01',
      id,
      last_air_date: '2018-01-01',
      name: `Show ${id}`,
      seasons: [
        { air_date: '2015-01-01', episode_count: 10, season_number: 1 },
        { air_date: '2016-11-20', episode_count: 10, season_number: 2 },
      ],
      status: 'Ended',
    });
    onTmdb(`/tv/${id}/aggregate_credits`, { cast: [], crew: [] });
  }
};

const page = [
  `/person/${PERSON}`,
  `/person/${PERSON}/external-ids`,
  `/person/${PERSON}/shows`,
  `/person/${PERSON}/career`,
  `/person/${PERSON}/collaborators`,
  `/person/${PERSON}/family-and-awards`,
  `/person/${PERSON}/known-for`,
];

describe('a cold person page on shared data', () => {
  it('makes about 20 TMDB calls with the shows’ facts warm, not ~100', async () => {
    setup();
    await getSeriesFactsReport(SHOWS);
    resetRequests();

    for (const path of page) {
      expect((await request(path)).status).toBe(200);
    }

    const calls = tmdbCalls();
    // person, external ids, tv_credits, search, 15 aggregate credits
    expect(calls).toHaveLength(19);
    expect(
      calls.filter((url) => url.pathname === `/3/person/${PERSON}/tv_credits`),
    ).toHaveLength(1);
    expect(
      calls.filter((url) => /^\/3\/tv\/\d+$/.test(url.pathname)),
    ).toHaveLength(0);
  });

  it('gives the signed-in Watched line without a TMDB call', async () => {
    setup();
    await getSeriesFactsReport(SHOWS);
    await request(`/person/${PERSON}/shows`);
    resetRequests();

    const first = await request(`/me/person/${PERSON}/watched`, {
      as: USER_ID,
    });
    await request(`/me/person/${PERSON}/watched`, { as: USER_ID });

    expect(first.status).toBe(200);
    expect(tmdbCalls()).toHaveLength(0);
  });

  it('reads cold facts once per show, shared by Shows and Career', async () => {
    setup();

    await request(`/person/${PERSON}/shows`);
    await request(`/person/${PERSON}/career`);

    const detailCalls = tmdbCalls().filter((url) =>
      /^\/3\/tv\/\d+$/.test(url.pathname),
    );
    // Career's lookups (non-guest shows) include the undated ones: no show
    // is asked twice
    expect(new Set(detailCalls.map((url) => url.pathname)).size).toBe(
      detailCalls.length,
    );
  });
});

describe('person data lifetime (30 days fresh, then stale while one Lambda refreshes)', () => {
  const tvCredits = () =>
    requestedUrls().filter(
      (url) => url.pathname === `/3/person/${PERSON}/tv_credits`,
    );

  it('asks TMDB nothing for a person page within 30 days', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 1), toFake: ['Date'] });
    setup();
    for (const path of page) await request(path);
    resetRequests();
    vi.setSystemTime(Date.UTC(2026, 10, 29));

    for (const path of page.slice(0, 5)) await request(path);

    expect(tmdbCalls()).toHaveLength(1); // the external ids (long CDN life)
  });

  it('serves a person older than 30 days at once while another Lambda refreshes it, and when TMDB is down', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 1), toFake: ['Date'] });
    setup();
    await request(`/person/${PERSON}/shows`);
    vi.setSystemTime(Date.UTC(2027, 0, 15));
    resetRequests();
    // Another instance is refreshing the credits
    await claim(`refresh:person-credits:v3:${PERSON}`, 60);

    const shows = await request(`/person/${PERSON}/shows`);
    expect(shows.status).toBe(200);
    expect(tvCredits()).toHaveLength(0);

    setUpstreamConditions({ outage: { status: 503 } });
    vi.setSystemTime(Date.UTC(2027, 0, 16));
    expect((await request(`/person/${PERSON}/shows`)).status).toBe(200);
  });
});
