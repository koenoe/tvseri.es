import type { Feature, FeatureOfTheDay, TvSeries } from '@tvseri.es/schemas';
import {
  buildStillImageUrl,
  episodeNumbersOf,
  fallThroughOrder,
  featureKindOfDay,
  FEATURE_KINDS as KINDS,
  rotationIndex,
  todayUtc,
} from '@tvseri.es/utils';
import { hasTimeForAnother } from '@/lib/deadline';
import {
  fetchDiscoverTvSeries,
  fetchTvSeriesBase,
  fetchTvSeriesEpisodeStills,
  fetchTvSeriesSeason,
  fetchTvSeriesSeasonPoster,
} from '@/lib/tmdb';
import { mapSettledPartial } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';
import { archiveStanding } from './archive';
import { backdropColorsOf, hasArtwork, withBackdropColor } from './artwork';
import { bingeShowOf, choicesFrom } from './binge';
import { factDeck, runtimeOf } from './facts';
import {
  buildFirstKind,
  type MomentOfDay,
  type Report,
  readMomentOfDay,
} from './momentOfDay';
import { fetchPremieresWithStatus } from './premieres';
import { pickSeasonStills, STILLS_EPISODES_LOOKED_AT } from './stills';

const ARCHIVE_YEARS = 15;
const MAX_STILLS_CANDIDATES = 8;

export type FeatureKind = (typeof KINDS)[number];
type Kind = FeatureKind;

/** Well-known, well-rated shows: the pool for the binge, stills and facts */
const fetchTopPool = async () =>
  (
    await fetchDiscoverTvSeries({
      sort_by: 'vote_average.desc',
      'vote_count.gte': 5000,
    })
  ).items.filter(hasArtwork);

const ARCHIVE_VOTES = 2000;

/**
 * Old and top rated, and not in what's popular right now; plus the all-time
 * top rated list (same vote floor) for "Top 5 all time"
 */
const fetchArchivePool = async (date: string) => {
  const cutoff = new Date(`${date}T00:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - ARCHIVE_YEARS);
  const [old, popular, allTime] = await Promise.all([
    fetchDiscoverTvSeries({
      'first_air_date.lte': todayUtc(cutoff.getTime()),
      sort_by: 'vote_average.desc',
      'vote_count.gte': ARCHIVE_VOTES,
    }),
    fetchDiscoverTvSeries({ sort_by: 'popularity.desc' }),
    fetchDiscoverTvSeries({
      sort_by: 'vote_average.desc',
      'vote_count.gte': ARCHIVE_VOTES,
    }),
  ]);
  const trending = new Set(popular.items.map((series) => series.id));
  return {
    pool: old.items.filter(
      (series) => hasArtwork(series) && !trending.has(series.id),
    ),
    topRated: allTime.items,
  };
};

/** The day's pick and the next shows in the pool, to compare (≤ 4) */
const binge = async (
  date: string,
  report: Report,
): Promise<Feature | undefined> => {
  const pool = await fetchTopPool();
  const picks = choicesFrom(pool, rotationIndex(date, pool.length, 'binge'));
  const [pick] = picks;
  const series = pick && (await fetchTvSeriesBase(pick.id));
  if (!series || series.numberOfEpisodes === 0) {
    return undefined;
  }
  const episodeRuntime = runtimeOf(series);
  const merged = { ...pick, ...series, backdropImage: pick.backdropImage };
  const others = await mapSettledPartial(picks.slice(1), async (other) => {
    const details = await fetchTvSeriesBase(other.id);
    return details
      ? bingeShowOf(
          { ...other, ...details, backdropImage: other.backdropImage },
          runtimeOf(details),
        )
      : undefined;
  });
  report(others.failed);
  const first = bingeShowOf(merged, episodeRuntime);
  return {
    episodeRuntime,
    kind: 'binge',
    numberOfEpisodes: series.numberOfEpisodes,
    series: merged,
    shows: first ? [first, ...others.values] : others.values,
    totalMinutes: series.numberOfEpisodes * episodeRuntime,
  };
};

const archive = async (date: string): Promise<Feature | undefined> => {
  const { pool, topRated } = await fetchArchivePool(date);
  const index = rotationIndex(date, pool.length, 'archive');
  const series = pool[index];
  if (!series) {
    return undefined;
  }
  return {
    allTime: archiveStanding(series, topRated),
    kind: 'archive',
    rank: index + 1,
    series,
    yearsOld:
      Number(date.slice(0, 4)) - Number(series.firstAirDate.slice(0, 4)),
  };
};

const didYouKnow = async (
  date: string,
  report: Report,
): Promise<Feature | undefined> => {
  const pool = await fetchTopPool();
  const picks = choicesFrom(pool, rotationIndex(date, pool.length, 'facts'));
  // The backdrops' colours (the cards' shades) beside the details
  const [colors, details] = await Promise.all([
    backdropColorsOf(picks),
    mapSettledPartial(picks, async (pick) => {
      const series = await fetchTvSeriesBase(pick.id);
      return series ? { pick, series } : undefined;
    }),
  ]);
  report(details.failed);
  const detailed = details.values.map(({ pick, series }) =>
    withBackdropColor(
      { ...series, backdropImage: pick.backdropImage },
      pick.backdropPath,
      colors,
    ),
  );
  if (detailed.length === 0) {
    return undefined;
  }
  return {
    facts: factDeck(detailed),
    kind: 'did-you-know',
  };
};

const stillsFor = async (
  candidate: TvSeries,
  report: Report,
): Promise<Feature | undefined> => {
  const series = await fetchTvSeriesBase(candidate.id);
  // The newest season that has fully aired and has enough episodes
  const target = [...(series?.seasons ?? [])]
    .reverse()
    .find(
      (season) =>
        (season.numberOfEpisodes ?? 0) >= 6 &&
        season.numberOfAiredEpisodes === season.numberOfEpisodes,
    );
  if (!series || !target) {
    return undefined;
  }

  const [details, posterImage, episodes] = await Promise.all([
    fetchTvSeriesSeason(series.id, target.seasonNumber),
    fetchTvSeriesSeasonPoster(series.id, target.seasonNumber),
    mapSettledPartial(
      // The season's real numbers: TMDB numbers some shows on across seasons
      episodeNumbersOf(
        target,
        Math.min(target.numberOfEpisodes ?? 0, STILLS_EPISODES_LOOKED_AT),
      ),
      async (episodeNumber) => ({
        episodeNumber,
        stills: await fetchTvSeriesEpisodeStills(
          series.id,
          target.seasonNumber,
          episodeNumber,
        ),
      }),
    ),
  ]);

  report(episodes.failed);
  const picked = pickSeasonStills(episodes.values);
  if (!picked || !details) {
    // Says in the log why a day has no stills: which seasons fell short
    logWarn(
      `Stills: ${series.title} season ${target.seasonNumber} has too few stills that pass the rule`,
      '',
    );
    return undefined;
  }

  return {
    kind: 'stills',
    season: {
      airDate: details.airDate,
      numberOfEpisodes: details.numberOfEpisodes ?? 0,
      posterImage: posterImage ?? series.posterImage,
      seasonNumber: target.seasonNumber,
    },
    series: { ...series, backdropImage: candidate.backdropImage },
    stills: picked.map(({ episodeNumber, still }) => ({
      episodeNumber,
      image: buildStillImageUrl(still.path, 'w300'),
      title:
        details.episodes.find(
          (episode) => episode.episodeNumber === episodeNumber,
        )?.title ?? '',
    })),
  };
};

/** Tries a few shows from the pool: the first whose season passes the rule */
const stills = async (
  date: string,
  report: Report,
): Promise<Feature | undefined> => {
  const pool = await fetchTopPool();
  const start = rotationIndex(date, pool.length, 'stills');
  for (let i = 0; i < Math.min(MAX_STILLS_CANDIDATES, pool.length); i++) {
    // Out of time: no next show (the answer is partial, kept an hour)
    if (i > 0 && !hasTimeForAnother()) {
      report(1);
      break;
    }
    const candidate = pool[(start + i) % pool.length];
    try {
      const feature = candidate && (await stillsFor(candidate, report));
      if (feature) {
        return feature;
      }
    } catch (error) {
      logWarn('Stills candidate failed, trying the next show', error);
      report(1);
    }
  }
  return undefined;
};

const BUILDERS: Readonly<
  Record<Kind, (date: string, report: Report) => Promise<Feature | undefined>>
> = {
  archive,
  binge,
  'did-you-know': didYouKnow,
  stills,
};

const build = async (
  date: string,
  report: Report,
  only?: Kind,
): Promise<Feature | undefined> => {
  if (!only) {
    const { partial, premieres } = await fetchPremieresWithStatus(date);
    if (partial) {
      report(1);
    }
    if (premieres.countdown.isDue) {
      // the Countdown's shade: each premiere's backdrop colour
      const { items } = premieres.countdown;
      const colors = await backdropColorsOf(items.map((item) => item.series));
      return {
        kind: 'countdown',
        premieres: items.map((item) => ({
          ...item,
          series: withBackdropColor(
            item.series,
            item.series.backdropPath,
            colors,
          ),
        })),
      };
    }
  }

  // The day's pick first, then the next moments in the pool (when it has
  // nothing today: no season passes the stills rule...). `only`: that kind
  // alone (the dev preview)
  const planned = only ?? featureKindOfDay(date);
  return buildFirstKind({
    builders: BUILDERS,
    date,
    order: fallThroughOrder(KINDS, planned).slice(0, only ? 1 : undefined),
    planned,
    report,
    slot: 'feature',
  });
};

/**
 * The feature of the day, a day build (`readMomentOfDay`). `partial` tells
 * the route to keep it out of the CDN; `result` is undefined when there is
 * nothing to show.
 */
export const fetchFeatureOfTheDay = (
  date: string,
  only?: FeatureKind,
): Promise<MomentOfDay<FeatureOfTheDay>> =>
  readMomentOfDay({
    build: async (report) => {
      const feature = await build(date, report, only);
      return feature ? { date, feature } : undefined;
    },
    date,
    only,
    slot: 'feature',
  });
