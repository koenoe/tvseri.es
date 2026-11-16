import type {
  LibraryIds,
  ListItem,
  SeriesPrefs,
  User,
  WatchedItem,
} from '@tvseri.es/schemas';

import {
  airedEpisodes,
  allShows,
  DISNEY_PROVIDER,
  findShow,
  img,
  imgPath,
  type PreferredPicks,
  SHOW_IDS,
  type StubEpisode,
  type StubShow,
} from './catalog.ts';

/**
 * The stub's in-memory state: viewers, what they watched, their lists and
 * per-show prefs, and the admin's preferred images. It lives as long as the
 * stub process; `reset()` restores the seeds (`POST /__stub/reset`).
 */

type Viewer = Readonly<{ id: string; user: User }>;

/** A fake ULID-shaped id: `01STUB<NAME>` padded with zeros to 26 chars. */
const fakeId = (name: string): string =>
  `01STUB${name.toUpperCase()}`.padEnd(26, '0');

const makeUser = (
  name: string,
  role: 'admin' | 'user',
  createdAt: string,
): Viewer => {
  const id = fakeId(name);
  return {
    id,
    user: {
      country: 'GB',
      createdAt,
      email: `${name}@example.com`,
      id,
      name: `${name[0]?.toUpperCase()}${name.slice(1)} Example`,
      role,
      updatedAt: createdAt,
      username: name,
      version: 1,
      watchProviders: [DISNEY_PROVIDER],
    },
  };
};

/**
 * `alex`: a regular user partway through The Bear. `rae` and `kit` seed the
 * same way (alex's twins, from before each test got its own copy of this
 * state: see `signInAs` and the README's isolation rule).
 * `nina`: brand new, nothing tracked. `sam`: an admin with some progress.
 */
export const VIEWERS: Readonly<
  Record<
    | 'alex'
    | 'kit'
    | 'marathonwatcher-2026'
    | 'mira'
    | 'nina'
    | 'rae'
    | 'sam'
    | 'seenit',
    Viewer
  >
> = {
  alex: makeUser('alex', 'user', '2023-07-01T10:00:00.000Z'),
  kit: makeUser('kit', 'user', '2023-07-01T10:00:00.000Z'),
  // the profile's heavy and medium owners (`fixtures/user-profile/heavy.ts`)
  'marathonwatcher-2026': makeUser(
    'marathonwatcher-2026',
    'user',
    '2019-02-28T10:00:00.000Z',
  ),
  mira: makeUser('mira', 'user', '2025-08-15T10:00:00.000Z'),
  nina: makeUser('nina', 'user', '2026-11-12T08:00:00.000Z'),
  rae: makeUser('rae', 'user', '2023-07-01T10:00:00.000Z'),
  sam: makeUser('sam', 'admin', '2022-09-15T09:00:00.000Z'),
  // day 0 with two shows marked "Seen it" (the Library's Finished, no dates)
  seenit: makeUser('seenit', 'user', '2026-11-01T10:00:00.000Z'),
};

export type UserState = {
  extraWatched: number[];
  favorites: Map<number, ListItem>;
  prefs: Map<number, SeriesPrefs>;
  watched: Map<number, Map<string, WatchedItem>>;
  watchlist: Map<number, ListItem>;
  /** Whose state this is (the seeder's key) */
  owner?: ViewerName;
};

type ViewerName = keyof typeof VIEWERS;

type SeriesSeeder = (
  owner: ViewerName,
  seriesId: number,
) => ReadonlyArray<WatchedItem>;

let seriesSeeder: SeriesSeeder | undefined;

/**
 * Seeds a show's watched episodes on first use, for shows other fixtures own
 * (the profile's Library: `show/profile-shows.ts`). Kept out of this module
 * so `stub-auth`, which reads `VIEWERS` here, doesn't load those fixtures.
 */
export const setSeriesSeeder = (seeder: SeriesSeeder): void => {
  seriesSeeder = seeder;
};

const emptyPrefs = (): SeriesPrefs => ({
  firstTrackingAnsweredAt: null,
  neverAskBefore: false,
  paused: null,
  pausedAt: null,
  skipped: [],
});

const emptyState = (): UserState => ({
  extraWatched: [],
  favorites: new Map(),
  prefs: new Map(),
  watched: new Map(),
  watchlist: new Map(),
});

const stateByUser = new Map<string, UserState>();
let preferredImages = new Map<number, PreferredPicks>();

export const episodeKey = (season: number, episode: number): string =>
  `${season}:${episode}`;

export const episodeCode = (season: number, episode: number): string =>
  `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

export const userState = (userId: string): UserState | undefined =>
  stateByUser.get(userId.toUpperCase());

export const viewerById = (userId: string): Viewer | undefined =>
  Object.values(VIEWERS).find((viewer) => viewer.id === userId.toUpperCase());

export const seriesWatched = (
  state: UserState,
  seriesId: number,
): Map<string, WatchedItem> => {
  const existing = state.watched.get(seriesId);
  if (existing) {
    return existing;
  }
  const created = new Map<string, WatchedItem>(
    (state.owner ? seriesSeeder?.(state.owner, seriesId) : undefined)?.map(
      (item) => [episodeKey(item.seasonNumber, item.episodeNumber), item],
    ),
  );
  state.watched.set(seriesId, created);
  return created;
};

export const seriesPrefs = (state: UserState, seriesId: number): SeriesPrefs =>
  state.prefs.get(seriesId) ?? emptyPrefs();

export const setSeriesPrefs = (
  state: UserState,
  seriesId: number,
  prefs: SeriesPrefs,
): void => {
  state.prefs.set(seriesId, prefs);
};

/** What the watched store keeps for one mark. */
export const toWatchedItem = (
  show: Pick<StubShow, 'id' | 'poster' | 'slug' | 'title'>,
  episode: StubEpisode,
  userId: string,
  when: Readonly<{ dateUnknown?: true; watchedAt: number }>,
  provider: Readonly<{ logoPath: string; name: string }> | null,
): WatchedItem => ({
  ...(when.dateUnknown && { dateUnknown: true as const }),
  episodeAirDate: `${episode.airDate}T00:00:00.000Z`,
  episodeNumber: episode.number,
  episodeStillImage: img(episode.still),
  episodeStillPath: imgPath(episode.still),
  episodeTitle: episode.title,
  posterPath: imgPath(show.poster),
  runtime: episode.runtime,
  seasonNumber: episode.season,
  seriesId: show.id,
  slug: show.slug,
  title: show.title,
  userId,
  watchedAt: when.watchedAt,
  ...(provider && {
    watchProviderLogoImage: img(provider.logoPath.replace(/^\//, '')),
    watchProviderLogoPath: provider.logoPath,
    watchProviderName: provider.name,
  }),
});

const toListItem = (
  show: Pick<StubShow, 'id' | 'poster' | 'slug' | 'status' | 'title'>,
): ListItem => ({
  createdAt: Date.now(),
  id: show.id,
  posterImage: img(show.poster),
  posterPath: imgPath(show.poster),
  slug: show.slug,
  status: show.status,
  title: show.title,
});

export const libraryIds = (state: UserState): LibraryIds => {
  const watched = new Set<number>(state.extraWatched);
  const inProgress = new Set<number>();
  for (const show of allShows()) {
    // Regular episodes only, as the API's list sync counts them
    const items = [...(state.watched.get(show.id)?.values() ?? [])].filter(
      (item) => item.seasonNumber > 0,
    );
    if (items.length === 0) {
      continue;
    }
    // The API's rule: a skip of an aired, unwatched episode counts as done
    const watchedCodes = new Set(
      items.map((item) => episodeCode(item.seasonNumber, item.episodeNumber)),
    );
    const skipped = new Set(seriesPrefs(state, show.id).skipped);
    const aired = airedEpisodes(show);
    const doneSkips = aired.filter((episode) => {
      const code = episodeCode(episode.season, episode.number);
      return skipped.has(code) && !watchedCodes.has(code);
    }).length;
    (items.length + doneSkips >= aired.length ? watched : inProgress).add(
      show.id,
    );
  }
  const sorted = (ids: Iterable<number>) => [...ids].sort((a, b) => a - b);
  return {
    favorites: sorted(state.favorites.keys()),
    inProgress: sorted(inProgress),
    watched: sorted(watched),
    watchlist: sorted(state.watchlist.keys()),
  };
};

export const getPreferred = (seriesId: number): PreferredPicks | undefined =>
  preferredImages.get(seriesId);

export const setPreferred = (seriesId: number, picks: PreferredPicks): void => {
  preferredImages.set(seriesId, picks);
};

export const deletePreferred = (seriesId: number): void => {
  preferredImages.delete(seriesId);
};

// --- Seeds -------------------------------------------------------------

/**
 * Alex's history on The Bear, as the board's default state: Seasons 1 and 2
 * watched (S2E3 without a date, S2E5 skipped), Season 3 E1 to E4 watched (E3
 * without a date), E5 is Next up.
 */
const ALEX_BEAR: ReadonlyArray<
  Readonly<{
    at?: string;
    dateUnknown?: true;
    episode: number;
    provider: 'disney' | 'plex';
    season: number;
  }>
> = [
  ...Array.from({ length: 8 }, (_, i) => ({
    at: '2024-11-12T20:31:00.000Z',
    episode: i + 1,
    provider: 'disney' as const,
    season: 1,
  })),
  { at: '2023-07-19T21:12:00.000Z', episode: 1, provider: 'disney', season: 2 },
  { at: '2023-07-19T21:45:00.000Z', episode: 2, provider: 'disney', season: 2 },
  { dateUnknown: true, episode: 3, provider: 'disney', season: 2 },
  { at: '2023-07-20T20:58:00.000Z', episode: 4, provider: 'disney', season: 2 },
  { at: '2023-07-20T22:10:00.000Z', episode: 6, provider: 'disney', season: 2 },
  { at: '2024-12-27T21:03:00.000Z', episode: 7, provider: 'plex', season: 2 },
  { at: '2024-12-27T21:41:00.000Z', episode: 8, provider: 'plex', season: 2 },
  { at: '2024-12-28T20:52:00.000Z', episode: 9, provider: 'plex', season: 2 },
  { at: '2024-12-28T21:35:00.000Z', episode: 10, provider: 'plex', season: 2 },
  { at: '2025-07-02T20:58:00.000Z', episode: 1, provider: 'plex', season: 3 },
  { at: '2025-07-02T21:41:00.000Z', episode: 2, provider: 'plex', season: 3 },
  { dateUnknown: true, episode: 3, provider: 'plex', season: 3 },
  { at: '2025-07-05T22:02:00.000Z', episode: 4, provider: 'plex', season: 3 },
];

const PROVIDERS = {
  disney: { logoPath: DISNEY_PROVIDER.logoPath, name: DISNEY_PROVIDER.name },
  plex: { logoPath: '', name: 'Plex' },
} as const;

const seedWatched = (
  state: UserState,
  userId: string,
  show: StubShow,
  marks: typeof ALEX_BEAR,
): void => {
  const store = seriesWatched(state, show.id);
  for (const mark of marks) {
    const episode = show.episodes.find(
      (e) => e.season === mark.season && e.number === mark.episode,
    );
    if (!episode) {
      continue;
    }
    const watchedAt = mark.at
      ? Date.parse(mark.at)
      : Date.parse('2026-11-10T19:00:00.000Z');
    store.set(
      episodeKey(mark.season, mark.episode),
      toWatchedItem(
        show,
        episode,
        userId,
        mark.dateUnknown ? { dateUnknown: true, watchedAt } : { watchedAt },
        PROVIDERS[mark.provider],
      ),
    );
  }
};

const ANSWERED_AT = Date.parse('2024-11-12T20:30:00.000Z');

/** Alex has seen Lantern Bay's two aired specials and none of its seasons. */
const ALEX_SPECIALS: typeof ALEX_BEAR = [
  { at: '2022-12-24T21:00:00.000Z', episode: 1, provider: 'disney', season: 0 },
  { at: '2023-12-25T20:30:00.000Z', episode: 2, provider: 'disney', season: 0 },
];

const seedAlexLike = (viewer: Viewer, bear: StubShow): UserState => {
  const state = emptyState();
  seedWatched(state, viewer.id, bear, ALEX_BEAR);
  const specials = findShow(SHOW_IDS.specials);
  if (specials) {
    seedWatched(state, viewer.id, specials, ALEX_SPECIALS);
  }
  state.prefs.set(bear.id, {
    ...emptyPrefs(),
    firstTrackingAnsweredAt: ANSWERED_AT,
    skipped: [episodeCode(2, 5)],
  });
  state.favorites.set(bear.id, toListItem(bear));
  // Two shows from the recommendations row, so their pills have states.
  state.extraWatched.push(34307);
  state.watchlist.set(76331, {
    createdAt: Date.now(),
    id: 76331,
    posterImage: img('ep_rec_succession.jpg'),
    posterPath: imgPath('ep_rec_succession.jpg'),
    slug: 'succession',
    status: 'Ended',
    title: 'Succession',
  });
  return state;
};

const seedSam = (bear: StubShow): UserState => {
  const sam = emptyState();
  seedWatched(
    sam,
    VIEWERS.sam.id,
    bear,
    ALEX_BEAR.filter(
      (mark) => mark.season === 1 || (mark.season === 2 && mark.episode <= 3),
    ).map((mark) => ({ ...mark, dateUnknown: undefined })),
  );
  sam.prefs.set(bear.id, {
    ...emptyPrefs(),
    firstTrackingAnsweredAt: ANSWERED_AT,
  });
  return sam;
};

const seedViewer = (name: keyof typeof VIEWERS, bear: StubShow): UserState => {
  switch (name) {
    case 'alex':
    case 'kit':
    case 'rae':
      return seedAlexLike(VIEWERS[name], bear);
    case 'marathonwatcher-2026':
    case 'mira':
    case 'nina':
    case 'seenit':
      return emptyState();
    case 'sam':
      return seedSam(bear);
  }
};

const seedFor = (name: ViewerName, bear: StubShow): UserState => ({
  ...seedViewer(name, bear),
  owner: name,
});

/**
 * Restores the seeds: one viewer's (`reset('rae')`, what a spec that writes
 * calls) or everything (admin picks included).
 */
export const reset = (viewer?: keyof typeof VIEWERS): void => {
  const bear = findShow(SHOW_IDS.bear) as StubShow;
  if (viewer) {
    stateByUser.set(VIEWERS[viewer].id, seedFor(viewer, bear));
    return;
  }
  stateByUser.clear();
  preferredImages = new Map();
  for (const name of Object.keys(VIEWERS) as Array<keyof typeof VIEWERS>) {
    stateByUser.set(VIEWERS[name].id, seedFor(name, bear));
  }
};

reset();
