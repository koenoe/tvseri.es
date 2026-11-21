import type {
  Premiere,
  PremiereKind,
  Premieres,
  TvSeries,
} from '@tvseri.es/schemas';
import { addDaysUtc, daysBetweenUtc, todayUtc } from '@tvseri.es/utils';
import { getShow } from '@/lib/catalogue';
import { readDayBuild } from '@/lib/db/cache/readThroughDay';
import { episodeKindOf } from '@/lib/episodeKind';
import { fetchTvSeriesSeason } from '@/lib/tmdb/seasons';
import { mapSettledPartial } from '@/utils/limit';
import { withTitleTreatment } from './artwork';
import { discoverWindow } from './discoverWindow';
import { logFallThrough } from './fallThrough';

const WINDOW_DAYS = 60;
const MAX_DETAILS = 30;
const MAX_ITEMS = 20;
const COUNTDOWN_DAYS = 3;

/**
 * "Big": a new series or a season premiere of a show with this much pull.
 * TMDB popularity is a rolling score (the top shows sit in the hundreds),
 * vote count is lifetime attention, which suits returning shows.
 */
const BIG_PREMIERE = Object.freeze({ popularity: 150, voteCount: 3000 });

const isBig = (kind: PremiereKind, series: TvSeries) =>
  (kind === 'new-series' || kind === 'season-premiere') &&
  (series.popularity >= BIG_PREMIERE.popularity ||
    series.voteCount >= BIG_PREMIERE.voteCount);

/** Every episode on one day is a binge drop; spread over days is weekly */
const releasePattern = async (
  seriesId: number,
  seasonNumber: number,
): Promise<Premiere['release']> => {
  const season = await fetchTvSeriesSeason(seriesId, seasonNumber);
  const dates = new Set(
    (season?.episodes ?? [])
      .map((episode) => episode.airDate.slice(0, 10))
      .filter(Boolean),
  );
  if ((season?.episodes.length ?? 0) < 2 || dates.size === 0) {
    return null;
  }
  return dates.size === 1 ? 'full-season' : 'weekly';
};

/**
 * Premieres are drawn on their backdrop (the row's tickets, the Countdown's
 * card), so one without it is left out. `skippedCountdown` names a big
 * premiere close enough for the Countdown that was left out for it: the
 * feature slot then falls through to the day's feature.
 */
export const withArtwork = (
  items: ReadonlyArray<Premiere>,
): Readonly<{ items: Premiere[]; skippedCountdown: string | null }> => {
  const skipped = items.find(
    (item) =>
      !item.series.backdropImage &&
      item.isBig &&
      item.daysAway <= COUNTDOWN_DAYS,
  );
  return {
    items: items.filter((item) => !!item.series.backdropImage),
    skippedCountdown: skipped?.series.title ?? null,
  };
};

type Draft = Readonly<{
  date: string;
  kind: PremiereKind;
  seasonNumber: number;
  series: TvSeries;
}>;

const compute = async (
  today: string,
): Promise<Readonly<{ failed: number; premieres: Premieres }>> => {
  const end = addDaysUtc(today, WINDOW_DAYS);

  // Two pages of returning shows are enough to find the big premieres
  const discovered = await discoverWindow({
    airingPages: 2,
    end,
    start: today,
  });
  let failed = discovered.failed;

  // Returning shows: the next episode says whether it is a season premiere,
  // a finale or a special
  const returning = discovered.airing.slice(0, MAX_DETAILS);
  const details = await mapSettledPartial(returning, async (item) => {
    const series = await getShow(item.id);
    const next = series?.nextEpisodeToAir;
    if (!series || !next?.airDate) {
      return undefined;
    }
    const date = next.airDate.slice(0, 10);
    if (date < today || date > end) {
      return undefined;
    }
    const seasonKind = episodeKindOf(
      next,
      (series.seasons ?? []).map((season) => ({
        episodeCount: season.numberOfEpisodes ?? 0,
        firstEpisodeNumber: season.firstEpisodeNumber,
        seasonNumber: season.seasonNumber,
      })),
    );
    const kind: PremiereKind | undefined =
      next.seasonNumber === 0
        ? 'special'
        : seasonKind === 'episode'
          ? undefined
          : seasonKind;
    return kind
      ? ({ date, kind, seasonNumber: next.seasonNumber, series } as Draft)
      : undefined;
  });

  failed += details.failed;
  const drafts = [...discovered.newSeries, ...details.values]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_ITEMS);

  // The logo and the release pattern for what's left; both are optional
  const enriched = await mapSettledPartial(drafts, async (draft) => {
    const [series, release] = await Promise.all([
      withTitleTreatment(draft.series),
      draft.kind === 'new-series' || draft.kind === 'season-premiere'
        ? releasePattern(draft.series.id, draft.seasonNumber).catch(() => null)
        : null,
    ]);
    return {
      date: draft.date,
      daysAway: daysBetweenUtc(today, draft.date),
      isBig: isBig(draft.kind, series),
      kind: draft.kind,
      release,
      seasonNumber: draft.seasonNumber,
      series,
    } satisfies Premiere;
  });
  failed += enriched.failed;
  const { items, skippedCountdown } = withArtwork(enriched.values);
  items.sort((a, b) => a.date.localeCompare(b.date));
  if (skippedCountdown) {
    logFallThrough('feature', {
      date: today,
      planned: 'countdown',
      used: 'the day’s feature',
      why: [`countdown: ${skippedCountdown} has no artwork`],
    });
  }

  const big = items.filter((item) => item.isBig).slice(0, 3);
  return {
    failed,
    premieres: {
      countdown: {
        isDue: (big[0]?.daysAway ?? Number.POSITIVE_INFINITY) <= COUNTDOWN_DAYS,
        items: big,
      },
      date: today,
      items,
    },
  };
};

type Cached = Readonly<{ partial: boolean; premieres: Premieres }>;

/**
 * Computed on read, then cached for the day (Cache table, 24 h; 1 h when some
 * lookups failed, so a partial list is replaced soon). `partial` says whether
 * the list is incomplete, so the route can keep it out of the CDN for long.
 */
export const fetchPremieresWithStatus = (today = todayUtc()): Promise<Cached> =>
  // A day build: yesterday's list stands in while today's is built or when
  // it can't be (served as partial: short-cached)
  readDayBuild<Cached>({
    day: today,
    key: (day) => `premieres:v4:${day}`,
    load: async () => {
      const { failed, premieres } = await compute(today);
      return { partial: failed > 0, premieres };
    },
  });
