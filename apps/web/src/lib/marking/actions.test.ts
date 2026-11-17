import type { Season } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import {
  bulkLibrary,
  markEpisodes,
  markScope,
  removeFromInProgress,
  restoreToInProgress,
  setInList,
  unmarkEpisodes,
  unmarkScope,
  updateSeriesPrefs,
} from './actions';
import { PartialWriteError } from './server/api';

const USER = { country: 'GB', id: 'user-1', watchProviders: [] };

vi.mock('@/auth', () => ({
  default: vi.fn(async () => ({ accessToken: 'token', user: USER })),
}));
vi.mock('@/auth/viewer', () => ({
  getViewer: vi.fn(async () => ({
    accessToken: 'token',
    id: 'user-1',
    role: 'user',
  })),
}));
vi.mock('@/lib/geo', () => ({ resolveRegion: vi.fn(async () => 'GB') }));
vi.mock('@/lib/series/loaders', () => ({
  loadSeason: vi.fn(async () => ({
    episodes: [
      {
        airDate: '2024-06-26',
        episodeNumber: 5,
        hasAired: true,
        runtime: 35,
        seasonNumber: 3,
        stillPath: '/s.jpg',
        title: 'Children',
      },
    ],
    seasonNumber: 3,
  })),
  loadWatchProviders: vi.fn(async () => []),
}));
vi.mock('@/lib/series/forWrite', () => ({
  loadSeriesForWrite: vi.fn(async () => ({
    id: 136315,
    posterPath: '/p.jpg',
    seasons: [],
    slug: 'the-bear',
    status: 'Ended',
    title: 'The Bear',
  })),
}));
// The real stats helper over Next's cache: the tests see the tag it expires
const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('./server/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./server/api')>()),
  addToList: vi.fn(async () => {}),
  deleteScope: vi.fn(async () => {}),
  patchPrefs: vi.fn(async () => ({})),
  postBatch: vi.fn(async () => [
    { episodeNumber: 5, runtime: 35, seasonNumber: 3, watchedAt: 1 },
  ]),
  postBatchDelete: vi.fn(async () => {}),
  postScope: vi.fn(async () => []),
  removeFromList: vi.fn(async () => {}),
}));

const api = await import('./server/api');

const EPISODE = { episodeNumber: 5, seasonNumber: 3 };

const STATS_TAG = 'stats:user-1';

describe('marking actions refresh the viewer’s own stats', () => {
  beforeEach(() => {
    revalidateTag.mockReset();
  });

  it('after a mark, an unmark and the season and show writes', async () => {
    await markEpisodes({
      episodes: [{ ...EPISODE, when: { kind: 'now' } }],
      seriesId: 136315,
    });
    await unmarkEpisodes({ episodes: [EPISODE], seriesId: 136315 });
    await markScope({
      seasonNumber: 3,
      seriesId: 136315,
      when: { kind: 'now' },
    });
    await unmarkScope({ seriesId: 136315 });
    expect(revalidateTag).toHaveBeenCalledTimes(4);
    expect(revalidateTag).toHaveBeenCalledWith(STATS_TAG, 'max');
  });

  it('after a write that saved part of it, not after one that saved nothing', async () => {
    vi.mocked(api.postBatch).mockRejectedValueOnce(
      new PartialWriteError(new Error('boom'), {
        watched: [
          { episodeNumber: 5, runtime: 35, seasonNumber: 3, watchedAt: 1 },
        ],
      }),
    );
    const partial = await markEpisodes({
      episodes: [{ ...EPISODE, when: { kind: 'now' } }],
      seriesId: 136315,
    });
    // the client keeps what was saved and rolls back only the rest
    expect(partial).toMatchObject({
      ok: false,
      partial: { watched: [{ episodeNumber: 5, seasonNumber: 3 }] },
    });
    expect(revalidateTag).toHaveBeenCalledTimes(1);

    vi.mocked(api.postBatchDelete).mockRejectedValueOnce(new Error('down'));
    await unmarkEpisodes({ episodes: [EPISODE], seriesId: 136315 });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
  });

  it('after a favourites toggle, not after the watchlist or prefs', async () => {
    await setInList({ list: 'favorites', seriesId: 136315, value: true });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    await setInList({ list: 'watchlist', seriesId: 136315, value: true });
    await updateSeriesPrefs(136315, { neverAskBefore: true });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
  });

  it('not after a write the API refused', async () => {
    vi.mocked(api.postBatch).mockRejectedValueOnce(new Error('down'));
    vi.mocked(api.postScope).mockRejectedValueOnce(new Error('down'));
    vi.mocked(api.deleteScope).mockRejectedValueOnce(new Error('down'));
    vi.mocked(api.addToList).mockRejectedValueOnce(new Error('down'));
    const results = [
      await markEpisodes({
        episodes: [{ ...EPISODE, when: { kind: 'now' } }],
        seriesId: 136315,
      }),
      await markScope({ seriesId: 136315, when: { kind: 'unknown' } }),
      await unmarkScope({ seasonNumber: 3, seriesId: 136315 }),
      await setInList({ list: 'favorites', seriesId: 136315, value: true }),
    ];
    expect(results.map((result) => result.ok)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('a failed refresh never turns a saved write into an error', async () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('cache unavailable');
    });
    const marked = await markEpisodes({
      episodes: [{ ...EPISODE, when: { kind: 'now' } }],
      seriesId: 136315,
    });
    // "Finished it all" from the first-tracking prompt: the whole show
    const finished = await markScope({
      seriesId: 136315,
      when: { kind: 'unknown' },
    });
    const unmarked = await unmarkScope({ seasonNumber: 3, seriesId: 136315 });
    const favourite = await setInList({
      list: 'favorites',
      seriesId: 136315,
      value: false,
    });
    expect([marked.ok, finished.ok, unmarked.ok, favourite.ok]).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(revalidateTag).toHaveBeenCalledTimes(4);
  });
});

describe('hide and the Library’s bulk actions (lists and prefs only)', () => {
  const WATCHED = ['postBatch', 'postBatchDelete', 'postScope', 'deleteScope'];

  beforeEach(() => {
    vi.mocked(api.addToList).mockClear();
    vi.mocked(api.removeFromList).mockReset().mockResolvedValue(undefined);
    vi.mocked(api.patchPrefs).mockClear();
    for (const name of WATCHED) {
      vi.mocked(api[name as 'postBatch']).mockClear();
    }
    revalidateTag.mockReset();
  });

  const noWatchedWrite = () => {
    for (const name of WATCHED) {
      expect(api[name as 'postBatch'], name).not.toHaveBeenCalled();
    }
  };

  it('hides and brings back through the paused pref', async () => {
    await removeFromInProgress({ seriesId: 136315 });
    await restoreToInProgress({ seriesId: 136315 });
    expect(api.patchPrefs).toHaveBeenNthCalledWith(1, 'token', 136315, {
      paused: 'hide',
    });
    expect(api.patchPrefs).toHaveBeenNthCalledWith(2, 'token', 136315, {
      paused: null,
    });
    expect(api.removeFromList).not.toHaveBeenCalled();
    noWatchedWrite();
  });

  it('runs every op without a watched write', async () => {
    for (const op of [
      'favourites-add',
      'favourites-remove',
      'hide',
      'unhide',
      'watchlist-add',
      'watchlist-remove',
    ] as const) {
      const result = await bulkLibrary({ items: [{ id: 136315 }], op });
      expect(result, op).toMatchObject({
        data: { done: [136315], failed: [] },
        ok: true,
      });
    }
    noWatchedWrite();
  });

  it('re-adds with the original date', async () => {
    await bulkLibrary({
      items: [{ addedAt: 1_700_000_000_000, id: 136315 }],
      op: 'watchlist-add',
    });
    expect(api.addToList).toHaveBeenCalledWith(
      { accessToken: 'token', userId: 'user-1' },
      'watchlist',
      expect.objectContaining({ id: 136315 }),
      1_700_000_000_000,
    );
  });

  it('answers which shows failed, and refreshes Stats after favourites', async () => {
    vi.mocked(api.removeFromList).mockImplementation(
      async (_auth, _list, id) => {
        if (id === 2) {
          throw new ApiError(500);
        }
      },
    );
    const result = await bulkLibrary({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      op: 'favourites-remove',
    });
    expect(result).toMatchObject({
      data: { done: [1, 3], failed: [2] },
      ok: true,
    });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
  });

  it('refuses more than 50 shows, and an op it doesn’t know', async () => {
    const items = Array.from({ length: 51 }, (_, index) => ({ id: index + 1 }));
    expect(await bulkLibrary({ items, op: 'hide' })).toMatchObject({
      error: 'invalid',
      ok: false,
    });
    expect(
      await bulkLibrary({
        items: [{ id: 1 }],
        op: 'unmark' as 'hide',
      }),
    ).toMatchObject({ error: 'invalid', ok: false });
    expect(api.patchPrefs).not.toHaveBeenCalled();
  });
});

describe('the show read does not wait for the profile', () => {
  it.each([
    [
      'markEpisodes',
      () =>
        markEpisodes({
          episodes: [{ ...EPISODE, when: { kind: 'now' } }],
          seriesId: 136315,
        }),
    ],
    ['markScope', () => markScope({ seriesId: 136315, when: { kind: 'now' } })],
  ])(
    '%s starts the cached series read while GET /me is on its way',
    async (_, run) => {
      const { default: auth } = await import('@/auth');
      const { loadSeriesForWrite } = await import('@/lib/series/forWrite');
      type Session = Awaited<ReturnType<typeof auth>>;
      let resolveSession: (value: Session) => void = () => {};
      vi.mocked(auth).mockImplementationOnce(
        () =>
          new Promise<Session>((resolve) => {
            resolveSession = resolve;
          }),
      );
      vi.mocked(loadSeriesForWrite).mockClear();
      const result = run();
      await vi.waitFor(() => expect(loadSeriesForWrite).toHaveBeenCalled());
      resolveSession({
        accessToken: 'token',
        user: USER,
      } as unknown as Session);
      expect((await result).ok).toBe(true);
    },
  );

  it('answers a signed-out mark unauthenticated', async () => {
    const { default: auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof auth>>,
    );
    const result = await markScope({ seriesId: 136315, when: { kind: 'now' } });
    expect(result).toMatchObject({ error: 'unauthenticated', ok: false });
  });
});

describe('markEpisodes: a restore, and a plain mark', () => {
  it('a restore reaches the API exactly; a mark gets the show’s service', async () => {
    const { loadWatchProviders } = await import('@/lib/series/loaders');
    const netflix = { id: 8, logo: '', logoPath: '/n.jpg', name: 'Netflix' };
    vi.mocked(loadWatchProviders).mockResolvedValue([netflix]);
    const importId = '7f9c2c1e-5b8a-4d3e-9f10-2a6b8c4d5e6f';
    vi.mocked(api.postBatch).mockClear();

    const restored = await markEpisodes({
      episodes: [
        {
          ...EPISODE,
          when: {
            dateUnknown: true,
            importId,
            kind: 'restore',
            source: 'Plex',
            watchedAt: Date.UTC(2024, 0, 1),
          },
        },
      ],
      seriesId: 136315,
    });
    expect(restored.ok).toBe(true);
    expect(vi.mocked(api.postBatch).mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({
        dateUnknown: true,
        importId,
        watchedAt: Date.UTC(2024, 0, 1),
        watchProvider: expect.objectContaining({ id: 0, name: 'Plex' }),
      }),
    ]);

    await markEpisodes({
      episodes: [{ ...EPISODE, when: { kind: 'now' } }],
      seriesId: 136315,
    });
    const [item] = vi.mocked(api.postBatch).mock.calls[1]?.[1] ?? [];
    expect(item?.watchProvider).toEqual(netflix);
    expect(item).not.toHaveProperty('importId');
    vi.mocked(loadWatchProviders).mockResolvedValue([]);
  });

  it('refuses a restore with an import id that is no UUID', async () => {
    const result = await markEpisodes({
      episodes: [
        {
          ...EPISODE,
          when: {
            importId: 'x',
            kind: 'restore',
            watchedAt: Date.UTC(2024, 0, 1),
          },
        },
      ],
      seriesId: 136315,
    });
    expect(result).toMatchObject({ error: 'invalid', ok: false });
  });
});

describe('markEpisodes sends only episodes that exist and have aired', () => {
  const seasonOf = (
    seasonNumber: number,
    episodes: ReadonlyArray<
      Readonly<{ airDate: string; episodeNumber: number; hasAired: boolean }>
    >,
  ): Season => ({
    airDate: '',
    description: '',
    episodes: episodes.map((item) => ({
      ...item,
      description: '',
      id: item.episodeNumber,
      runtime: 30,
      seasonNumber,
      stillImage: '',
      stillPath: '',
      title: `Episode ${item.episodeNumber}`,
    })),
    hasAired: true,
    id: seasonNumber,
    seasonNumber,
    title: `Season ${seasonNumber}`,
  });

  beforeEach(async () => {
    const { loadSeason } = await import('@/lib/series/loaders');
    vi.mocked(loadSeason).mockImplementation(async (_id, seasonNumber) =>
      seasonNumber === 0
        ? seasonOf(0, [
            { airDate: '2023-12-24', episodeNumber: 1, hasAired: true },
          ])
        : seasonOf(3, [
            { airDate: '2024-06-26', episodeNumber: 5, hasAired: true },
            { airDate: '2099-01-01', episodeNumber: 6, hasAired: false },
          ]),
    );
    vi.mocked(api.postBatch)
      .mockReset()
      .mockImplementation(async (_auth, items) =>
        items.map((item) => ({
          episodeNumber: item.episode.episodeNumber,
          runtime: item.episode.runtime,
          seasonNumber: item.episode.seasonNumber,
          watchedAt: item.watchedAt,
        })),
      );
  });

  const sent = () =>
    vi
      .mocked(api.postBatch)
      .mock.calls.flatMap(([, items]) =>
        items.map(
          (item) =>
            `${item.episode.seasonNumber}x${item.episode.episodeNumber}`,
        ),
      );

  it('drops an unaired and an unknown episode and reports them failed, keeping what was saved', async () => {
    const result = await markEpisodes({
      episodes: [
        { episodeNumber: 5, seasonNumber: 3, when: { kind: 'now' } },
        { episodeNumber: 6, seasonNumber: 3, when: { kind: 'now' } },
        { episodeNumber: 40, seasonNumber: 3, when: { kind: 'now' } },
      ],
      seriesId: 136315,
    });
    expect(sent()).toEqual(['3x5']);
    expect(result).toMatchObject({
      error: 'not-found',
      ok: false,
      partial: { watched: [{ episodeNumber: 5, seasonNumber: 3 }] },
    });
  });

  it('sends nothing when no episode qualifies', async () => {
    const result = await markEpisodes({
      episodes: [{ episodeNumber: 6, seasonNumber: 3, when: { kind: 'now' } }],
      seriesId: 136315,
    });
    expect(api.postBatch).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'not-found', ok: false });
  });

  it('keeps an aired special marked on its own, and an Undo restore of an unaired episode', async () => {
    const result = await markEpisodes({
      episodes: [
        { episodeNumber: 1, seasonNumber: 0, when: { kind: 'now' } },
        {
          episodeNumber: 6,
          seasonNumber: 3,
          when: { kind: 'restore', watchedAt: Date.UTC(2024, 0, 1) },
        },
      ],
      seriesId: 136315,
    });
    expect(sent()).toEqual(['0x1', '3x6']);
    expect(result.ok).toBe(true);
  });
});
