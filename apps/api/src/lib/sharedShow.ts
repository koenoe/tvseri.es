import type { SeriesFacts, SharedShowNext } from '@tvseri.es/schemas';
import { DAY_MS, isSeasonPremiere, todayUtc } from '@tvseri.es/utils';
import { seasonBounds } from '@/lib/episodeKind';
import { analyzeShow } from '@/lib/overview/analyze';

/** "S02 out now": the season finished airing at most this many days ago (as Out now) */
const SEASON_OUT_DAYS = 14;

const NO_PREFS = { paused: null, pausedAt: null, skipped: [] } as const;

/**
 * What comes next for a shared show, from its facts alone (nobody's
 * episodes): the next date both of you are waiting for ("You both watch").
 */
export const sharedShowNext = (
  facts: SeriesFacts,
  now: number,
): SharedShowNext | null => {
  const { aired, latest, progress } = analyzeShow(
    { facts, prefs: NO_PREFS, watched: [] },
    now,
  );
  // The latest season with a regular episode aired (the aired rule)
  const current = progress.aired.at(-1)?.seasonNumber ?? 0;
  const today = todayUtc(now);

  // Not aired yet: an episode on today's date still counts as upcoming
  const next = facts.nextEpisodeToAir;
  const upcoming = next?.airDate && next.airDate >= today ? next : null;

  const premiere =
    upcoming &&
    isSeasonPremiere(upcoming, facts.seasons) &&
    upcoming.seasonNumber > current
      ? { date: upcoming.airDate, season: upcoming.seasonNumber }
      : facts.seasons
          .filter(
            (season) =>
              season.seasonNumber > current &&
              season.airDate !== '' &&
              season.airDate >= today,
          )
          .sort((a, b) => a.seasonNumber - b.seasonNumber)
          .map((season) => ({
            date: season.airDate,
            season: season.seasonNumber,
          }))
          .at(0);

  const season = facts.seasons.find(
    (candidate) => candidate.seasonNumber === current,
  );
  const seasonOut =
    latest &&
    season &&
    (aired[current] ?? 0) >= season.episodeCount &&
    latest.episode === seasonBounds(facts.seasons, current).last &&
    now - Date.parse(latest.airDate) <= SEASON_OUT_DAYS * DAY_MS;

  return premiere
    ? { kind: 'season-premiere', ...premiere }
    : upcoming
      ? {
          date: upcoming.airDate,
          episode: upcoming.episodeNumber,
          kind: 'episode',
          season: upcoming.seasonNumber,
        }
      : seasonOut
        ? { kind: 'season-out', season: current }
        : null;
};
