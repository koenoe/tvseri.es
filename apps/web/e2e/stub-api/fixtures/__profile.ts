import type {
  ListItemFacts,
  Overview,
  SeriesPrefs,
  TvSeries,
} from '@tvseri.es/schemas';

import type { StubRequest, StubResponse, StubRoute } from '../types.ts';
import {
  heavyCircle,
  heavyLedger,
  heavyLedgerDetail,
  heavyMatch,
  heavyOverview,
  heavyWaitingFor,
  miraLedger,
  miraLedgerDetail,
  miraOverview,
  miraWaitingFor,
} from './user-profile/heavy.ts';
import { fail, ok, viewerIdOf } from './user-profile/http.ts';
import {
  libraryIds,
  listCount,
  listPage,
  statsGenres,
  statsProviders,
  statsSummary,
  statsWeekly,
} from './user-profile/library.ts';
import { isOutageId } from './user-profile/outage.ts';
import {
  alexLedger,
  alexLedgerDetail,
  alexOverview,
  alexWaitingFor,
  doneGetStarted,
  emptyOverview,
  newGetStarted,
  samOverview,
} from './user-profile/overview.ts';
import { historyItems, watchedPage } from './user-profile/pages-diary.ts';
import {
  catalogueShow,
  progressOf,
  seasonSizes,
} from './user-profile/pages-library.ts';
import {
  PEOPLE,
  type PersonName,
  PROVIDERS,
  personById,
  personByUsername,
  publicUser,
} from './user-profile/people.ts';
import { identity, showById } from './user-profile/shows.ts';
import {
  circle,
  followPage,
  follows,
  match,
  writeFollow,
} from './user-profile/social.ts';
import { kitOverview, raeOverview } from './user-profile/states.ts';
import { daysAgo } from './user-profile/time.ts';
import { withWatching } from './user-profile/watchingFollows.ts';

/**
 * The profile page's stub routes: identities, counts, lists,
 * history, the overview, ledger, Waiting for, Get started, the match, the
 * circle and follows, per invented person (`user-profile/people.ts`).
 * The file name sorts first, so these answer before Home's `/me*` routes;
 * a request that isn't about these people (another stream's viewer or
 * show) gets no answer here and the next matching fixture decides.
 */

type Name = PersonName;

const nameOf = (id: string | undefined): Name | null => {
  // an outage profile reads as juno (`user-profile/outage.ts`)
  if (isOutageId(id)) {
    return 'juno';
  }
  const person = id ? personById(id) : undefined;
  return person ? (person.user.username as Name) : null;
};

const viewerOf = (request: StubRequest): Name | null =>
  nameOf(viewerIdOf(request.headers) ?? undefined);

/** `user()` + `requireAuth()`: someone else's id passes on, 401 without a token */
const withOwner = (
  request: StubRequest,
  handle: (owner: Name, viewer: Name | null) => StubResponse,
  { auth = false }: Readonly<{ auth?: boolean }> = {},
): StubResponse | undefined => {
  const owner = nameOf(request.params.id);
  if (!owner) {
    return undefined;
  }
  const viewer = viewerOf(request);
  if (auth && !viewer) {
    return fail(401, 'Authentication required');
  }
  return handle(owner, viewer);
};

/** `/me/*`: 401 without a token; another fixture's viewer passes on */
const withViewer = (
  request: StubRequest,
  handle: (viewer: Name) => StubResponse,
): StubResponse | undefined => {
  if (!request.headers.authorization) {
    return fail(401, 'Authentication required');
  }
  const viewer = viewerOf(request);
  return viewer ? handle(viewer) : undefined;
};

/** juno's tracker, as a visitor reads it */
const junoOverview = (): Overview => ({
  ...emptyOverview(),
  upNext: [
    {
      ...identity('haikyu'),
      airDate: '2020-01-10',
      code: 'S03E02',
      episode: 2,
      episodeTitle: 'Guess Monster',
      isLatest: false,
      lastWatchedAt: daysAgo(0, 9),
      lastWatchedCode: 'S03E01',
      nextSeasonTba: false,
      nextToAir: null,
      runtime: 24,
      season: 3,
      seasonFinale: false,
      seasonTotal: 10,
      seasonWatched: 1,
      timeLeftMinutes: 216,
      toWatch: 9,
    },
    {
      ...identity('witchHat'),
      code: 'S01E08',
      episode: 8,
      isLatest: false,
      lastWatchedAt: daysAgo(5),
      lastWatchedCode: 'S01E07',
      nextSeasonTba: false,
      nextToAir: null,
      runtime: 24,
      season: 1,
      seasonFinale: false,
      seasonTotal: 13,
      seasonWatched: 7,
      timeLeftMinutes: 144,
      toWatch: 6,
    },
    {
      ...identity('xmen'),
      code: 'S02E04',
      episode: 4,
      isLatest: false,
      lastWatchedAt: daysAgo(5),
      lastWatchedCode: 'S02E03',
      nextSeasonTba: false,
      nextToAir: null,
      runtime: 35,
      season: 2,
      seasonFinale: false,
      seasonTotal: 10,
      seasonWatched: 3,
      timeLeftMinutes: 245,
      toWatch: 7,
    },
  ],
});

const overviewOf = (name: Name): Overview =>
  name === 'alex'
    ? alexOverview()
    : name === 'rae'
      ? raeOverview()
      : name === 'juno'
        ? junoOverview()
        : name === 'sam'
          ? samOverview()
          : name === 'marathonwatcher-2026'
            ? heavyOverview()
            : name === 'mira'
              ? miraOverview()
              : name === 'kit'
                ? kitOverview()
                : emptyOverview();

const waitingForOf = (name: Name) =>
  name === 'alex' || name === 'rae'
    ? alexWaitingFor()
    : name === 'marathonwatcher-2026'
      ? heavyWaitingFor()
      : name === 'mira'
        ? miraWaitingFor()
        : { endedCount: 0, items: [] };

const ledgerOf = (name: Name) =>
  name === 'alex' || name === 'rae'
    ? // rae has the real-data shape: a show with 23 missing episodes
      alexLedger({ manyHoles: name === 'rae' })
    : name === 'marathonwatcher-2026'
      ? heavyLedger()
      : name === 'mira'
        ? miraLedger()
        : { shows: [] };

const ledgerDetailOf = (name: Name, seriesId: number) =>
  name === 'alex' || name === 'rae'
    ? alexLedgerDetail(seriesId, { manyHoles: name === 'rae' })
    : name === 'marathonwatcher-2026'
      ? heavyLedgerDetail(seriesId)
      : name === 'mira'
        ? miraLedgerDetail(seriesId)
        : null;

/** `?include=facts`: what the favourites accordion draws per tile */
const factsOf = (owner: Name, id: number): ListItemFacts | null => {
  const show = showById(id);
  if (!show) {
    return null;
  }
  const ids = libraryIds(owner);
  const progress: ListItemFacts['progress'] = ids.watched.includes(id)
    ? { finishedAt: daysAgo(9), state: 'finished' }
    : ids.inProgress.includes(id)
      ? { season: show.seasons, state: 'watching' }
      : { state: 'none' };
  return {
    backdropImage: show.backdrop,
    progress,
    seasonCount: show.seasons,
    status: show.status,
    totalRuntime: show.runtime * show.episodes,
    type: show.type,
  };
};

/** `GET /series/:id` for the profile's shows (backdrop and title treatment) */
const seriesOf = (id: number): TvSeries | null => {
  const show = catalogueShow(id);
  if (!show) {
    return null;
  }
  // the split and the aired count the Library's progress and marking use
  const sizes = seasonSizes(show);
  const { aired } = progressOf(show);
  const before = (index: number) =>
    sizes.slice(0, index).reduce((sum, size) => sum + size, 0);
  return {
    backdropColor: '#1c2223',
    backdropImage: show.backdrop,
    backdropPath: show.backdrop ? `/${show.backdrop.split('/').pop()}` : '',
    // the schema's required fields in full (the cast below can't check
    // them): without them the show page a row links to threw reading
    // `createdBy.length` and `languages.length` while a test opened it
    countries: [],
    createdBy: [],
    description: '',
    firstAirDate: show.firstAired,
    genres: show.genres.map((name, index) => ({
      id: index + 1,
      name,
      slug: name.toLowerCase(),
    })),
    hasAired: true,
    id: show.id,
    languages: [],
    lastAirDate: show.firstAired,
    numberOfEpisodes: show.episodes,
    numberOfSeasons: show.seasons,
    originalLanguage: 'en',
    originalTitle: show.title,
    posterImage: show.poster,
    posterPath: show.poster ? `/${show.poster.split('/').pop()}` : '',
    releaseYear: show.firstAired.slice(0, 4),
    seasons: sizes.map((size, index) => ({
      airDate: show.firstAired,
      description: '',
      episodes: [],
      hasAired: aired > before(index),
      id: show.id * 100 + index + 1,
      numberOfAiredEpisodes: Math.max(0, Math.min(size, aired - before(index))),
      numberOfEpisodes: size,
      seasonNumber: index + 1,
      title: `Season ${index + 1}`,
    })),
    slug: show.slug,
    status: show.status,
    tagline: '',
    title: show.title,
    titleTreatmentImage: show.logo || undefined,
    type: show.type,
  } as unknown as TvSeries;
};

const prefsFor = (body: unknown): SeriesPrefs =>
  ({
    firstTrackingAnsweredAt: null,
    neverAskBefore: false,
    paused:
      (body as { paused?: 'keep' | 'hide' | null } | undefined)?.paused ?? null,
    pausedAt: Date.now(),
    skipped: [],
  }) as unknown as SeriesPrefs;

export const routes: readonly StubRoute[] = [
  // ── the viewer ───────────────────────────────────────────────
  {
    handle: (request) =>
      withViewer(request, (viewer) => ok(PEOPLE[viewer].user)),
    path: '/me',
  },
  {
    handle: (request) =>
      withViewer(request, (viewer) => ok(libraryIds(viewer))),
    path: '/me/library-ids',
  },
  {
    handle: (request) =>
      withViewer(request, (viewer) =>
        // Waiting for rides along the full overview, as the API answers it
        ok(
          request.query.get('view') === 'up-next'
            ? overviewOf(viewer)
            : { ...overviewOf(viewer), waitingFor: waitingForOf(viewer) },
        ),
      ),
    path: '/me/overview',
  },
  // kit's home (Continue watching e2e): the other personal rows are empty
  {
    handle: (request) =>
      viewerOf(request) === 'kit' ? ok({ items: [], source: null }) : undefined,
    path: '/me/home/because-you-watched',
  },
  {
    handle: (request) =>
      viewerOf(request) === 'kit'
        ? ok({ genre: null, items: [], share: { matching: 0, sampled: 0 } })
        : undefined,
    path: '/me/home/more-genre',
  },
  {
    handle: (request) =>
      withViewer(request, (viewer) =>
        // sam's ledger read fails: the block's failed state, in its lane
        viewer === 'sam' ? fail(500, 'Internal error') : ok(ledgerOf(viewer)),
      ),
    path: '/me/ledger',
  },
  {
    handle: (request) =>
      withViewer(request, (viewer) => {
        const detail = ledgerDetailOf(viewer, Number(request.params.id));
        return detail ? ok(detail) : fail(404, 'Not found');
      }),
    path: '/me/ledger/:id',
  },
  {
    handle: (request) =>
      withViewer(request, (viewer) =>
        ok(viewer === 'nina' ? newGetStarted() : doneGetStarted()),
      ),
    path: '/me/get-started',
  },
  {
    handle: (request) =>
      withViewer(request, (viewer) =>
        ok(viewer === 'marathonwatcher-2026' ? heavyCircle() : circle(viewer)),
      ),
    path: '/me/circle',
  },
  {
    handle: (request) => withViewer(request, () => ok(prefsFor(request.body))),
    method: 'PATCH',
    path: '/me/series/:id/prefs',
  },

  {
    handle: (request) =>
      withViewer(request, (viewer) => ok(PEOPLE[viewer].user)),
    method: 'PUT',
    path: '/me/watch-providers',
  },
  {
    handle: () => ok(Object.values(PROVIDERS)),
    path: '/discover/watch-providers',
  },

  // ── any profile ──────────────────────────────────────────────
  {
    handle: ({ params }) => {
      const person = personByUsername(params.username ?? '');
      return person ? ok(publicUser(person)) : undefined;
    },
    path: '/user/by-username/:username',
  },
  {
    handle: (request) =>
      withOwner(request, (owner) => ok({ count: PEOPLE[owner].episodes })),
    path: '/user/:id/watched/count',
  },
  {
    handle: (request) =>
      withOwner(request, (owner) =>
        ok({
          count:
            request.params.list === 'watched'
              ? PEOPLE[owner].finished
              : listCount(owner, request.params.list ?? ''),
        }),
      ),
    path: '/user/:id/list/:list/count',
  },
  {
    handle: (request) =>
      withOwner(request, (owner) => ok({ count: PEOPLE[owner].followers })),
    path: '/user/:id/followers/count',
  },
  {
    handle: (request) =>
      withOwner(request, (owner) => ok({ count: PEOPLE[owner].following })),
    path: '/user/:id/following/count',
  },
  {
    handle: (request) =>
      withOwner(
        request,
        (owner) => {
          const page = listPage(
            owner,
            request.params.list ?? '',
            request.query.get('cursor'),
            Number(request.query.get('limit') ?? 20),
          );
          if (request.query.get('include') !== 'facts') {
            return ok(page);
          }
          return ok({
            ...page,
            items: page.items.map((item) => ({
              ...item,
              facts: factsOf(owner, item.id),
            })),
          });
        },
        { auth: true },
      ),
    path: '/user/:id/list/:list',
  },
  {
    handle: (request) =>
      withOwner(
        request,
        (owner) => {
          const page = watchedPage(historyItems(owner), request.query);
          return 'error' in page ? fail(400, page.error) : ok(page);
        },
        { auth: true },
      ),
    path: '/user/:id/watched',
  },
  {
    handle: (request) =>
      withOwner(request, (owner) => ok(overviewOf(owner)), { auth: true }),
    path: '/user/:id/overview',
  },
  {
    handle: (request) =>
      withOwner(
        request,
        (owner, viewer) =>
          viewer === owner
            ? fail(400, 'No match with yourself')
            : owner === 'marathonwatcher-2026'
              ? ok(heavyMatch(viewer ? follows(viewer, owner) : false))
              : ok(match(viewer as Name, owner)),
        { auth: true },
      ),
    path: '/user/:id/match',
  },
  {
    handle: (request) =>
      withOwner(
        request,
        (owner, viewer) =>
          withWatching(
            request.query,
            followPage(owner, 'followers', viewer, {
              circle: request.query.has('include'),
            }),
          ),
        {
          auth: true,
        },
      ),
    path: '/user/:id/followers',
  },
  {
    handle: (request) =>
      withOwner(
        request,
        (owner, viewer) =>
          withWatching(
            request.query,
            followPage(owner, 'following', viewer, {
              circle: request.query.has('include'),
            }),
          ),
        {
          auth: true,
        },
      ),
    path: '/user/:id/following',
  },
  {
    // does :id follow :fid
    handle: (request) =>
      withOwner(
        request,
        (owner) => {
          const other = nameOf(request.params.fid);
          return ok({ value: other ? follows(owner, other) : false });
        },
        { auth: true },
      ),
    path: '/user/:id/following/:fid',
  },
  {
    handle: (request) =>
      withOwner(
        request,
        (owner, viewer) => {
          if (viewer) {
            writeFollow(viewer, owner, true);
          }
          return ok({ message: 'OK' });
        },
        { auth: true },
      ),
    method: 'POST',
    path: '/user/:id/follow',
  },
  {
    handle: (request) =>
      withOwner(
        request,
        (owner, viewer) => {
          if (viewer) {
            writeFollow(viewer, owner, false);
          }
          return ok({ message: 'OK' });
        },
        { auth: true },
      ),
    method: 'DELETE',
    path: '/user/:id/unfollow',
  },

  // ── this year (public, `stats` cache life) ───────────────────
  {
    handle: (request) => withOwner(request, (owner) => ok(statsSummary(owner))),
    path: '/user/:id/stats/:year/summary',
  },
  {
    handle: (request) => withOwner(request, (owner) => ok(statsWeekly(owner))),
    path: '/user/:id/stats/:year/weekly',
  },
  {
    handle: (request) => withOwner(request, (owner) => ok(statsGenres(owner))),
    path: '/user/:id/stats/:year/genres',
  },
  {
    handle: (request) =>
      withOwner(request, (owner) => ok(statsProviders(owner))),
    path: '/user/:id/stats/:year/providers',
  },
  {
    handle: (request) => withOwner(request, () => ok({ timeZone: 'UTC' })),
    path: '/user/:id/stats/zone',
  },

  // ── the profile's shows (the show fixtures answer first after a merge) ─
  {
    handle: ({ params }) => {
      const series = seriesOf(Number(params.id));
      return series ? ok(series) : undefined;
    },
    path: '/series/:id',
  },
];
