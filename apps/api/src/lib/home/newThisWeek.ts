import type {
  NewRelease,
  NewReleaseKind,
  NewThisWeek,
  SeriesFacts,
  TvSeries,
} from '@tvseri.es/schemas';
import { leadFirst } from '@tvseri.es/utils';
import { readDayBuild } from '@/lib/db/cache/readThroughDay';
import { getSeriesFactsReport } from '@/lib/seriesFacts';
import { fetchGenresForTvSeries } from '@/lib/tmdb';
import { mapSettledPartial } from '@/utils/limit';
import { addDaysUtc, todayUtc } from '@/utils/time';
import { withTitleTreatment } from './artwork';
import { discoverWindow } from './discoverWindow';
import { withGenreNames } from './pickItems';

/**
 * The week: today and the 7 UTC days before it, so a premiere on the same
 * weekday last week still counts; nothing after today
 */
const WINDOW_DAYS = 7;
const MAX_ITEMS = 12;
/** Returning shows looked at for a season premiere: discover's first page */
const MAX_DETAILS = 20;

type Week = Readonly<{ end: string; start: string }>;

const weekUpTo = (today: string): Week => ({
  end: today,
  start: addDaysUtc(today, -WINDOW_DAYS),
});

const inWeek = (date: string, week: Week) =>
  date !== '' && date >= week.start && date <= week.end;

/**
 * The season of a show that premiered in the week (its first episode's
 * date, TMDB's season `air_date`), the latest when two did; undefined
 * for a show mid-season or between seasons
 */
const seasonPremiereIn = (
  facts: Pick<SeriesFacts, 'seasons'>,
  week: Week,
): Readonly<{ date: string; seasonNumber: number }> | undefined => {
  const season = facts.seasons
    .filter((entry) => inWeek(entry.airDate.slice(0, 10), week))
    .sort((a, b) => b.seasonNumber - a.seasonNumber)[0];
  return season
    ? { date: season.airDate.slice(0, 10), seasonNumber: season.seasonNumber }
    : undefined;
};

type Draft = Readonly<{
  date: string;
  kind: NewReleaseKind;
  seasonNumber: number;
  series: TvSeries;
}>;

/** The row draws a poster for every item */
const hasPoster = (series: TvSeries) => !!series.posterImage;

const compute = async (
  today: string,
): Promise<Readonly<{ failed: number; items: NewRelease[] }>> => {
  const week = weekUpTo(today);

  // Discover names genres by id only; the list is stored a month and needs
  // nothing below, so it loads alongside discover and the facts
  const genresRead = fetchGenresForTvSeries().then(
    (genres) => ({ failed: 0, genres }),
    () => ({ failed: 1, genres: [] }),
  );

  // Premieres' reads with the window turned backwards: new series, and the
  // shows with an episode in the week (some of them started a season)
  const discovered = await discoverWindow({ ...week, airingPages: 1 });
  let failed = discovered.failed;
  const newSeries: Draft[] = discovered.newSeries.filter((draft) =>
    hasPoster(draft.series),
  );

  // Which season a returning show is on comes from the shared series facts
  // (stored a day per show, so other builds and views pay for them too)
  const returning = discovered.airing.filter(hasPoster).slice(0, MAX_DETAILS);
  const report = await getSeriesFactsReport(
    returning.map((series) => series.id),
  );
  failed += report.failed.size;
  const seasons: Draft[] = returning.flatMap((series) => {
    const facts = report.facts.get(series.id);
    const premiere = facts && seasonPremiereIn(facts, week);
    return premiere
      ? [
          {
            ...premiere,
            kind: premiere.seasonNumber === 1 ? 'new-series' : 'new-season',
            series,
          },
        ]
      : [];
  });

  const drafts = [...newSeries, ...seasons]
    .sort((a, b) => b.series.popularity - a.series.popularity)
    .slice(0, MAX_ITEMS);

  const { genres, failed: genresFailed } = await genresRead;
  failed += genresFailed;
  // The logo is optional: without one the lead writes the title
  const enriched = await mapSettledPartial(drafts, async (draft) => ({
    ...draft,
    series: withGenreNames(await withTitleTreatment(draft.series), genres),
  }));
  failed += enriched.failed;

  const items = enriched.values.map(
    (draft, index): NewRelease => ({ ...draft, rank: index + 1 }),
  );
  return { failed, items: [...leadFirst(items)] };
};

type Cached = Readonly<{ partial: boolean; result: NewThisWeek }>;

/**
 * Built on read once a day (Cache table, 24 h; 1 h when a lookup failed, so
 * a partial list is replaced soon), as a day build: yesterday's list stands
 * in while today's is built or when it can't be (TMDB down), served as
 * partial so the CDN keeps it briefly.
 */
export const fetchNewThisWeekWithStatus = (
  today = todayUtc(),
): Promise<Cached> =>
  readDayBuild<Cached>({
    day: today,
    key: (day) => `new-this-week:v1:${day}`,
    load: async () => {
      const { failed, items } = await compute(today);
      return { partial: failed > 0, result: { date: today, items } };
    },
  });
