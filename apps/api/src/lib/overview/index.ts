import type {
  ComingUpItem,
  Overview,
  UpNextItem,
  WaitingFor,
} from '@tvseri.es/schemas';

import { getSeriesPrefsMany } from '@/lib/db/prefs';
import {
  type FollowedShow,
  followedShows,
  MAX_IN_PROGRESS,
  readInProgress,
  readWatchlist,
  watchProviderOf,
} from '@/lib/followed';
import { readShowItems } from '@/lib/rollups';
import { releaseOf, seasonEpisodes } from '@/lib/seasonEpisodes';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { getSeriesRuntimes } from '@/lib/seriesRuntimes';
import { withTmdbCap } from '@/lib/upstream/requestCap';
import { readWaitingFor } from '@/lib/waitingFor';
import { orLeaveOut } from '@/utils/orLeaveOut';

import { analyzeShow, type ShowState } from './analyze';
import {
  buildAlmostDone,
  buildCatchingUp,
  buildComingUp,
  buildOutNow,
  buildPaused,
  buildUpNext,
  datedLater,
  isStale,
  returnsSoon,
  waitingForLater,
} from './blocks';

// Enrichment per request: titles of the first Up next tiles, and release +
// provider of the first tickets (seasons cached, providers per request)
const MAX_TITLES = 3;
const MAX_TICKETS = 10;

/** Episode titles and air dates for the first few Up next tiles */
const withEpisodeTitles = async (items: ReadonlyArray<UpNextItem>) => {
  const head = await Promise.all(
    items.slice(0, MAX_TITLES).map(async (item) => {
      const episodes = (
        await orLeaveOut('Overview: season', () =>
          seasonEpisodes(item.seriesId, [item.season]),
        )
      )?.get(item.season);
      const episode = episodes?.find(
        (candidate) => candidate.episodeNumber === item.episode,
      );
      return episode
        ? { ...item, airDate: episode.airDate, episodeTitle: episode.title }
        : item;
    }),
  );
  return [...head, ...items.slice(MAX_TITLES)];
};

/**
 * Release style (premieres; an episode's comes from the facts) and where to
 * watch for the first tickets
 */
const withTicketDetails = async (
  tickets: ReadonlyArray<ComingUpItem>,
  country: string | undefined,
) => {
  const detailed = await Promise.all(
    tickets.slice(0, MAX_TICKETS).map(async (ticket) => {
      const [episodes, provider] = await Promise.all([
        ticket.kind === 'season-premiere'
          ? orLeaveOut('Overview: ticket season', async () =>
              (await seasonEpisodes(ticket.seriesId, [ticket.season])).get(
                ticket.season,
              ),
            )
          : undefined,
        watchProviderOf(ticket.seriesId, country, 'Overview: ticket provider'),
      ]);
      return {
        ...ticket,
        provider,
        release: (episodes && releaseOf(episodes)) ?? ticket.release,
      };
    }),
  );
  return [...detailed, ...tickets.slice(MAX_TICKETS)];
};

/** Finished shows that return within 30 days are tickets too */
const finishedTickets = (
  followed: ReadonlyArray<FollowedShow>,
): ComingUpItem[] =>
  followed
    .flatMap((show) => (show.from === 'finished' ? [show.item] : []))
    .filter(returnsSoon)
    .map((item) => ({
      date: item.nextDate,
      daysToGo: item.daysToGo,
      episode: item.nextEpisode ?? 1,
      ...(item.finishedAt && { finishedAt: item.finishedAt }),
      // readWaitingFor already worked out premiere, finale or episode from TMDB's
      // season size; a finale guessed from the number alone came out "episode"
      kind:
        item.nextKind ??
        (item.nextEpisode === 1 ? 'season-premiere' : 'episode'),
      onWatchlist: false,
      posterImage: item.posterImage,
      provider: null,
      release: null,
      season: item.nextSeason,
      seriesId: item.seriesId,
      slug: item.slug,
      title: item.title,
    }));

/**
 * Paused looks at every In progress show up to this many, not only the
 * `MAX_IN_PROGRESS` most recent the other blocks read: the stalest shows are
 * the ones it is for. Past those, only shows whose place (the last watch)
 * is 3 months old are read, in batches (facts, prefs, summaries).
 */
const MAX_PAUSED_SCAN = 300;
/** TMDB calls for the older shows' facts (missing ones); later views fill the rest */
const MAX_PAUSED_TMDB_CALLS = 10;

type ListedShow = Awaited<ReturnType<typeof readInProgress>>[number];

/**
 * The In progress shows past the first `MAX_IN_PROGRESS`, for Paused only:
 * the stale ones by their place, analysed from their facts (shared, cached;
 * at most `MAX_PAUSED_TMDB_CALLS` TMDB calls), prefs and summaries.
 */
const olderStates = async (
  userId: string,
  older: ReadonlyArray<ListedShow>,
  now: number,
): Promise<ShowState[]> => {
  const ids = older
    .filter((item) => isStale(item.createdAt ?? 0, now))
    .map((item) => item.id);
  if (ids.length === 0) return [];
  const [facts, prefs, watched] = await Promise.all([
    withTmdbCap(MAX_PAUSED_TMDB_CALLS, () => getSeriesFacts(ids)),
    getSeriesPrefsMany(userId, ids),
    readShowItems(userId, ids),
  ]);
  return ids.flatMap((id) => {
    const showFacts = facts.get(id);
    return showFacts
      ? [
          analyzeShow(
            {
              facts: showFacts,
              prefs: prefs.get(id) ?? NO_PREFS,
              watched: watched.get(id) ?? [],
            },
            now,
          ),
        ]
      : [];
  });
};

type OverviewOptions = Readonly<{
  /**
   * Only Up next (the visitor page's Watching now and Also watching): skips
   * the watchlist, the finished shows, Coming up and the ticket lookups; every other
   * block comes back empty.
   */
  upNextOnly?: boolean;
}>;

const NOTHING_WAITING: WaitingFor = { items: [] };
const NO_PREFS = { paused: null, pausedAt: null, skipped: [] } as const;

/**
 * The profile overview, computed per request: the in-progress shows
 * (facts, prefs, per-show summaries) feed Up next, Almost done, Out now,
 * Catching up and Paused; Coming up adds the watchlist and the finished shows
 * that return within 30 days.
 */
export const getOverview = async (
  userId: string,
  country: string | undefined,
  now: number,
  { upNextOnly = false }: OverviewOptions = {},
): Promise<Overview> => {
  const [inProgress, saved, finished] = await Promise.all([
    readInProgress(userId, upNextOnly ? MAX_IN_PROGRESS : MAX_PAUSED_SCAN),
    upNextOnly ? [] : readWatchlist(userId),
    upNextOnly ? null : readWaitingFor(userId, now),
  ]);
  const waiting = finished?.waitingFor ?? NOTHING_WAITING;
  const tracked = inProgress.slice(0, MAX_IN_PROGRESS);

  // Each show's items: their summaries in one read (a show without one is
  // read itself); a failed read fails the request rather than showing the
  // show as unwatched
  const trackedIds = tracked.map((item) => item.id);
  const [facts, prefs, watched] = await Promise.all([
    getSeriesFacts([...tracked, ...saved].map((item) => item.id)),
    getSeriesPrefsMany(userId, trackedIds),
    readShowItems(userId, trackedIds),
  ]);

  const analyzed = tracked.flatMap((item) => {
    const showFacts = facts.get(item.id);
    return showFacts
      ? [
          analyzeShow(
            {
              facts: showFacts,
              prefs: prefs.get(item.id) ?? NO_PREFS,
              watched: watched.get(item.id) ?? [],
            },
            now,
          ),
        ]
      : [];
  });
  // Time left sums each episode's own runtime (cached, shared): only the
  // shows with an aired episode left need them
  const runtimes = await getSeriesRuntimes(
    analyzed
      .filter((state) => state.unwatched.length > 0)
      .map((state) => ({
        id: state.facts.id,
        seasons: state.facts.seasons.map((season) => season.seasonNumber),
      })),
  );
  const states = analyzed.map((state) => ({
    ...state,
    runtimes: runtimes.get(state.facts.id) ?? {},
  }));
  if (upNextOnly) {
    return {
      almostDone: { closest: null, items: [] },
      catchingUp: [],
      comingUp: [],
      outNow: [],
      paused: [],
      upNext: await withEpisodeTitles(buildUpNext(states)),
    };
  }

  const savedStates = saved.flatMap((item) => {
    const showFacts = facts.get(item.id);
    return showFacts
      ? [
          {
            onWatchlist: true,
            state: analyzeShow(
              { facts: showFacts, prefs: NO_PREFS, watched: [] },
              now,
            ),
          },
        ]
      : [];
  });

  const trackedById = new Map(states.map((state) => [state.facts.id, state]));
  const savedById = new Map(
    savedStates.map(({ state }) => [state.facts.id, state]),
  );
  const followed = followedShows({
    finished: waiting.items,
    inProgress: [...trackedById.keys()],
    prefs,
    watchlist: [...savedById.keys()],
  });
  const own = buildComingUp(
    followed.flatMap((show) => {
      const state =
        show.from === 'in-progress'
          ? trackedById.get(show.seriesId)
          : show.from === 'watchlist'
            ? savedById.get(show.seriesId)
            : undefined;
      return state ? [{ onWatchlist: show.from === 'watchlist', state }] : [];
    }),
    now,
  );
  const comingUp = [...own, ...finishedTickets(followed)].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const nextDates = followed.map((show) =>
    show.from === 'finished'
      ? show.item.nextDate
      : facts.get(show.seriesId)?.nextEpisodeToAir?.airDate,
  );

  const [upNext, tickets, older] = await Promise.all([
    withEpisodeTitles(buildUpNext(states)),
    withTicketDetails(comingUp, country),
    olderStates(userId, inProgress.slice(MAX_IN_PROGRESS), now),
  ]);

  return {
    almostDone: buildAlmostDone(states),
    catchingUp: buildCatchingUp(states, now),
    comingUp: tickets,
    datedLater: datedLater(nextDates, now),
    outNow: buildOutNow(states, now),
    paused: buildPaused([...states, ...older], now),
    upNext,
    // Computed here anyway (Coming up's finished shows), so the profile
    // page needs no second request for it
    waitingFor: waitingForLater(waiting),
  };
};
