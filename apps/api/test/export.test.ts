import type { ExportEverything } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const watched = (
  seriesId: number,
  season: number,
  episode: number,
  extra: Record<string, unknown> = {},
) => ({
  episodeNumber: episode,
  episodeTitle: `Ep ${episode}`,
  pk: `USER#${USER_ID}`,
  runtime: 45,
  seasonNumber: season,
  seriesId,
  sk: `SERIES#${seriesId}#S${String(season).padStart(3, '0')}#E${String(episode).padStart(3, '0')}`,
  title: `Show ${seriesId}`,
  userId: USER_ID,
  watchedAt: Date.parse('2025-07-02T20:58:00Z'),
  ...extra,
});

describe('B20e GET /me/export/history.csv', () => {
  it('needs a signed-in user', async () => {
    expect((await request('/me/export/history.csv')).status).toBe(401);
  });

  it('writes the importer columns, oldest first, an undated row with an empty date', async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    db.seed('Watched', [
      watched(2, 1, 1, {
        title: 'Fargo, "Year One"',
        watchedAt: Date.parse('2025-08-01T10:00:00Z'),
        watchProviderName: 'Netflix',
      }),
      watched(1, 1, 2),
      watched(1, 1, 1, {
        dateUnknown: true,
        watchedAt: Date.parse('2026-01-01T00:00:00Z'),
      }),
      {
        ...watched(9, 1, 1),
        pk: `USER#${OTHER_USER_ID}`,
        userId: OTHER_USER_ID,
      },
    ]);

    const response = await request('/me/export/history.csv', { as: USER_ID });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/csv; charset=utf-8',
    );
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="tvseries-history-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toBe(
      [
        'title,season,episode,date,watchProvider',
        'Show 1,1,2,2025-07-02,',
        '"Fargo, ""Year One""",1,1,2025-08-01,Netflix',
        'Show 1,1,1,,',
        '',
      ].join('\r\n'),
    );
  });

  it('is just the header for a user without history', async () => {
    seedUser();

    const response = await request('/me/export/history.csv', { as: USER_ID });

    expect(await response.text()).toBe(
      'title,season,episode,date,watchProvider\r\n',
    );
  });
});

describe('B20e GET /me/export/everything.json', () => {
  it('has the profile, lists, watched, prefs, follows and the Plex link, without secrets', async () => {
    seedUser({ country: 'NL', name: 'Wren' });
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    db.seed('Watched', [
      watched(1, 1, 1, { dateUnknown: true }),
      watched(1, 1, 2, { watchProviderName: 'Netflix' }),
    ]);
    db.seed('Lists', [
      {
        createdAt: 5,
        pk: `USER#${USER_ID}`,
        sk: 'LIST#FAVORITES#ITEM#1',
        title: 'Show 1',
      },
      {
        createdAt: 6,
        pk: `USER#${USER_ID}`,
        sk: 'LIST#WATCHLIST#ITEM#2',
        title: 'Show 2',
      },
      {
        pk: `USER#${USER_ID}`,
        sk: 'PREF#SERIES#1',
        skipped: new Set(['S01E03']),
      },
    ]);
    db.seed('Follow', [
      {
        followerId: USER_ID,
        followingId: OTHER_USER_ID,
        gsi1pk: `USER#${OTHER_USER_ID}#FOLLOWERS`,
        gsi1sk: `1#${USER_ID}`,
        gsi2pk: `USER#${USER_ID}#FOLLOWING`,
        gsi2sk: `1#${OTHER_USER_ID}`,
        pk: `FOLLOW#${USER_ID}#${OTHER_USER_ID}`,
        sk: `FOLLOW#${USER_ID}#${OTHER_USER_ID}`,
      },
    ]);
    db.seed('WebhookTokens', [
      {
        gsi1pk: `USER#${USER_ID}#TYPE#plex`,
        pk: 'TOKEN#super-secret-token',
        token: 'super-secret-token',
        type: 'plex',
        userId: USER_ID,
      },
    ]);

    const response = await request('/me/export/everything.json', {
      as: USER_ID,
    });
    const text = await response.text();
    const body = JSON.parse(text) as ExportEverything;

    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="tvseries-everything-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(text).not.toContain('super-secret-token');
    expect(body.profile).toMatchObject({
      country: 'NL',
      id: USER_ID,
      name: 'Wren',
    });
    expect(body.profile).not.toHaveProperty('role');
    expect(body.profile).not.toHaveProperty('version');
    expect(body.lists).toEqual({
      FAVORITES: [{ addedAt: 5, id: 1, title: 'Show 1' }],
      WATCHLIST: [{ addedAt: 6, id: 2, title: 'Show 2' }],
    });
    expect(
      body.watched.map((w) => [
        w.episodeNumber,
        w.watchedAt === null,
        w.watchProvider,
      ]),
    ).toEqual(
      [
        [1, true, null],
        [2, false, 'Netflix'],
      ].sort(),
    );
    expect(body.prefs).toEqual([
      expect.objectContaining({ seriesId: 1, skipped: ['S01E03'] }),
    ]);
    expect(body.following).toEqual([{ id: OTHER_USER_ID, username: 'other' }]);
    expect(body.followers).toEqual([]);
    expect(body.connections).toEqual({ plex: true });
  });

  it('says no Plex link when there is none', async () => {
    seedUser();

    const body = (await (
      await request('/me/export/everything.json', { as: USER_ID })
    ).json()) as ExportEverything;

    expect(body.connections).toEqual({ plex: false });
    expect(body.watched).toEqual([]);
  });
});
