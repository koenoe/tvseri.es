import type {
  ComingUpItem,
  Overview,
  UpNextItem,
  WaitingFor,
} from '@tvseri.es/schemas';

import { getAllListItems } from '@/lib/db/list';
import { getSeriesPrefsMany } from '@/lib/db/prefs';
import { readShowItems } from '@/lib/rollups';
import { releaseOf, seasonEpisodes } from '@/lib/seasonEpisodes';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { getSeriesRuntimes } from '@/lib/seriesRuntimes';
import { fetchTvSeriesWatchProvider } from '@/lib/tmdb';
import { getWaitingFor } from '@/lib/waitingFor';
import { logWarn } from '@/utils/logWarn';

import { analyzeShow } from './analyze';
import {
  buildAlmostDone,
  buildCatchingUp,
  buildComingUp,
  buildOutNow,
  buildPaused,
  buildUpNext,
  returnsSoon,
  waitingForLater,
} from './blocks';

// In-progress shows read (their per-show summaries), most recently added first
const MAX_IN_PROGRESS = 60;
const MAX_WATCHLIST = 100;
// Enrichment per request: titles of the first Up next tiles, and release +
// provider of the first tickets (seasons cached, providers per request)
const MAX_TITLES = 3;
const MAX_TICKETS = 10;

const attempt = async <T>(label: string, run: () => Promise<T>) => {
  try {
    return await run();
  } catch (error) {
    logWarn(`Overview: ${label} failed, leaving it out`, error);
    return undefined;
  }
};

/** Episode titles and air dates for the first few Up next tiles */
const withEpisodeTitles = async (items: ReadonlyArray<UpNextItem>) => {
  const head = await Promise.all(
    items.slice(0, MAX_TITLES).map(async (item) => {
      const episodes = (
        await attempt('season', () =>
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
          ? attempt('ticket season', async () =>
              (await seasonEpisodes(ticket.seriesId, [ticket.season])).get(
                ticket.season,
              ),
            )
          : undefined,
        country
          ? attempt('ticket provider', () =>
              fetchTvSeriesWatchProvider(ticket.seriesId, country),
            )
          : undefined,
      ]);
      return {
        ...ticket,
        provider: provider
          ? { logoImage: provider.logo, name: provider.name }
          : null,
        release: (episodes && releaseOf(episodes)) ?? ticket.release,
      };
    }),
  );
  return [...detailed, ...tickets.slice(MAX_TICKETS)];
};

/** Finished shows that return within 30 days are tickets too */
const finishedTickets = (waiting: WaitingFor): ComingUpItem[] =>
  waiting.items.filter(returnsSoon).map((item) => ({
    date: item.nextDate,
    daysToGo: item.daysToGo,
    episode: item.nextEpisode ?? 1,
    ...(item.finishedAt && { finishedAt: item.finishedAt }),
    // getWaitingFor already worked out premiere, finale or episode from TMDB's
    // season size; a finale guessed from the number alone came out "episode"
    kind:
      item.nextKind ?? (item.nextEpisode === 1 ? 'season-premiere' : 'episode'),
    onWatchlist: false,
    posterImage: item.posterImage,
    provider: null,
    release: null,
    season: item.nextSeason,
    seriesId: item.seriesId,
    slug: item.slug,
    title: item.title,
  }));

type OverviewOptions = Readonly<{
  /**
   * Only Up next (the visitor page's Watching now and Also watching): skips
   * the watchlist, the finished shows, Coming up and the ticket lookups; every other
   * block comes back empty.
   */
  upNextOnly?: boolean;
}>;

const NOTHING_WAITING: WaitingFor = { items: [] };

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
  const [inProgress, watchlist, waiting] = await Promise.all([
    getAllListItems({ listId: 'IN_PROGRESS', sortDirection: 'desc', userId }),
    upNextOnly
      ? []
      : getAllListItems({ listId: 'WATCHLIST', sortDirection: 'desc', userId }),
    upNextOnly ? NOTHING_WAITING : getWaitingFor(userId),
  ]);
  const tracked = inProgress.slice(0, MAX_IN_PROGRESS);
  const saved = watchlist.slice(0, MAX_WATCHLIST);

  // Each show's items: their summaries in one read (a show without one is
  // read itself); a failed read fails the request rather than showing the
  // show as unwatched
  const trackedIds = tracked.map((item) => item.id);
  const [facts, prefs, watched] = await Promise.all([
    getSeriesFacts([...tracked, ...saved].map((item) => item.id)),
    getSeriesPrefsMany(userId, trackedIds),
    readShowItems(userId, trackedIds),
  ]);

  const noPrefs = { paused: null, pausedAt: null, skipped: [] } as const;
  const analyzed = tracked.flatMap((item) => {
    const showFacts = facts.get(item.id);
    return showFacts
      ? [
          analyzeShow(
            {
              facts: showFacts,
              prefs: prefs.get(item.id) ?? noPrefs,
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
              { facts: showFacts, prefs: noPrefs, watched: [] },
              now,
            ),
          },
        ]
      : [];
  });

  const own = buildComingUp(
    [...states.map((state) => ({ onWatchlist: false, state })), ...savedStates],
    now,
  );
  const known = new Set(own.map((ticket) => ticket.seriesId));
  const comingUp = [
    ...own,
    ...finishedTickets(waiting).filter((ticket) => !known.has(ticket.seriesId)),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const [upNext, tickets] = await Promise.all([
    withEpisodeTitles(buildUpNext(states)),
    withTicketDetails(comingUp, country),
  ]);

  return {
    almostDone: buildAlmostDone(states),
    catchingUp: buildCatchingUp(states, now),
    comingUp: tickets,
    outNow: buildOutNow(states, now),
    paused: buildPaused(states, now),
    upNext,
    // Computed here anyway (Coming up's finished shows), so the profile
    // page needs no second request for it
    ...(!upNextOnly && { waitingFor: waitingForLater(waiting) }),
  };
};
