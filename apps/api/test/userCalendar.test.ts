import type { Calendar } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { seedLibrary, tmdbEpisode } from './library';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));
});

const provider = (name: string, logo: string) => ({
  flatrate: [{ logo_path: logo, provider_id: 1, provider_name: name }],
});

// The owner (OTHER_USER_ID, in NL) watches show 1, back on Dec 3, and hid
// show 2, back on Dec 10; the viewer (USER_ID) is in GB
const setup = () => {
  seedUser({ country: 'GB' });
  seedUser({ country: 'NL', id: OTHER_USER_ID });
  for (const [id, date] of [
    [1, '2026-12-03'],
    [2, '2026-12-10'],
  ] as const) {
    fakeShow({
      extra: { next_episode_to_air: tmdbEpisode(2, 1, date) },
      id,
      seasons: [
        { airDate: '2025-01-01', episodes: 8 },
        { airDate: date, aired: 0, episodes: 8 },
      ],
      status: 'Returning Series',
    });
    onTmdb(`/tv/${id}/season/2`, {
      episodes: [tmdbEpisode(2, 1, date)],
      id: id * 100 + 2,
      name: 'Season 2',
      season_number: 2,
    });
    onTmdb(`/tv/${id}/watch/providers`, {
      results: {
        GB: provider('GB service', '/gb.png'),
        NL: provider('NL service', '/nl.png'),
      },
    });
  }
  seedLibrary(OTHER_USER_ID, { IN_PROGRESS: [1, 2] });
  db.seed('Lists', [
    {
      paused: 'hide',
      pausedAt: 1,
      pk: `USER#${OTHER_USER_ID}`,
      seriesId: 2,
      sk: 'PREF#SERIES#2',
    },
  ]);
};

const calendarOf = (target: string, as?: string, query = '') =>
  request(`/user/${target}/calendar${query}`, { as });

describe("GET /user/:id/calendar: a profile owner's calendar for any signed-in viewer", () => {
  it("answers the owner's dates, privately, without their hidden shows", async () => {
    setup();

    const response = await calendarOf(OTHER_USER_ID, USER_ID);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const calendar = (await response.json()) as Calendar;
    expect(calendar.days).toEqual([
      expect.objectContaining({
        date: '2026-12-03',
        tickets: [expect.objectContaining({ seriesId: 1 })],
      }),
    ]);
    expect(calendar.shows.map((show) => show.seriesId)).toEqual([1]);
  });

  it("names the services where the viewer watches, not the owner's", async () => {
    setup();

    const saved = (await (
      await calendarOf(OTHER_USER_ID, USER_ID)
    ).json()) as Calendar;
    expect(saved.shows[0]?.provider?.name).toBe('GB service');

    // without a saved country, the web's region for the viewer
    seedUser({ country: '' });
    const unsaved = (await (
      await calendarOf(OTHER_USER_ID, USER_ID, '?region=NL')
    ).json()) as Calendar;
    expect(unsaved.shows[0]?.provider?.name).toBe('NL service');
  });

  it('gives the same calendar as /me/calendar on your own profile', async () => {
    setup();

    const own = await (await calendarOf(OTHER_USER_ID, OTHER_USER_ID)).json();
    const me = await (
      await request('/me/calendar', { as: OTHER_USER_ID })
    ).json();

    expect(own).toEqual(me);
  });

  it('needs a signed-in viewer', async () => {
    setup();

    expect((await calendarOf(OTHER_USER_ID)).status).toBe(401);
  });

  it('404s for an unknown user or one being deleted', async () => {
    setup();
    seedUser({ deletionRequestedAt: 1, id: '01JUSERCCCCCCCCCCCCCCCCCCC' });

    expect(
      (await calendarOf('01JUNKNOWNAAAAAAAAAAAAAAA', USER_ID)).status,
    ).toBe(404);
    expect(
      (await calendarOf('01JUSERCCCCCCCCCCCCCCCCCCC', USER_ID)).status,
    ).toBe(404);
  });
});
