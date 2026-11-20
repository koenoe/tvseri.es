import { CATCHING_UP_MIN } from '@tvseri.es/constants';
import type {
  AlmostDoneItem,
  CatchingUpItem,
  ComingUpItem,
  OutNowItem,
  Overview,
  PausedItem,
  PremiereRunway,
  UpNextItem,
  WaitingFor,
  WaitingForItem,
} from '@tvseri.es/schemas';
import {
  buildPosterImageUrl,
  DAY_MS,
  daysBetweenUtc,
  episodeMinutes,
  isOver,
  isSeasonPremiere,
  minutesFor,
  resolveSeasonMinutes,
  todayUtc,
} from '@tvseri.es/utils';
import { episodeKindOf, seasonBounds } from '@/lib/episodeKind';
import { codeOf, type EpisodeRef, type ShowState } from './analyze';

const PAUSED_AFTER = 90 * DAY_MS;
const ALMOST_DONE_MAX = 2;
/** How long an aired episode or season is Out now */
const OUT_NOW_DAYS = 14;
const WINDOW_DAYS = 30;

/** A finished show back within Coming up's window: a ticket, not a Later row */
export const returnsSoon = (
  item: WaitingForItem,
): item is WaitingForItem & { nextDate: string; daysToGo: number } =>
  item.state === 'dated' &&
  Boolean(item.nextDate) &&
  item.daysToGo !== undefined &&
  item.daysToGo <= WINDOW_DAYS;

/**
 * Whether a followed show's next date (`YYYY-MM-DD`) is past the window:
 * Coming up has no ticket for it, the calendar has the day. Not capped at
 * the calendar's twelve months: a date that far out is rare, and the
 * calendar then says nothing is dated yet.
 */
export const datedLater = (
  dates: ReadonlyArray<string | undefined>,
  now: number,
) =>
  dates.some(
    (date) =>
      date !== undefined &&
      date !== '' &&
      daysBetweenUtc(todayUtc(now), date) > WINDOW_DAYS,
  );

/** The waiting shows without the returns that became tickets, so no show is in both */
export const waitingForLater = (waiting: WaitingFor): WaitingFor => ({
  ...waiting,
  items: waiting.items.filter((item) => !returnsSoon(item)),
});

const poster = (state: ShowState) =>
  state.facts.posterPath ? buildPosterImageUrl(state.facts.posterPath) : '';

const identity = (state: ShowState) => ({
  posterImage: poster(state),
  seriesId: state.facts.id,
  slug: state.facts.slug,
  title: state.facts.title,
});

const seasonTotal = (state: ShowState, season: number) =>
  state.facts.seasons.find((candidate) => candidate.seasonNumber === season)
    ?.episodeCount ?? 0;

/** "3 of 15": the regular episodes watched in a season, of its episode count */
export const seasonProgress = (state: ShowState, season: number) => ({
  seasonTotal: seasonTotal(state, season),
  seasonWatched: state.watchedPerSeason.get(season) ?? 0,
});

const seasonUnwatched = (state: ShowState, season: number) =>
  state.unwatched.filter((episode) => episode.season === season);

const seasonToWatch = (state: ShowState, season: number) =>
  seasonUnwatched(state, season).length;

/** Minutes these episodes take: their own runtimes summed (`minutesFor`) */
const minutesOf = (state: ShowState, episodes: ReadonlyArray<EpisodeRef>) =>
  minutesFor(episodes, state.runtimes, state.facts.episodeRuntime);

/** One episode's minutes, null when unknown */
const minutesOfOne = (state: ShowState, episode: EpisodeRef) =>
  episodeMinutes(state.runtimes, episode, state.facts.episodeRuntime);

/**
 * Whether a show last active at `activeSince` (`activeSinceOf`) is stale
 * enough to ask about: Paused's 3 months. The overview also reads a list
 * item's place (its last watch) by it, so only stale shows are looked at.
 */
export const isStale = (activeSince: number, now: number) =>
  now - activeSince > PAUSED_AFTER;

/** A show Hide was chosen for leaves the overview blocks while it stays In progress */
const isHidden = (state: ShowState) => state.paused === 'hide';

const byRecent = (a: ShowState, b: ShowState) =>
  (b.lastWatchedAt ?? 0) - (a.lastWatchedAt ?? 0);

export const buildUpNext = (states: ReadonlyArray<ShowState>): UpNextItem[] =>
  states
    .filter((state) => state.nextUp && !isHidden(state))
    .sort(byRecent)
    .map((state) => {
      const next = state.nextUp as EpisodeRef;
      const toWatch = seasonToWatch(state, next.season);
      const progress = seasonProgress(state, next.season);
      const total = progress.seasonTotal;
      const bounds = seasonBounds(state.facts.seasons, next.season);
      const upcoming = state.facts.nextEpisodeToAir;
      const seasonFinale =
        next.episode === bounds.last && state.airedInFull.has(next.season);
      // The latest aired regular episode (TMDB's latest can be a special)
      const latest = state.progress.aired.at(-1);

      return {
        ...identity(state),
        code: codeOf(next),
        episode: next.episode,
        ...(bounds.first === 1 ? {} : { firstEpisodeNumber: bounds.first }),
        isLatest:
          latest?.seasonNumber === next.season &&
          latest.episodeNumber === next.episode,
        lastWatchedAt: state.lastWatchedAt,
        lastWatchedCode: state.lastWatched ? codeOf(state.lastWatched) : null,
        nextSeasonTba: seasonFinale && !upcoming && !isOver(state.facts.status),
        nextToAir: upcoming?.airDate
          ? {
              airDate: upcoming.airDate,
              episode: upcoming.episodeNumber,
              season: upcoming.seasonNumber,
            }
          : null,
        runtime: minutesOfOne(state, next),
        season: next.season,
        seasonFinale,
        seasonRuntimes: resolveSeasonMinutes(
          state.runtimes,
          next.season,
          total,
          state.facts.episodeRuntime,
          bounds.first,
        ),
        ...progress,
        // Done: the season's aired episodes, watched or skipped
        seasonDone:
          state.progress.seasons.find(
            (counts) => counts.seasonNumber === next.season,
          )?.done ?? 0,
        timeLeftMinutes: minutesOf(state, seasonUnwatched(state, next.season)),
        toWatch,
      };
    });

export const buildAlmostDone = (
  states: ReadonlyArray<ShowState>,
): Overview['almostDone'] => {
  const candidates = states
    .filter((state) => state.nextUp && !isHidden(state))
    .map((state) => {
      const season = (state.nextUp as EpisodeRef).season;
      return {
        // Only a season that has fully aired is close to its end
        done: state.airedInFull.has(season),
        season,
        state,
        toGo: seasonToWatch(state, season),
      };
    })
    .sort((a, b) => a.toGo - b.toGo || byRecent(a.state, b.state));

  const items: AlmostDoneItem[] = candidates
    .filter(({ done, toGo }) => done && toGo >= 1 && toGo <= ALMOST_DONE_MAX)
    .map(({ season, state, toGo }) => {
      const left = seasonUnwatched(state, season);
      const { first } = seasonBounds(state.facts.seasons, season);
      return {
        ...identity(state),
        code: codeOf(state.nextUp as EpisodeRef),
        ...(first === 1 ? {} : { firstEpisodeNumber: first }),
        season,
        seasonTotal: seasonTotal(state, season),
        timeLeftMinutes: minutesOf(state, left),
        toGo,
        unwatchedEpisodes: left.map((episode) => episode.episode),
      };
    });

  // The same rule as the items: a season still airing has no finish in sight
  const closest = candidates.find(
    ({ done, toGo }) => done && toGo > ALMOST_DONE_MAX,
  );
  return {
    closest:
      items.length === 0 && closest
        ? {
            seriesId: closest.state.facts.id,
            title: closest.state.facts.title,
            toGo: closest.toGo,
          }
        : null,
    items,
  };
};

/** Out now: the latest episode aired within the last 14 days */
const isOutNow = (latest: NonNullable<ShowState['latest']>, now: number) =>
  now - Date.parse(latest.airDate) <= OUT_NOW_DAYS * DAY_MS;

/**
 * The season that finished airing within the last 14 days and has 3+
 * unwatched episodes: its last episode is the latest to air.
 */
const completeSeason = (state: ShowState, now: number) => {
  const latest = state.latest;
  if (!latest || !state.airedInFull.has(latest.season)) {
    return null;
  }
  const isLast =
    latest.episode === seasonBounds(state.facts.seasons, latest.season).last;
  return isLast &&
    isOutNow(latest, now) &&
    seasonToWatch(state, latest.season) >= CATCHING_UP_MIN
    ? latest
    : null;
};

export const buildOutNow = (
  states: ReadonlyArray<ShowState>,
  now: number,
): OutNowItem[] => {
  const rows: OutNowItem[] = [];

  for (const state of states) {
    if (isHidden(state) || !state.latest) continue;
    const { latest } = state;
    const done = completeSeason(state, now);

    if (done) {
      rows.push({
        ...identity(state),
        airDate: done.airDate,
        episodes: seasonToWatch(state, done.season),
        kind: 'season-complete',
        runtimeMinutes: minutesOf(state, seasonUnwatched(state, done.season)),
        season: done.season,
      });
      continue;
    }

    const waiting = state.unwatched.length;
    const latestIsWaiting = state.unwatched.some(
      (episode) =>
        episode.season === latest.season && episode.episode === latest.episode,
    );
    if (
      waiting > 0 &&
      waiting < CATCHING_UP_MIN &&
      latestIsWaiting &&
      isOutNow(latest, now)
    ) {
      rows.push({
        ...identity(state),
        airDate: latest.airDate,
        code: codeOf(latest),
        episode: latest.episode,
        kind: 'episode',
        runtimeMinutes: minutesOfOne(state, latest),
        season: latest.season,
      });
    }
  }

  return rows.sort((a, b) => b.airDate.localeCompare(a.airDate));
};

const runwayOf = (state: ShowState, now: number): PremiereRunway | null => {
  const next = state.facts.nextEpisodeToAir;
  if (next?.airDate && isSeasonPremiere(next, state.facts.seasons)) {
    const daysToGo = daysBetweenUtc(todayUtc(now), next.airDate);
    if (daysToGo >= 0 && daysToGo <= WINDOW_DAYS) {
      return {
        date: next.airDate,
        daysToGo,
        season: next.seasonNumber,
        state: 'upcoming',
      };
    }
  }

  const waitingSeason = (state.nextUp as EpisodeRef).season;
  const premiered = state.facts.seasons.find(
    (season) =>
      season.seasonNumber > waitingSeason &&
      season.airDate &&
      (state.aired[season.seasonNumber] ?? 0) > 0 &&
      now - Date.parse(season.airDate) <= WINDOW_DAYS * DAY_MS,
  );
  return premiered
    ? {
        date: premiered.airDate,
        daysToGo: 0,
        season: premiered.seasonNumber,
        state: 'out',
      }
    : null;
};

export const buildCatchingUp = (
  states: ReadonlyArray<ShowState>,
  now: number,
): CatchingUpItem[] =>
  states
    .filter(
      (state) =>
        !isHidden(state) &&
        state.nextUp &&
        state.unwatched.length >= CATCHING_UP_MIN &&
        !completeSeason(state, now),
    )
    .sort((a, b) => b.unwatched.length - a.unwatched.length || byRecent(a, b))
    .map((state) => ({
      ...identity(state),
      episodeRuntimes: state.unwatched
        .slice(0, 8)
        .map((episode) => minutesOfOne(state, episode) ?? 0),
      episodes: state.unwatched.slice(0, 8).map(codeOf),
      nextUp: codeOf(state.nextUp as EpisodeRef),
      runtime: state.facts.episodeRuntime,
      runtimeMinutes: minutesOf(state, state.unwatched),
      runway: runwayOf(state, now),
      waiting: state.unwatched.length,
    }));

type TicketSource = Readonly<{ state: ShowState; onWatchlist: boolean }>;

/**
 * An episode ticket's release from the facts, no TMDB call: an episode of
 * the season aired on another day, so the season comes out one by one
 */
const episodeRelease = (
  facts: ShowState['facts'],
  next: NonNullable<ShowState['facts']['nextEpisodeToAir']>,
): ComingUpItem['release'] => {
  const last = facts.lastEpisodeToAir;
  return last?.seasonNumber === next.seasonNumber &&
    last.airDate &&
    last.airDate !== next.airDate
    ? 'weekly'
    : null;
};

/**
 * Tickets for the next 30 days from the shows' next episode to air; an
 * episode's release from the facts, a premiere's and the provider later
 */
export const buildComingUp = (
  sources: ReadonlyArray<TicketSource>,
  now: number,
): ComingUpItem[] => {
  const seen = new Set<number>();
  const tickets: ComingUpItem[] = [];

  for (const { onWatchlist, state } of sources) {
    const next = state.facts.nextEpisodeToAir;
    if (isHidden(state) || seen.has(state.facts.id) || !next?.airDate) continue;
    const daysToGo = daysBetweenUtc(todayUtc(now), next.airDate);
    if (daysToGo < 0 || daysToGo > WINDOW_DAYS) continue;
    seen.add(state.facts.id);

    const kind = episodeKindOf(next, state.facts.seasons);
    tickets.push({
      ...identity(state),
      date: next.airDate,
      daysToGo,
      episode: next.episodeNumber,
      kind,
      onWatchlist,
      provider: null,
      release: kind === 'episode' ? episodeRelease(state.facts, next) : null,
      season: next.seasonNumber,
    });
  }

  return tickets.sort((a, b) => a.date.localeCompare(b.date));
};

/** Air dates (`YYYY-MM-DD`) of shows' next episodes, by series id, read from their seasons */
export type NextAirDates = ReadonlyMap<number, string>;

const NO_DATES: NextAirDates = new Map();

/** The next episode is the latest to air, so its date is in the facts */
const nextIsLatest = (state: ShowState) =>
  state.nextUp !== null &&
  state.latest?.season === state.nextUp.season &&
  state.latest.episode === state.nextUp.episode;

/**
 * When the next episode to watch came out, when known: a season's premiere
 * and the latest episode are in the facts; any other episode's date only
 * from its season (`nextAirDates`)
 */
const nextAiredAt = (state: ShowState, nextAirDates: NextAirDates) => {
  const next = state.nextUp;
  if (!next) return Number.NaN;
  const nextAt = { episodeNumber: next.episode, seasonNumber: next.season };
  const date = isSeasonPremiere(nextAt, state.facts.seasons)
    ? state.facts.seasons.find(
        (candidate) => candidate.seasonNumber === next.season,
      )?.airDate
    : nextIsLatest(state)
      ? state.latest?.airDate
      : nextAirDates.get(state.facts.id);
  return date ? Date.parse(date) : Number.NaN;
};

/**
 * When the show last had your attention: the last watch, or the next
 * episode coming out after it (a new season, or the season back from a
 * break: waiting for it is not pausing). Its date unknown, the last watch
 * counts.
 */
const activeSinceOf = (
  state: ShowState,
  lastWatchedAt: number,
  nextAirDates: NextAirDates,
) => {
  const aired = nextAiredAt(state, nextAirDates);
  return Number.isNaN(aired) ? lastWatchedAt : Math.max(lastWatchedAt, aired);
};

/**
 * Whether Paused may ask about the show: never once hidden; Keep asks again
 * only once the show was watched after Keep and went stale again
 */
const mayAsk = (
  state: Pick<ShowState, 'lastWatchedAt' | 'paused' | 'pausedAt'>,
) =>
  state.paused !== 'hide' &&
  (state.paused !== 'keep' ||
    (state.pausedAt ?? 0) < (state.lastWatchedAt ?? 0));

/**
 * Whether reading the next episode's air date (its season, cached) can take
 * the show out of Paused: stale by what the facts know, the next episode's
 * date not in them, and something aired within the 3 months (else no
 * next episode can be recent).
 */
export const needsNextAirDate = (state: ShowState, now: number) => {
  if (state.lastWatchedAt === null || !state.nextUp || !mayAsk(state)) {
    return false;
  }
  if (!isStale(activeSinceOf(state, state.lastWatchedAt, NO_DATES), now)) {
    return false;
  }
  const next = state.nextUp;
  const nextAt = { episodeNumber: next.episode, seasonNumber: next.season };
  if (isSeasonPremiere(nextAt, state.facts.seasons) || nextIsLatest(state)) {
    return false;
  }
  const latest = state.latest?.airDate ?? state.facts.lastEpisodeToAir?.airDate;
  return latest !== undefined && !isStale(Date.parse(latest), now);
};

export const buildPaused = (
  states: ReadonlyArray<ShowState>,
  now: number,
  nextAirDates: NextAirDates = NO_DATES,
): PausedItem[] =>
  states
    .filter((state) => {
      if (state.lastWatchedAt === null || !state.lastWatched) return false;
      const activeSince = activeSinceOf(
        state,
        state.lastWatchedAt,
        nextAirDates,
      );
      if (!isStale(activeSince, now)) return false;
      return mayAsk(state);
    })
    .sort(byRecent)
    .map((state) => ({
      ...identity(state),
      lastWatchedAt: state.lastWatchedAt as number,
      lastWatchedCode: codeOf(state.lastWatched as EpisodeRef),
    }));
