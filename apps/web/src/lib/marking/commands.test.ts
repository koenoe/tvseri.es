import { MAX_EPISODES_PER_MARK_ACTION } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMarkingCommands } from './commands';
import { createMarkingStore } from './store';
import type { ToastInput } from './toasts';
import type { SeriesSeed } from './types';

const NOW = Date.UTC(2026, 10, 12, 21, 40);
const SERIES = 136315;

const ok = <T>(data: T) => Promise.resolve({ data, ok: true as const });

function setup(
  options: Readonly<{
    signedIn?: boolean;
    now?: () => number;
    /** replaces the seed's seasons (The Bear S1 and S3 by default) */
    seasons?: SeriesSeed['seasons'];
    /** replaces the seed's watched episodes (S3 E1 by default) */
    watched?: SeriesSeed['watched'];
    /** the show is on the watchlist */
    watchlisted?: boolean;
  }> = {},
) {
  const store = createMarkingStore();
  store.getState().seed(
    {
      seasons: options.seasons ?? [
        { airedEpisodeCount: 4, episodeCount: 4, seasonNumber: 1 },
        { airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 3 },
      ],
      seriesId: SERIES,
      status: {
        isFavorited: false,
        isWatchlisted: options.watchlisted ?? false,
        prefs: {
          firstTrackingAnsweredAt: null,
          neverAskBefore: false,
          skipped: ['S03E02'],
        },
      },
      watched: options.watched ?? [
        { episodeNumber: 1, seasonNumber: 3, watchedAt: 1000 },
      ],
    },
    'seed',
  );
  const toasts: ToastInput[] = [];
  const actions = {
    markEpisodes: vi.fn(
      (input: {
        episodes: ReadonlyArray<{
          seasonNumber: number;
          episodeNumber: number;
        }>;
      }) =>
        ok({
          watched: input.episodes.map((ep) => ({
            episodeNumber: ep.episodeNumber,
            runtime: 30,
            seasonNumber: ep.seasonNumber,
            watchedAt: NOW,
          })),
        }),
    ),
    markNextEpisode: vi.fn(),
    markScope: vi.fn(() => ok({ watched: [] })),
    removeFromInProgress: vi.fn(() => ok(undefined)),
    restoreToInProgress: vi.fn(() => ok(undefined)),
    setInList: vi.fn(() => ok(undefined)),
    unmarkEpisodes: vi.fn(() => ok(undefined)),
    unmarkScope: vi.fn(() => ok(undefined)),
    updateSeriesPrefs: vi.fn(() =>
      ok({
        firstTrackingAnsweredAt: null,
        neverAskBefore: false,
        paused: null,
        pausedAt: null,
        skipped: [],
      }),
    ),
  };
  const promptSignIn = vi.fn();
  const commands = createMarkingCommands({
    // biome-ignore lint/suspicious/noExplicitAny: test doubles of server actions
    actions: actions as any,
    isSignedIn: () => options.signedIn ?? true,
    now: options.now ?? (() => NOW),
    promptSignIn,
    store,
    toast: (toast) => toasts.push(toast),
  });
  const view = () => store.getState().series[SERIES]!.view;
  return { actions, commands, promptSignIn, store, toasts, view };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const failed = () => Promise.resolve({ error: 'failed', ok: false }) as never;

describe('toggleEpisode', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('marks Just now at once, then settles with the server record', async () => {
    t.commands.toggleEpisode(
      SERIES,
      { episodeNumber: 5, seasonNumber: 3 },
      {
        title: 'Children',
      },
    );
    expect(t.view().watched.S03E05).toEqual({ runtime: 0, watchedAt: NOW });
    await flush();
    expect(t.view().watched.S03E05).toEqual({ runtime: 30, watchedAt: NOW });
    expect(t.actions.markEpisodes).toHaveBeenCalledWith({
      episodes: [{ episodeNumber: 5, seasonNumber: 3, when: { kind: 'now' } }],
      seriesId: SERIES,
    });
  });

  it('out of order on the page: the toast offers the ones before', () => {
    t.commands.toggleEpisode(
      SERIES,
      { episodeNumber: 5, seasonNumber: 3 },
      {
        title: 'Children',
      },
    );
    expect(t.toasts.at(-1)?.title).toBe('Marked S03E05 Children · Just now');
    // E2 is skipped, so only E3 and E4 are open before E5
    expect(t.toasts.at(-1)?.secondaryAction?.label).toBe(
      'Mark the 2 before too',
    );
  });

  it('"Mark the ones before too" counts at once, before either write answers', () => {
    t.commands.toggleEpisode(
      SERIES,
      { episodeNumber: 5, seasonNumber: 3 },
      { title: 'Children' },
    );
    t.toasts.at(-1)?.secondaryAction?.onClick();
    expect(Object.keys(t.view().watched).sort()).toEqual([
      'S03E01',
      'S03E03',
      'S03E04',
      'S03E05',
    ]);
  });

  it('quick Just-now marks merge into one toast and one Undo', async () => {
    t.commands.toggleEpisode(SERIES, { episodeNumber: 3, seasonNumber: 3 });
    t.commands.toggleEpisode(SERIES, { episodeNumber: 4, seasonNumber: 3 });
    expect(t.toasts.at(-1)?.title).toBe('Marked S03E03–S03E04 · Just now');
    await flush();
    t.toasts.at(-1)?.action?.onClick();
    expect(t.view().watched.S03E03).toBeUndefined();
    expect(t.view().watched.S03E04).toBeUndefined();
    await flush();
    expect(t.actions.unmarkEpisodes).toHaveBeenCalledWith({
      episodes: [
        { episodeNumber: 3, seasonNumber: 3 },
        { episodeNumber: 4, seasonNumber: 3 },
      ],
      seriesId: SERIES,
    });
  });

  it('a watched episode is unmarked', async () => {
    t.commands.toggleEpisode(
      SERIES,
      { episodeNumber: 1, seasonNumber: 3 },
      {
        title: 'Tomorrow',
      },
    );
    expect(t.view().watched.S03E01).toBeUndefined();
    expect(t.toasts.at(-1)?.title).toBe('S03E01 Tomorrow unmarked');
  });

  it('a skipped episode is marked watched and loses its skip', () => {
    t.commands.toggleEpisode(SERIES, { episodeNumber: 2, seasonNumber: 3 });
    expect(t.view().skipped).toEqual([]);
    expect(t.view().watched.S03E02).toBeDefined();
    // "incl. N skipped" is for bulk marks; one episode never says it
    expect(t.toasts.at(-1)?.title).toBe('Marked S03E02 · Just now');
  });

  it('rolls back and shows the error toast with Try again', async () => {
    t.actions.markEpisodes.mockImplementationOnce(
      () => Promise.resolve({ error: 'failed', ok: false }) as never,
    );
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    await flush();
    expect(t.view().watched.S03E05).toBeUndefined();
    expect(t.toasts.at(-1)).toMatchObject({
      action: { label: 'Try again' },
      tone: 'error',
    });
  });

  it('signed out: asks to sign in and changes nothing', () => {
    const signedOut = setup({ signedIn: false });
    signedOut.commands.toggleEpisode(SERIES, {
      episodeNumber: 5,
      seasonNumber: 3,
    });
    expect(signedOut.promptSignIn).toHaveBeenCalled();
    expect(signedOut.view().watched.S03E05).toBeUndefined();
    expect(signedOut.actions.markEpisodes).not.toHaveBeenCalled();
  });
});

describe('toggleScope', () => {
  it('a season marks the open episodes, skipped included, with release dates offered', async () => {
    const t = setup();
    t.commands.toggleScope(SERIES, 3);
    expect(t.toasts.at(-1)?.title).toBe(
      'Marked Season 3 · Just now · incl. 1 skipped',
    );
    expect(t.toasts.at(-1)?.secondaryAction?.label).toBe('Use release dates');
    expect(Object.keys(t.view().watched)).toHaveLength(10);
    await flush();
    expect(t.actions.markScope).toHaveBeenCalledWith({
      seasonNumber: 3,
      seriesId: SERIES,
      when: { kind: 'now' },
    });
  });

  it('a complete season is unmarked; Undo restores exact dates', async () => {
    const t = setup();
    t.commands.toggleScope(SERIES, 1);
    await flush();
    t.commands.toggleScope(SERIES, 1);
    expect(t.toasts.at(-1)?.title).toBe('Season 1 unmarked');
    await flush();
    t.toasts.at(-1)?.action?.onClick();
    expect(Object.keys(t.view().watched)).toContain('S01E04');
  });
  it('never unmarks a scope it knows no aired episodes for', async () => {
    // a show before its premiere with a watched special, and a season the
    // store doesn't know: "Mark the whole show" must not clear history
    const t = setup({
      seasons: [
        { airedEpisodeCount: 1, episodeCount: 1, seasonNumber: 0 },
        { airedEpisodeCount: 0, episodeCount: 8, seasonNumber: 1 },
      ],
      watched: [{ episodeNumber: 1, seasonNumber: 0, watchedAt: 1000 }],
    });
    t.commands.toggleScope(SERIES);
    t.commands.toggleScope(SERIES, 1);
    t.commands.toggleScope(SERIES, 7);
    await flush();
    expect(t.actions.unmarkScope).not.toHaveBeenCalled();
    expect(t.actions.markScope).not.toHaveBeenCalled();
    expect(t.view().watched.S00E01).toBeDefined();
    expect(t.toasts).toHaveLength(0);
  });
});

describe('every mark toast: Undo, and Use release dates only for a bulk mark', () => {
  const shapeOf = (toast: ToastInput | undefined) => ({
    action: toast?.action?.label,
    secondary: toast?.secondaryAction?.label,
    title: toast?.title,
  });

  it('I’m up to: names the run and what it unmarked, offers release dates for the same episodes', async () => {
    const t = setup({
      watched: [
        { episodeNumber: 1, seasonNumber: 3, watchedAt: 1000 },
        { episodeNumber: 8, seasonNumber: 3, watchedAt: 1000 },
      ],
    });
    t.commands.markUpTo(
      SERIES,
      { episodeNumber: 4, seasonNumber: 3 },
      {
        kind: 'now',
      },
    );
    expect(shapeOf(t.toasts.at(-1))).toMatchSnapshot();
    await flush();
    t.toasts.at(-1)?.secondaryAction?.onClick();
    await flush();
    expect(t.actions.markEpisodes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        episodes: expect.arrayContaining([
          expect.objectContaining({
            episodeNumber: 4,
            seasonNumber: 3,
            when: expect.objectContaining({ kind: 'release' }),
          }),
        ]),
      }),
    );
  });

  it('Finished it all: no date, release dates offered for the whole show', () => {
    const t = setup();
    t.commands.answerFirstTracking(SERIES, 'finished');
    expect(shapeOf(t.toasts.at(-1))).toMatchSnapshot();
  });

  it('a picker answer for a set, and the same set from its own release-dates press', () => {
    const t = setup();
    const refs = [
      { episodeNumber: 5, seasonNumber: 3 },
      { episodeNumber: 6, seasonNumber: 3 },
    ];
    t.commands.markEpisodes(SERIES, refs, { kind: 'now' }, 'S03E05–S03E06');
    expect(shapeOf(t.toasts.at(-1))).toMatchSnapshot();
    t.toasts.at(-1)?.secondaryAction?.onClick();
    expect(shapeOf(t.toasts.at(-1))).toMatchSnapshot();
  });
});

describe('mark-only commands (Home’s Seen it, Continue watching)', () => {
  const complete = Array.from({ length: 4 }, (_, index) => ({
    episodeNumber: index + 1,
    seasonNumber: 1,
    watchedAt: 1000,
  }));

  it('markSeen marks what is open with no date and names the show', async () => {
    const t = setup();
    t.commands.markSeen(SERIES, 'The Bear');
    expect(t.toasts.at(-1)?.title).toBe('Marked The Bear as seen');
    expect(t.toasts.at(-1)?.secondaryAction).toBeUndefined();
    // optimistic, and none of it dated: out of this year's stats and history
    const added = Object.entries(t.view().watched).filter(
      ([code]) => code !== 'S03E01',
    );
    expect(added).toHaveLength(13);
    expect(added.every(([, record]) => record.dateUnknown)).toBe(true);
    await flush();
    expect(t.actions.markScope).toHaveBeenCalledWith({
      seriesId: SERIES,
      when: { kind: 'unknown' },
    });
  });

  it('markSeen keeps the dates already there', async () => {
    const t = setup();
    t.commands.markSeen(SERIES, 'The Bear');
    await flush();
    expect(t.view().watched.S03E01).toMatchObject({ watchedAt: 1000 });
    expect(t.view().watched.S03E01?.dateUnknown).toBeFalsy();
  });

  it('markSeen’s Undo removes exactly what it added', async () => {
    const t = setup();
    t.commands.markSeen(SERIES, 'The Bear');
    await flush();
    t.toasts.at(-1)?.action?.onClick?.();
    await flush();
    expect(Object.keys(t.view().watched)).toEqual(['S03E01']);
    type Unmark = Readonly<{
      episodes: ReadonlyArray<{ episodeNumber: number; seasonNumber: number }>;
    }>;
    const calls = t.actions.unmarkEpisodes.mock.calls as unknown as Array<
      [Unmark]
    >;
    const unmarked = calls.flatMap(([input]) => input.episodes);
    expect(unmarked).toHaveLength(13);
    expect(unmarked).not.toContainEqual({ episodeNumber: 1, seasonNumber: 3 });
  });

  it('markSeen never unmarks a complete show, however often it is clicked: it says the show is already seen', async () => {
    const t = setup({
      seasons: [{ airedEpisodeCount: 4, episodeCount: 4, seasonNumber: 1 }],
      watched: complete,
    });
    t.commands.markSeen(SERIES, 'The Bear');
    t.commands.markSeen(SERIES, 'The Bear');
    await flush();
    expect(t.actions.unmarkScope).not.toHaveBeenCalled();
    expect(t.actions.markScope).not.toHaveBeenCalled();
    expect(Object.keys(t.view().watched)).toHaveLength(4);
    expect(t.toasts.map((toast) => toast.title)).toEqual([
      'You’ve already seen this series',
      'You’ve already seen this series',
    ]);
  });

  it('a second Seen it click right after the first leaves the marks', async () => {
    const t = setup();
    t.commands.markSeen(SERIES, 'The Bear');
    t.commands.markSeen(SERIES, 'The Bear');
    await flush();
    expect(t.actions.markScope).toHaveBeenCalledTimes(1);
    expect(t.actions.unmarkScope).not.toHaveBeenCalled();
  });

  it('markEpisode marks an open episode and leaves a watched one alone', async () => {
    const t = setup();
    t.commands.markEpisode(
      SERIES,
      { episodeNumber: 5, seasonNumber: 3 },
      { title: 'Children' },
    );
    expect(t.toasts.at(-1)?.title).toBe('Marked S03E05 Children · Just now');
    t.commands.markEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    t.commands.markEpisode(SERIES, { episodeNumber: 1, seasonNumber: 3 });
    await flush();
    expect(t.actions.unmarkEpisodes).not.toHaveBeenCalled();
    expect(t.view().watched.S03E05).toBeDefined();
    expect(t.view().watched.S03E01?.watchedAt).toBe(1000);
  });

  it('signed out, both ask to sign in and write nothing', async () => {
    const t = setup({ signedIn: false });
    t.commands.markSeen(SERIES, 'The Bear');
    t.commands.markEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    await flush();
    expect(t.promptSignIn).toHaveBeenCalledTimes(2);
    expect(t.actions.markScope).not.toHaveBeenCalled();
    expect(t.actions.markEpisodes).not.toHaveBeenCalled();
  });
});

describe('paintRun', () => {
  it('marks only the open ones of a run, with one toast and no release dates', async () => {
    const t = setup();
    t.commands.paintRun(
      SERIES,
      [1, 2, 3].map((episodeNumber) => ({ episodeNumber, seasonNumber: 3 })),
      'mark',
    );
    expect(t.toasts.at(-1)).toMatchObject({
      action: { label: 'Undo' },
      title: 'Marked S03E01–S03E03 · Just now · incl. 1 skipped',
    });
    expect(t.toasts.at(-1)?.secondaryAction).toBeUndefined();
    await flush();
    // S03E01 is already watched: its date is never touched
    expect(t.actions.markEpisodes).toHaveBeenCalledExactlyOnceWith({
      episodes: [
        { episodeNumber: 2, seasonNumber: 3, when: { kind: 'now' } },
        { episodeNumber: 3, seasonNumber: 3, when: { kind: 'now' } },
      ],
      seriesId: SERIES,
    });
    expect(t.view().watched.S03E01?.watchedAt).toBe(1000);
  });

  it('an unmark run reads Unmarked S03E01–S03E02', () => {
    const t = setup();
    t.commands.paintRun(
      SERIES,
      [1, 2].map((episodeNumber) => ({ episodeNumber, seasonNumber: 3 })),
      'unmark',
    );
    expect(t.toasts.at(-1)?.title).toBe('Unmarked S03E01–S03E02');
    expect(t.view().watched.S03E01).toBeUndefined();
  });
});

describe('setWhen (the picker)', () => {
  it('I don’t remember marks without a date', () => {
    const t = setup();
    t.commands.setWhen(
      SERIES,
      [{ episodeNumber: 5, seasonNumber: 3 }],
      { kind: 'unknown' },
      'S03E05 Children',
    );
    expect(t.view().watched.S03E05?.dateUnknown).toBe(true);
    expect(t.toasts.at(-1)?.title).toBe(
      'Marked S03E05 Children · I don’t remember when',
    );
  });

  it('Skipped unmarks a watched episode and flags it', async () => {
    const t = setup();
    t.commands.setWhen(
      SERIES,
      [{ episodeNumber: 1, seasonNumber: 3 }],
      { kind: 'skip' },
      'S03E01 Tomorrow',
    );
    expect(t.view().watched.S03E01).toBeUndefined();
    expect(t.view().skipped).toContain('S03E01');
    expect(t.toasts.at(-1)?.title).toBe('S03E01 Tomorrow skipped');
    await flush();
    expect(t.actions.updateSeriesPrefs).toHaveBeenCalledWith(SERIES, {
      skip: ['S03E01'],
    });
  });

  it('Not watched on a skipped episode says it is no longer skipped', async () => {
    const t = setup();
    const ref = [{ episodeNumber: 1, seasonNumber: 3 }];
    t.commands.setWhen(SERIES, ref, { kind: 'skip' }, 'S03E01 Tomorrow');
    await flush();
    t.commands.setWhen(SERIES, ref, { kind: 'unmark' }, 'S03E01 Tomorrow');
    expect(t.view().skipped).not.toContain('S03E01');
    expect(t.toasts.at(-1)?.title).toBe('S03E01 Tomorrow no longer skipped');
    await flush();
    expect(t.actions.updateSeriesPrefs).toHaveBeenLastCalledWith(SERIES, {
      unskip: ['S03E01'],
    });
  });
});

describe('setWhen on episodes with nothing to change', () => {
  it('Not watched on an episode with no mark writes nothing and says nothing', async () => {
    const t = setup();
    t.commands.setWhen(
      SERIES,
      [{ episodeNumber: 5, seasonNumber: 3 }],
      { kind: 'unmark' },
      'S03E05',
    );
    await flush();
    expect(t.toasts).toHaveLength(0);
    expect(t.actions.unmarkEpisodes).not.toHaveBeenCalled();
    expect(t.actions.updateSeriesPrefs).not.toHaveBeenCalled();
  });
});

describe('toggleList', () => {
  it('never saves a started show to the watchlist, and says why', async () => {
    const t = setup();
    t.commands.toggleList(SERIES, 'watchlist');
    await flush();
    expect(t.actions.setInList).not.toHaveBeenCalled();
    expect(t.toasts.at(-1)?.title).toBe('You’ve already started this series');
    expect(t.view().status?.isWatchlisted).toBe(false);
  });

  it('announces a save with Undo when given the title', async () => {
    const t = setup({ watched: [] });
    t.commands.toggleList(SERIES, 'watchlist', 'The Bear');
    await flush();
    expect(t.actions.setInList).toHaveBeenLastCalledWith({
      list: 'watchlist',
      seriesId: SERIES,
      value: true,
    });
    const toast = t.toasts.at(-1);
    expect(toast?.title).toBe('Added The Bear to your watchlist');
    toast?.action?.onClick();
    await flush();
    expect(t.actions.setInList).toHaveBeenLastCalledWith({
      list: 'watchlist',
      seriesId: SERIES,
      value: false,
    });
  });

  it('says a finished show is already seen', async () => {
    const t = setup();
    t.store.getState().setLibrary({
      ids: { favorites: [], inProgress: [], watched: [SERIES], watchlist: [] },
      status: 'ready',
    });
    t.commands.toggleList(SERIES, 'watchlist');
    await flush();
    expect(t.actions.setInList).not.toHaveBeenCalled();
    expect(t.toasts.at(-1)?.title).toBe('You’ve already seen this series');
  });

  it('saves a show nothing of which is watched', async () => {
    const t = setup({ watched: [] });
    t.commands.toggleList(SERIES, 'watchlist');
    await flush();
    expect(t.actions.setInList).toHaveBeenCalledWith({
      list: 'watchlist',
      seriesId: SERIES,
      value: true,
    });
  });

  it('flips the heart optimistically', async () => {
    const t = setup();
    t.commands.toggleList(SERIES, 'favorites');
    expect(t.view().status?.isFavorited).toBe(true);
    await flush();
    expect(t.actions.setInList).toHaveBeenCalledWith({
      list: 'favorites',
      seriesId: SERIES,
      value: true,
    });
  });
});

describe('setNeverAskBefore', () => {
  it('turns the question off with an Undo toast, and back on quietly', async () => {
    const t = setup();
    t.commands.setNeverAskBefore(SERIES, 'The Bear');
    expect(t.view().prefs?.neverAskBefore).toBe(true);
    expect(t.toasts.at(-1)?.title).toBe('Won’t ask again for The Bear');
    await flush();
    expect(t.actions.updateSeriesPrefs).toHaveBeenCalledWith(SERIES, {
      neverAskBefore: true,
    });
    const count = t.toasts.length;
    t.commands.setNeverAskBefore(SERIES, 'The Bear', false);
    expect(t.view().prefs?.neverAskBefore).toBe(false);
    expect(t.toasts).toHaveLength(count);
    await flush();
    expect(t.actions.updateSeriesPrefs).toHaveBeenLastCalledWith(SERIES, {
      neverAskBefore: false,
    });
  });
});

describe('a write that fails part-way', () => {
  it('keeps what the server saved, rolls back the rest and says so', async () => {
    const t = setup();
    t.actions.markScope.mockImplementationOnce(
      () =>
        Promise.resolve({
          at: 5_000,
          error: 'failed',
          ok: false,
          partial: {
            watched: [
              {
                episodeNumber: 1,
                runtime: 30,
                seasonNumber: 1,
                watchedAt: NOW,
              },
              {
                episodeNumber: 2,
                runtime: 30,
                seasonNumber: 1,
                watchedAt: NOW,
              },
            ],
          },
        }) as never,
    );
    t.commands.toggleScope(SERIES);
    await flush();
    expect(Object.keys(t.view().watched).sort()).toEqual([
      'S01E01',
      'S01E02',
      'S03E01',
    ]);
    expect(t.toasts.at(-1)).toMatchObject({
      action: { label: 'Try again' },
      title: 'Saved part of it. The rest is back as it was.',
      tone: 'error',
    });
  });

  it('"Finished it all" keeps the answer when the mark fails', async () => {
    const t = setup();
    t.actions.markScope.mockImplementationOnce(
      () => Promise.resolve({ error: 'failed', ok: false }) as never,
    );
    t.commands.answerFirstTracking(SERIES, 'finished');
    await flush();
    await flush();
    expect(t.view().prefs?.firstTrackingAnsweredAt).toBe(NOW);
    expect(Object.keys(t.view().watched)).toEqual(['S03E01']);
  });
});

/** S03E01 and S03E08 watched; "I'm up to S03E04" */
const laterWatched = () =>
  setup({
    watched: [
      { episodeNumber: 1, seasonNumber: 3, watchedAt: 1000 },
      { episodeNumber: 8, seasonNumber: 3, watchedAt: 1000 },
    ],
  });
const pressUpTo = (t: ReturnType<typeof setup>) =>
  t.commands.markUpTo(
    SERIES,
    { episodeNumber: 4, seasonNumber: 3 },
    { kind: 'now' },
  );

describe('I’m up to when the mark fails', () => {
  it('leaves the later episodes watched: no unmark without the mark', async () => {
    const t = laterWatched();
    t.actions.markEpisodes.mockImplementationOnce(
      () => Promise.resolve({ error: 'failed', ok: false }) as never,
    );
    pressUpTo(t);
    await flush();
    expect(t.actions.unmarkEpisodes).not.toHaveBeenCalled();
    expect(Object.keys(t.view().watched).sort()).toEqual(['S03E01', 'S03E08']);
  });

  it('a mark saved in part keeps what it saved and still unmarks nothing', async () => {
    const t = laterWatched();
    t.actions.markEpisodes.mockImplementationOnce(
      () =>
        Promise.resolve({
          error: 'failed',
          ok: false,
          partial: {
            watched: [
              {
                episodeNumber: 4,
                runtime: 30,
                seasonNumber: 3,
                watchedAt: NOW,
              },
            ],
          },
        }) as never,
    );
    pressUpTo(t);
    await flush();
    expect(t.actions.unmarkEpisodes).not.toHaveBeenCalled();
    expect(Object.keys(t.view().watched).sort()).toEqual([
      'S03E01',
      'S03E04',
      'S03E08',
    ]);
  });

  it('Try again redoes the mark and then the unmark', async () => {
    const t = laterWatched();
    t.actions.markEpisodes.mockImplementationOnce(
      () => Promise.resolve({ error: 'failed', ok: false }) as never,
    );
    pressUpTo(t);
    await flush();
    t.toasts.at(-1)?.action?.onClick();
    await flush();
    expect(t.actions.unmarkEpisodes).toHaveBeenCalledWith({
      episodes: [{ episodeNumber: 8, seasonNumber: 3 }],
      seriesId: SERIES,
    });
    expect(t.view().watched.S03E04).toBeDefined();
    expect(t.view().watched.S03E08).toBeUndefined();
  });
});

describe('I’m up to across seasons', () => {
  const now = (seasonNumber: number, episodeNumber: number) => ({
    episodeNumber,
    seasonNumber,
    when: { kind: 'now' },
  });

  it('marks every open episode up to it, earlier seasons and skipped ones too, then unmarks the later ones', async () => {
    const t = laterWatched();
    pressUpTo(t);
    await flush();
    expect(t.actions.markEpisodes).toHaveBeenCalledExactlyOnceWith({
      episodes: [
        now(1, 1),
        now(1, 2),
        now(1, 3),
        now(1, 4),
        now(3, 2),
        now(3, 3),
        now(3, 4),
      ],
      seriesId: SERIES,
    });
    expect(t.actions.unmarkEpisodes).toHaveBeenCalledExactlyOnceWith({
      episodes: [{ episodeNumber: 8, seasonNumber: 3 }],
      seriesId: SERIES,
    });
    expect(Object.keys(t.view().watched).sort()).toEqual([
      'S01E01',
      'S01E02',
      'S01E03',
      'S01E04',
      'S03E01',
      'S03E02',
      'S03E03',
      'S03E04',
    ]);
    expect(t.view().skipped).toEqual([]);
  });

  it('Undo brings the later episode back with its date, and the skip back', async () => {
    const t = laterWatched();
    pressUpTo(t);
    const undo = t.toasts.at(-1)?.action;
    await flush();
    undo?.onClick();
    expect(Object.keys(t.view().watched).sort()).toEqual(['S03E01', 'S03E08']);
    expect(t.view().watched.S03E08?.watchedAt).toBe(1000);
    expect(t.view().skipped).toEqual(['S03E02']);
    await flush();
    expect(t.actions.markEpisodes).toHaveBeenLastCalledWith({
      episodes: [
        {
          episodeNumber: 8,
          seasonNumber: 3,
          when: { kind: 'restore', watchedAt: 1000 },
        },
      ],
      seriesId: SERIES,
    });
    expect(t.actions.updateSeriesPrefs).toHaveBeenLastCalledWith(SERIES, {
      skip: ['S03E02'],
    });
  });

  it('the mark saved but the unmark failed: both stay as the server has them, and it says part saved', async () => {
    const t = laterWatched();
    t.actions.unmarkEpisodes.mockImplementationOnce(failed);
    pressUpTo(t);
    await flush();
    expect(t.view().watched.S03E04).toBeDefined();
    expect(t.view().watched.S03E08).toBeDefined();
    expect(t.toasts.at(-1)).toMatchObject({
      action: { label: 'Try again' },
      title: 'Saved part of it. The rest is back as it was.',
      tone: 'error',
    });
  });
});

describe('a mark too big for one request that fails part-way', () => {
  const COUNT = MAX_EPISODES_PER_MARK_ACTION + 1;

  it('keeps the request that saved, rolls back the rest, and Try again finishes it', async () => {
    const t = setup({
      seasons: [
        { airedEpisodeCount: COUNT, episodeCount: COUNT, seasonNumber: 1 },
      ],
      watched: [],
    });
    const real = t.actions.markEpisodes.getMockImplementation();
    t.actions.markEpisodes
      .mockImplementationOnce((input) => real!(input))
      .mockImplementationOnce(failed);
    const refs = Array.from({ length: COUNT }, (_, index) => ({
      episodeNumber: index + 1,
      seasonNumber: 1,
    }));
    t.commands.markEpisodes(SERIES, refs, { kind: 'now' }, 'Season 1');
    expect(Object.keys(t.view().watched)).toHaveLength(COUNT);
    await flush();
    expect(t.actions.markEpisodes).toHaveBeenCalledTimes(2);
    expect(Object.keys(t.view().watched)).toHaveLength(COUNT - 1);
    expect(t.view().watched[`S01E${COUNT}`]).toBeUndefined();
    const retry = t.toasts.at(-1);
    expect(retry?.title).toBe('Saved part of it. The rest is back as it was.');
    retry?.action?.onClick();
    await flush();
    expect(Object.keys(t.view().watched)).toHaveLength(COUNT);
  });
});

describe('Undo after a failure or before the answer', () => {
  it('Undo of a mark that saved only part takes back exactly what was saved', async () => {
    const t = setup();
    t.actions.markScope.mockImplementationOnce(
      () =>
        Promise.resolve({
          error: 'failed',
          ok: false,
          partial: {
            watched: [
              {
                episodeNumber: 3,
                runtime: 30,
                seasonNumber: 3,
                watchedAt: NOW,
              },
            ],
          },
        }) as never,
    );
    t.commands.toggleScope(SERIES, 3);
    const undo = t.toasts.at(-1)?.action;
    await flush();
    expect(Object.keys(t.view().watched).sort()).toEqual(['S03E01', 'S03E03']);
    undo?.onClick();
    await flush();
    expect(t.actions.unmarkEpisodes).toHaveBeenCalledExactlyOnceWith({
      episodes: [{ episodeNumber: 3, seasonNumber: 3 }],
      seriesId: SERIES,
    });
    expect(Object.keys(t.view().watched)).toEqual(['S03E01']);
    expect(t.view().skipped).toEqual(['S03E02']);
  });

  it('Undo before the mark answered: the unmark goes after the mark, and the episode ends unwatched', async () => {
    const t = setup();
    const order: string[] = [];
    let release: () => void = () => {};
    t.actions.markEpisodes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => {
            order.push('mark');
            resolve({
              data: {
                watched: [
                  {
                    episodeNumber: 5,
                    runtime: 30,
                    seasonNumber: 3,
                    watchedAt: NOW,
                  },
                ],
              },
              ok: true,
            });
          };
        }) as never,
    );
    t.actions.unmarkEpisodes.mockImplementationOnce(() => {
      order.push('unmark');
      return Promise.resolve({ data: undefined, ok: true }) as never;
    });
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    t.toasts.at(-1)?.action?.onClick();
    expect(t.view().watched.S03E05).toBeUndefined();
    await flush();
    expect(order).toEqual([]);
    release();
    await flush();
    await flush();
    expect(order).toEqual(['mark', 'unmark']);
    expect(t.view().watched.S03E05).toBeUndefined();
  });

  it('a new date keeps the runtime, and Undo sends the old date back', async () => {
    const t = setup({
      watched: [
        { episodeNumber: 1, runtime: 25, seasonNumber: 3, watchedAt: 1000 },
      ],
    });
    const day = new Date(2026, 0, 5);
    t.commands.setWhen(
      SERIES,
      [{ episodeNumber: 1, seasonNumber: 3 }],
      { day, kind: 'day' },
      'S03E01',
    );
    // 21:00 on the picked day
    const evening = new Date(2026, 0, 5, 21).getTime();
    expect(t.view().watched.S03E01).toEqual({
      runtime: 25,
      watchedAt: evening,
    });
    const undo = t.toasts.at(-1)?.action;
    await flush();
    undo?.onClick();
    expect(t.view().watched.S03E01).toEqual({ runtime: 25, watchedAt: 1000 });
    await flush();
    expect(t.actions.markEpisodes).toHaveBeenLastCalledWith({
      episodes: [
        {
          episodeNumber: 1,
          seasonNumber: 3,
          when: { kind: 'restore', watchedAt: 1000 },
        },
      ],
      seriesId: SERIES,
    });
  });
});

describe('a write that throws or finds the session gone', () => {
  it('a throw rolls back with the error toast, and the next write to the show still goes out', async () => {
    const t = setup();
    t.actions.markEpisodes.mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to fetch')),
    );
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    await flush();
    expect(t.view().watched.S03E05).toBeUndefined();
    expect(t.toasts.at(-1)?.tone).toBe('error');
    t.commands.toggleEpisode(SERIES, { episodeNumber: 6, seasonNumber: 3 });
    await flush();
    expect(t.actions.markEpisodes).toHaveBeenCalledTimes(2);
    expect(t.view().watched.S03E06).toEqual({ runtime: 30, watchedAt: NOW });
  });

  it('a session that ended asks to sign in instead of the error toast', async () => {
    const t = setup();
    t.actions.markEpisodes.mockImplementationOnce(
      () => Promise.resolve({ error: 'unauthenticated', ok: false }) as never,
    );
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    await flush();
    expect(t.view().watched.S03E05).toBeUndefined();
    expect(t.promptSignIn).toHaveBeenCalledTimes(1);
    expect(t.toasts.some((toast) => toast.tone === 'error')).toBe(false);
  });

  it('another show never waits for this one’s write', async () => {
    const OTHER = 990006;
    const t = setup();
    t.actions.markEpisodes.mockImplementationOnce(
      () => new Promise(() => {}) as never,
    );
    t.store.getState().seed(
      {
        seasons: [{ airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 }],
        seriesId: OTHER,
      },
      'other',
    );
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    t.commands.toggleEpisode(OTHER, { episodeNumber: 1, seasonNumber: 1 });
    await flush();
    expect(t.store.getState().series[OTHER]?.view.watched.S01E01).toEqual({
      runtime: 30,
      watchedAt: NOW,
    });
  });
});

describe('the library lists follow a mark', () => {
  const ids = (inProgress: number[], watched: number[]) => ({
    favorites: [],
    inProgress,
    watched,
    watchlist: [],
  });

  it('the last open episode moves the show to Finished, and its unmark moves it back', async () => {
    const t = setup({
      seasons: [{ airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 }],
      watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1000 }],
    });
    t.store.getState().setLibrary({ ids: ids([SERIES], []), status: 'ready' });
    const last = { episodeNumber: 2, seasonNumber: 1 };
    t.commands.toggleEpisode(SERIES, last);
    await flush();
    expect(t.store.getState().library).toEqual({
      ids: ids([], [SERIES]),
      status: 'ready',
    });
    t.commands.toggleEpisode(SERIES, last);
    await flush();
    expect(t.store.getState().library).toEqual({
      ids: ids([SERIES], []),
      status: 'ready',
    });
  });

  it('a failed mark that saved part of it still starts the show', async () => {
    const t = setup({ watched: [] });
    t.store.getState().setLibrary({ ids: ids([], []), status: 'ready' });
    t.actions.markScope.mockImplementationOnce(
      () =>
        Promise.resolve({
          error: 'failed',
          ok: false,
          partial: {
            watched: [
              {
                episodeNumber: 1,
                runtime: 30,
                seasonNumber: 1,
                watchedAt: NOW,
              },
            ],
          },
        }) as never,
    );
    t.commands.toggleScope(SERIES, 1);
    await flush();
    expect(t.store.getState().library).toEqual({
      ids: ids([SERIES], []),
      status: 'ready',
    });
  });
});

describe('specials, episodes yet to air and the ones before', () => {
  const withSpecials = () =>
    setup({
      seasons: [
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
        { airedEpisodeCount: 2, episodeCount: 4, seasonNumber: 1 },
      ],
      watched: [],
    });

  it('the whole-show and season marks leave specials and unaired episodes alone', async () => {
    const t = withSpecials();
    t.commands.toggleScope(SERIES);
    expect(Object.keys(t.view().watched).sort()).toEqual(['S01E01', 'S01E02']);
    const season = withSpecials();
    season.commands.toggleScope(SERIES, 1);
    expect(Object.keys(season.view().watched).sort()).toEqual([
      'S01E01',
      'S01E02',
    ]);
  });

  it('the whole-show unmark keeps specials, and its Undo puts back only what it removed', async () => {
    const t = setup({
      seasons: [
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
      ],
      watched: [
        { episodeNumber: 1, seasonNumber: 0, watchedAt: 500 },
        { episodeNumber: 1, seasonNumber: 1, watchedAt: 1000 },
        { episodeNumber: 2, seasonNumber: 1, watchedAt: 2000 },
      ],
    });
    t.commands.toggleScope(SERIES);
    expect(Object.keys(t.view().watched)).toEqual(['S00E01']);
    await flush();
    expect(t.actions.unmarkScope).toHaveBeenCalledWith({
      seasonNumber: undefined,
      seriesId: SERIES,
    });
    t.toasts.at(-1)?.action?.onClick();
    await flush();
    expect(Object.keys(t.view().watched).sort()).toEqual([
      'S00E01',
      'S01E01',
      'S01E02',
    ]);
    expect(t.actions.markEpisodes).toHaveBeenCalledTimes(1);
    expect(t.actions.markEpisodes.mock.calls[0]?.[0].episodes).toEqual([
      {
        episodeNumber: 1,
        seasonNumber: 1,
        when: { kind: 'restore', watchedAt: 1000 },
      },
      {
        episodeNumber: 2,
        seasonNumber: 1,
        when: { kind: 'restore', watchedAt: 2000 },
      },
    ]);
  });

  it('a special marked out of order never offers the ones before', () => {
    const t = withSpecials();
    t.commands.toggleEpisode(SERIES, { episodeNumber: 2, seasonNumber: 0 });
    expect(t.view().watched.S00E02).toBeDefined();
    expect(t.toasts.at(-1)?.secondaryAction).toBeUndefined();
  });

  it('never offers the ones before from the sheet, or after Never for this show', () => {
    const fifth = { episodeNumber: 5, seasonNumber: 3 };
    const sheet = setup();
    sheet.commands.toggleEpisode(SERIES, fifth, { where: 'sheet' });
    expect(sheet.toasts.at(-1)?.title).toBe('Marked S03E05 · Just now');
    expect(sheet.toasts.at(-1)?.secondaryAction).toBeUndefined();
    const never = setup();
    never.commands.setNeverAskBefore(SERIES, 'The Bear');
    never.commands.toggleEpisode(SERIES, fifth);
    expect(never.toasts.at(-1)?.title).toBe('Marked S03E05 · Just now');
    expect(never.toasts.at(-1)?.secondaryAction).toBeUndefined();
  });
});

describe('markNext on a seeded show', () => {
  it('marks Next up at once and answers with it', async () => {
    const t = setup();
    await expect(t.commands.markNext(SERIES)).resolves.toEqual({
      episodeNumber: 1,
      seasonNumber: 1,
    });
    expect(t.view().watched.S01E01).toBeDefined();
    expect(t.actions.markNextEpisode).not.toHaveBeenCalled();
  });

  it('writes nothing when every aired episode is marked', async () => {
    const t = setup({
      seasons: [{ airedEpisodeCount: 1, episodeCount: 2, seasonNumber: 1 }],
      watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1000 }],
    });
    await expect(t.commands.markNext(SERIES)).resolves.toBeNull();
    await flush();
    expect(t.actions.markEpisodes).not.toHaveBeenCalled();
    expect(t.actions.markNextEpisode).not.toHaveBeenCalled();
  });
});

describe('Undo of an unmark puts records back exactly', () => {
  it('sends each record’s date, no-date flag, service and import', async () => {
    const importId = '7f9c2c1e-5b8a-4d3e-9f10-2a6b8c4d5e6f';
    const t = setup({
      watched: [
        {
          episodeNumber: 5,
          seasonNumber: 3,
          watchedAt: Date.UTC(2024, 0, 1),
          watchProviderName: 'Plex',
        },
        {
          dateUnknown: true,
          episodeNumber: 6,
          importId,
          seasonNumber: 3,
          watchedAt: Date.UTC(2024, 0, 2),
        },
      ],
    });
    t.commands.paintRun(
      SERIES,
      [
        { episodeNumber: 5, seasonNumber: 3 },
        { episodeNumber: 6, seasonNumber: 3 },
      ],
      'unmark',
    );
    await flush();
    t.toasts.at(-1)?.action?.onClick();
    await flush();
    expect(t.actions.markEpisodes).toHaveBeenLastCalledWith({
      episodes: [
        {
          episodeNumber: 5,
          seasonNumber: 3,
          when: {
            kind: 'restore',
            source: 'Plex',
            watchedAt: Date.UTC(2024, 0, 1),
          },
        },
        {
          episodeNumber: 6,
          seasonNumber: 3,
          when: {
            dateUnknown: true,
            importId,
            kind: 'restore',
            watchedAt: Date.UTC(2024, 0, 2),
          },
        },
      ],
      seriesId: SERIES,
    });
  });
});

describe('runs for one show never interleave', () => {
  it('a second run waits for the first run’s requests', async () => {
    const t = setup();
    const order: string[] = [];
    let release: () => void = () => {};
    t.actions.markEpisodes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => {
            order.push('first');
            resolve({ data: { watched: [] }, ok: true });
          };
        }) as never,
    );
    t.actions.unmarkEpisodes.mockImplementationOnce(() => {
      order.push('second');
      return Promise.resolve({ data: undefined, ok: true }) as never;
    });
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    t.commands.toggleEpisode(SERIES, { episodeNumber: 1, seasonNumber: 3 });
    await flush();
    expect(order).toEqual([]);
    release();
    await flush();
    await flush();
    expect(order).toEqual(['first', 'second']);
  });
});

describe('a press command resolves when its write settled (the press gate)', () => {
  const holdMark = (t: ReturnType<typeof setup>) => {
    let release: () => void = () => {};
    t.actions.markEpisodes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { watched: [] }, ok: true });
        }) as never,
    );
    return () => release();
  };

  it.each([
    [
      'toggleEpisode',
      (t: ReturnType<typeof setup>) =>
        t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 }),
    ],
    [
      'markEpisode',
      (t: ReturnType<typeof setup>) =>
        t.commands.markEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 }),
    ],
  ])('%s', async (_, press) => {
    const t = setup();
    const release = holdMark(t);
    let settled = false;
    void Promise.resolve(press(t)).then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);
    release();
    await flush();
    expect(settled).toBe(true);
  });

  it('toggleScope', async () => {
    const t = setup();
    let release: () => void = () => {};
    t.actions.markScope.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { watched: [] }, ok: true });
        }) as never,
    );
    let settled = false;
    void Promise.resolve(t.commands.toggleScope(SERIES, 3)).then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);
    release();
    await flush();
    expect(settled).toBe(true);
  });
});

describe('hide and unhide: a pref, the show stays yours', () => {
  const LIBRARY = {
    favorites: [],
    inProgress: [SERIES],
    watched: [],
    watchlist: [],
  };

  it('hides at once, writes the pref, keeps the library ids, toasts Undo', async () => {
    const { actions, commands, store, toasts } = setup();
    store.getState().setLibrary({ ids: LIBRARY, status: 'ready' });
    const done = commands.removeFromInProgress(SERIES);
    expect(store.getState().hidden[SERIES]).toBe(true);
    await expect(done).resolves.toBe(true);
    expect(actions.removeFromInProgress).toHaveBeenCalledWith({
      seriesId: SERIES,
    });
    expect(store.getState().library).toEqual({ ids: LIBRARY, status: 'ready' });
    await vi.waitFor(() => expect(toasts).toHaveLength(1));
    expect(toasts[0]?.title).toBe('Hidden from in progress');
    toasts[0]?.action?.onClick();
    expect(store.getState().hidden[SERIES]).toBe(false);
    await vi.waitFor(() =>
      expect(actions.restoreToInProgress).toHaveBeenCalledWith({
        seriesId: SERIES,
      }),
    );
  });

  it('brings a show back through the prefs action', async () => {
    const { actions, commands, store } = setup();
    await expect(commands.restoreToInProgress(SERIES)).resolves.toBe(true);
    expect(store.getState().hidden[SERIES]).toBe(false);
    expect(actions.restoreToInProgress).toHaveBeenCalledWith({
      seriesId: SERIES,
    });
  });

  it('rolls back and says so when the API refuses', async () => {
    const { actions, commands, store, toasts } = setup();
    actions.removeFromInProgress.mockImplementation(() =>
      Promise.resolve({ error: 'failed', ok: false } as never),
    );
    await expect(commands.removeFromInProgress(SERIES)).resolves.toBe(false);
    expect(store.getState().hidden[SERIES]).toBeUndefined();
    expect(toasts.map((toast) => toast.tone)).toEqual(['error']);
  });

  it('rolls back and says so when the action throws (network, a new deployment)', async () => {
    const { actions, commands, store, toasts } = setup();
    actions.removeFromInProgress.mockImplementation(() =>
      Promise.reject(new Error('Failed to fetch')),
    );
    await expect(commands.removeFromInProgress(SERIES)).resolves.toBe(false);
    expect(store.getState().hidden[SERIES]).toBeUndefined();
    expect(toasts.map((toast) => toast.tone)).toEqual(['error']);
  });

  it('asks a signed-out visitor to sign in', async () => {
    const { actions, commands, promptSignIn } = setup({ signedIn: false });
    await expect(commands.restoreToInProgress(SERIES)).resolves.toBe(false);
    expect(promptSignIn).toHaveBeenCalled();
    expect(actions.restoreToInProgress).not.toHaveBeenCalled();
  });
});

describe('the library ids after a write', () => {
  it('stay the same object when the show keeps its lists, so no reader re-renders', async () => {
    const t = setup();
    t.store.getState().setLibrary({
      ids: { favorites: [], inProgress: [SERIES], watched: [], watchlist: [] },
      status: 'ready',
    });
    const before = t.store.getState().library;
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    await flush();
    expect(t.view().watched.S03E05).toBeDefined();
    expect(t.store.getState().library).toBe(before);
  });

  it('a list toggle adds the show in the API order and a refusal takes it out again', async () => {
    const t = setup();
    t.store.getState().setLibrary({
      ids: {
        favorites: [1, SERIES + 1],
        inProgress: [],
        watched: [],
        watchlist: [],
      },
      status: 'ready',
    });
    t.actions.setInList.mockReturnValueOnce(
      Promise.resolve({ error: 'failed', ok: false }) as never,
    );
    t.commands.toggleList(SERIES, 'favorites');
    expect(t.store.getState().library).toMatchObject({
      ids: { favorites: [1, SERIES, SERIES + 1] },
    });
    await flush();
    expect(t.store.getState().library).toMatchObject({
      ids: { favorites: [1, SERIES + 1] },
    });
  });
});

describe('a list toggle on a show the store has not seeded', () => {
  const OTHER = 990004;

  it('takes the show out again and says so when the action throws', async () => {
    const t = setup();
    t.store.getState().setLibrary({
      ids: { favorites: [], inProgress: [], watched: [], watchlist: [] },
      status: 'ready',
    });
    t.actions.setInList.mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to fetch')),
    );
    t.commands.toggleList(OTHER, 'favorites');
    expect(t.store.getState().library).toMatchObject({
      ids: { favorites: [OTHER] },
    });
    await flush();
    expect(t.store.getState().library).toMatchObject({
      ids: { favorites: [] },
    });
    expect(t.toasts.map((toast) => toast.tone)).toEqual(['error']);
  });
});

describe('markNext on a show the store has not seeded', () => {
  const OTHER = 990003;
  const seedAfter = (watched: number): SeriesSeed => ({
    fetchedAt: NOW,
    seasons: [{ airedEpisodeCount: 9, episodeCount: 9, seasonNumber: 1 }],
    seriesId: OTHER,
    status: {
      isFavorited: false,
      isWatchlisted: false,
      prefs: {
        firstTrackingAnsweredAt: null,
        neverAskBefore: false,
        skipped: [],
      },
    },
    watched: Array.from({ length: watched }, (_, index) => ({
      episodeNumber: index + 1,
      seasonNumber: 1,
      watchedAt: 1000,
    })),
  });

  it('seeds the store with the show after the write, and an older seed can’t undo it', async () => {
    const t = setup();
    t.actions.markNextEpisode.mockResolvedValue({
      data: {
        episode: { episodeNumber: 8, seasonNumber: 1 },
        seed: seedAfter(8),
        watched: [],
      },
      ok: true,
    });
    await t.commands.markNext(OTHER);
    const view = () => t.store.getState().series[OTHER]?.view;
    expect(view()?.watched.S01E08).toBeDefined();
    expect(t.toasts.at(-1)?.title).toBe('Marked S01E08 · Just now');

    // the Remote's own seed, read before the write, lands late
    t.store.getState().seed({ ...seedAfter(7), fetchedAt: NOW - 500 }, 'late');
    expect(view()?.watched.S01E08).toBeDefined();
  });

  it('Mark next on an unseeded show brings it back from Hide and off the watchlist', async () => {
    const t = setup();
    await t.commands.removeFromInProgress(OTHER);
    t.actions.markNextEpisode.mockResolvedValue({
      data: {
        episode: { episodeNumber: 1, seasonNumber: 1 },
        seed: { seasons: [], seriesId: OTHER },
        watched: [],
      },
      ok: true,
    });
    t.store.getState().setLibrary({
      ids: { favorites: [], inProgress: [], watched: [], watchlist: [OTHER] },
      status: 'ready',
    });
    await t.commands.markNext(OTHER);
    expect(t.store.getState().hidden[OTHER]).toBe(false);
    expect(t.store.getState().library).toMatchObject({
      ids: { inProgress: [OTHER], watchlist: [] },
    });
  });
});

describe('markNext when the action throws', () => {
  it('resolves null with the error toast', async () => {
    const t = setup();
    t.actions.markNextEpisode.mockRejectedValue(new Error('Failed to fetch'));
    await expect(t.commands.markNext(990005)).resolves.toBeNull();
    expect(t.toasts.map((toast) => toast.tone)).toEqual(['error']);
  });
});

describe('a show whose viewer read failed (unavailable)', () => {
  const unavailableSeed: SeriesSeed = {
    seasons: [{ airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 3 }],
    seriesId: SERIES,
    unavailable: true,
  };

  it('refuses every command: no optimistic change, no write, one toast', async () => {
    const t = setup();
    t.store.setState({ series: {} });
    t.store.getState().seed(unavailableSeed, 'unavailable');
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    t.commands.toggleList(SERIES, 'favorites');
    t.commands.toggleScope(SERIES);
    expect(await t.commands.markNext(SERIES)).toBeNull();
    expect(await t.commands.removeFromInProgress(SERIES)).toBe(false);
    await flush();
    expect(t.view().watched).toEqual({});
    expect(t.view().status).toBeNull();
    expect(t.actions.markEpisodes).not.toHaveBeenCalled();
    expect(t.actions.setInList).not.toHaveBeenCalled();
    expect(t.actions.markScope).not.toHaveBeenCalled();
    expect(t.toasts.at(-1)).toMatchObject({ tone: 'error' });
  });

  it('works again once the retry seeds the real state', async () => {
    const t = setup();
    t.store.setState({ series: {} });
    t.store.getState().seed(unavailableSeed, 'unavailable');
    t.store
      .getState()
      .seed(
        { ...unavailableSeed, fetchedAt: NOW, unavailable: undefined },
        'retry',
      );
    expect(t.view().unavailable).toBeUndefined();
    t.commands.toggleEpisode(SERIES, { episodeNumber: 5, seasonNumber: 3 });
    expect(t.view().watched.S03E05).toBeDefined();
  });
});

describe('starting a show takes it off the watchlist at once', () => {
  const onWatchlist = () => {
    const t = setup({ watched: [], watchlisted: true });
    t.store.getState().setLibrary({
      ids: { favorites: [], inProgress: [], watched: [], watchlist: [SERIES] },
      status: 'ready',
    });
    return t;
  };
  const watchlistIds = (t: ReturnType<typeof setup>) => {
    const { library } = t.store.getState();
    return library.status === 'ready' ? library.ids.watchlist : null;
  };

  it('the first regular episode parks it, and the library follows when saved', async () => {
    const t = onWatchlist();
    t.commands.toggleEpisode(SERIES, { episodeNumber: 1, seasonNumber: 1 });
    expect(t.view().status?.isWatchlisted).toBe(false);
    await flush();
    expect(watchlistIds(t)).toEqual([]);
    expect(t.store.getState().library).toMatchObject({
      ids: { inProgress: [SERIES] },
    });
  });

  it('a failed save puts it back', async () => {
    const t = onWatchlist();
    t.actions.markEpisodes.mockImplementationOnce(failed);
    t.commands.toggleEpisode(SERIES, { episodeNumber: 1, seasonNumber: 1 });
    expect(t.view().status?.isWatchlisted).toBe(false);
    await flush();
    expect(t.view().status?.isWatchlisted).toBe(true);
    expect(watchlistIds(t)).toEqual([SERIES]);
  });

  it('Undo back to nothing watched puts it back, as the API does', async () => {
    const t = onWatchlist();
    t.commands.toggleEpisode(SERIES, { episodeNumber: 1, seasonNumber: 1 });
    await flush();
    expect(watchlistIds(t)).toEqual([]);
    t.toasts.at(-1)?.action?.onClick();
    await flush();
    expect(t.view().status?.isWatchlisted).toBe(true);
    expect(watchlistIds(t)).toEqual([SERIES]);
  });

  it('a special keeps it on the watchlist', async () => {
    const t = setup({
      seasons: [
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
      ],
      watched: [],
      watchlisted: true,
    });
    t.commands.toggleEpisode(SERIES, { episodeNumber: 1, seasonNumber: 0 });
    await flush();
    expect(t.view().status?.isWatchlisted).toBe(true);
  });

  it('a show with only specials watched can go on the watchlist', async () => {
    const t = setup({
      seasons: [
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
      ],
      watched: [{ episodeNumber: 1, seasonNumber: 0, watchedAt: 500 }],
    });
    t.commands.toggleList(SERIES, 'watchlist');
    await flush();
    expect(t.actions.setInList).toHaveBeenCalledWith({
      list: 'watchlist',
      seriesId: SERIES,
      value: true,
    });
  });
});

describe('watching a hidden show brings it back at once', () => {
  const hiddenHere = async () => {
    const t = setup({
      seasons: [
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
        { airedEpisodeCount: 4, episodeCount: 4, seasonNumber: 1 },
      ],
      watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1000 }],
    });
    await t.commands.removeFromInProgress(SERIES);
    return t;
  };
  const hidden = (t: ReturnType<typeof setup>) =>
    t.store.getState().hidden[SERIES];

  it('a mark unhides it before the API answers', async () => {
    const t = await hiddenHere();
    t.commands.toggleEpisode(SERIES, { episodeNumber: 2, seasonNumber: 1 });
    expect(hidden(t)).toBe(false);
    await flush();
    expect(hidden(t)).toBe(false);
  });

  it('a whole-season mark and Seen it unhide it too', async () => {
    const t = await hiddenHere();
    t.commands.toggleScope(SERIES, 1);
    expect(hidden(t)).toBe(false);
    const seen = await hiddenHere();
    seen.commands.markSeen(SERIES, 'The Bear');
    expect(hidden(seen)).toBe(false);
  });

  it('a failed save hides it again', async () => {
    const t = await hiddenHere();
    t.actions.markEpisodes.mockImplementationOnce(failed);
    t.commands.toggleEpisode(SERIES, { episodeNumber: 2, seasonNumber: 1 });
    await flush();
    expect(hidden(t)).toBe(true);
  });

  it('a special unhides it too', async () => {
    const t = await hiddenHere();
    t.commands.toggleEpisode(SERIES, { episodeNumber: 1, seasonNumber: 0 });
    expect(hidden(t)).toBe(false);
  });

  it('an unmark or Undo putting marks back leave it hidden', async () => {
    const t = await hiddenHere();
    t.commands.toggleEpisode(SERIES, { episodeNumber: 1, seasonNumber: 1 });
    await flush();
    expect(hidden(t)).toBe(true);
    // Undo of the unmark puts S01E01 back
    t.toasts.at(-1)?.action?.onClick();
    await flush();
    expect(t.view().watched.S01E01).toBeDefined();
    expect(hidden(t)).toBe(true);
  });
});
