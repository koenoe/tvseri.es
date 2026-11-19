import type {
  Calendar,
  CalendarShow,
  SeriesFacts,
  WaitingForItem,
} from '@tvseri.es/schemas';
import { buildPosterImageUrl, todayUtc } from '@tvseri.es/utils';

import { getSeriesPrefsMany } from '@/lib/db/prefs';
import {
  followedShows,
  readInProgress,
  readWatchlist,
  watchProviderOf,
} from '@/lib/followed';
import { type SeasonEpisode, seasonEpisodes } from '@/lib/seasonEpisodes';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { withTmdbCap } from '@/lib/upstream/requestCap';
import { readWaitingFor } from '@/lib/waitingFor';
import { createLimiter } from '@/utils/limit';
import { orLeaveOut } from '@/utils/orLeaveOut';

import { buildDays, type CalendarWindow, type ShowSeasons } from './build';

/** Months covered, this one included */
const MONTHS = 12;
/**
 * Seasons read per show: the one airing and what TMDB lists after it (a
 * season already listed with episodes may have dates within the year)
 */
const MAX_SEASONS = 3;
/**
 * TMDB calls one request may make for season reads, and for provider reads
 * (cached reads are free): a cold heavy profile fills in over a few views
 * instead of spending the instance's budget at once. The nearest shows go
 * first; the rest show their next episode from the facts, no service.
 */
const MAX_SEASON_CALLS = 12;
const MAX_PROVIDER_CALLS = 12;

/** Nearest first: the next episode's date; shows with only past days last */
const byNearest = (a: SeriesFacts, b: SeriesFacts) =>
  (a.nextEpisodeToAir?.airDate || '9999').localeCompare(
    b.nextEpisodeToAir?.airDate || '9999',
  );

type Source = Readonly<{
  facts: SeriesFacts;
  onWatchlist: boolean;
  finishedAt?: number;
}>;

const windowAt = (now: number): CalendarWindow => {
  const today = todayUtc(now);
  const date = new Date(now);
  return {
    from: `${today.slice(0, 7)}-01`,
    // Day 0 of a month is the last day of the one before
    to: todayUtc(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + MONTHS, 0),
    ),
    today,
  };
};

/**
 * The seasons whose episodes may fall in the window: from the one that
 * aired last this month (the past days show what aired), else the one of
 * the next episode, on. None for a show with nothing dated in the window.
 */
const seasonsToRead = (facts: SeriesFacts, window: CalendarWindow) => {
  const last = facts.lastEpisodeToAir;
  const next = facts.nextEpisodeToAir;
  const airedThisMonth = Boolean(last?.airDate && last.airDate >= window.from);
  const nextInWindow = Boolean(next?.airDate && next.airDate <= window.to);
  if (!airedThisMonth && !nextInWindow) return [];
  const start = airedThisMonth
    ? (last?.seasonNumber ?? 0)
    : (next?.seasonNumber ?? 0);
  return [
    ...new Set([
      start,
      ...(next ? [next.seasonNumber] : []),
      ...facts.seasons
        .map((season) => season.seasonNumber)
        .filter((number) => number > start),
    ]),
  ]
    .filter((number) => number > 0)
    .sort((a, b) => a - b)
    .slice(0, MAX_SEASONS);
};

/**
 * The show's seasons as read; when a read fails, the next episode from the
 * facts alone stands in, so a show on the overview's Coming up is never
 * missing here
 */
const readShowSeasons = async (
  facts: SeriesFacts,
  numbers: ReadonlyArray<number>,
): Promise<ShowSeasons> => {
  const read = await orLeaveOut('Calendar: seasons', () =>
    seasonEpisodes(facts.id, numbers),
  );
  const next = facts.nextEpisodeToAir;
  if (!next?.airDate || read?.has(next.seasonNumber)) {
    return { facts, seasons: read ?? new Map() };
  }
  const standIn: ReadonlyArray<SeasonEpisode> = [
    { airDate: next.airDate, episodeNumber: next.episodeNumber, title: '' },
  ];
  return {
    facts,
    seasons: new Map([...(read ?? []), [next.seasonNumber, standIn]]),
  };
};

const noDateYetOf = (items: ReadonlyArray<WaitingForItem>) => {
  const renewed = items.filter((item) => item.state === 'renewed');
  return {
    listed: renewed.filter((item) => item.listedEpisodes),
    renewed: renewed.filter((item) => !item.listedEpisodes),
  };
};

/**
 * The profile calendar: every dated regular episode of the shows Coming up
 * follows (in progress but not hidden, the watchlist, finished shows that
 * return) from the first of this month for 12 months, and the returning
 * shows without a date. One season read per airing show (cached, shared)
 * and one provider read per show on it (cached, shared).
 */
export const getCalendar = async (
  userId: string,
  country: string | undefined,
  now: number,
): Promise<Calendar> => {
  const window = windowAt(now);
  const [tracked, saved, finished] = await Promise.all([
    readInProgress(userId),
    readWatchlist(userId),
    readWaitingFor(userId, now),
  ]);
  const trackedIds = tracked.map((item) => item.id);
  const [facts, prefs] = await Promise.all([
    getSeriesFacts([...tracked, ...saved].map((item) => item.id)),
    getSeriesPrefsMany(userId, trackedIds),
  ]);

  // Coming up's shows, in its order; a show without facts is left out
  const factsOf = (id: number) => facts.get(id) ?? finished.facts.get(id);
  const hasFacts = (id: number) => factsOf(id) !== undefined;
  const sources = new Map<number, Source>();
  for (const show of followedShows({
    finished: finished.waitingFor.items,
    inProgress: trackedIds.filter(hasFacts),
    prefs,
    watchlist: saved.map((item) => item.id).filter(hasFacts),
  })) {
    const showFacts = factsOf(show.seriesId);
    const finishedAt = show.from === 'finished' && show.item.finishedAt;
    if (showFacts) {
      sources.set(show.seriesId, {
        facts: showFacts,
        onWatchlist: show.from === 'watchlist',
        ...(finishedAt && { finishedAt }),
      });
    }
  }

  const airing = [...sources.values()]
    .map((source) => source.facts)
    .sort(byNearest)
    .flatMap((showFacts) => {
      const numbers = seasonsToRead(showFacts, window);
      return numbers.length > 0 ? [{ facts: showFacts, numbers }] : [];
    });
  // Started in order, so the nearest shows take the capped calls
  const seasonLimit = createLimiter(TMDB_CONCURRENCY);
  const read = await withTmdbCap(MAX_SEASON_CALLS, () =>
    Promise.all(
      airing.map(({ facts: showFacts, numbers }) =>
        seasonLimit(() => readShowSeasons(showFacts, numbers)),
      ),
    ),
  );
  const days = buildDays(read, window);

  // Each show once, by its first date; every ticket's show is a source
  const onCalendar = [
    ...new Set(
      days.flatMap((day) => day.tickets.map((ticket) => ticket.seriesId)),
    ),
  ].flatMap((id) => {
    const source = sources.get(id);
    return source ? [source] : [];
  });
  const providerLimit = createLimiter(TMDB_CONCURRENCY);
  const shows = await withTmdbCap(MAX_PROVIDER_CALLS, () =>
    Promise.all(
      onCalendar.map(({ facts: showFacts, finishedAt, onWatchlist }) =>
        providerLimit(
          async (): Promise<CalendarShow> => ({
            ...(finishedAt && { finishedAt }),
            onWatchlist,
            posterImage: showFacts.posterPath
              ? buildPosterImageUrl(showFacts.posterPath)
              : '',
            provider: await watchProviderOf(
              showFacts.id,
              country,
              'Calendar: provider',
            ),
            seriesId: showFacts.id,
            slug: showFacts.slug,
            title: showFacts.title,
          }),
        ),
      ),
    ),
  );

  return {
    ...window,
    days,
    noDateYet: noDateYetOf(finished.waitingFor.items),
    shows,
  };
};
