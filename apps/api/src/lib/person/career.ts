import type {
  PersonCareer,
  PersonCareerRow,
  PersonCareerWeight,
  PersonShow,
  PersonShows,
} from '@tvseri.es/schemas';

/** What `/tv/:id` tells about the span of a show */
export type CareerShowDetails = Readonly<{
  first_air_date?: string | null;
  last_air_date?: string | null;
  status?: string;
  seasons?: ReadonlyArray<
    Readonly<{
      season_number?: number;
      air_date?: string | null;
      episode_count?: number;
    }>
  >;
}>;

const RUNNING_STATUSES = ['Returning Series', 'In Production', 'Pilot'];

const toWeight = (episodeCount: number): PersonCareerWeight =>
  episodeCount <= 5 ? 1 : episodeCount <= 20 ? 2 : 3;

/** The shows that become chart rows: series, not guest roles */
export const careerSeries = (shows: PersonShows) =>
  shows.shows.filter((show) => !show.isGuest);

/**
 * The years a show aired: each season's air year (a November or December
 * premiere runs into the next year), the start and end year, and every year
 * up to `endYear` after the last season of a running show. `undefined` when
 * TMDB lists no season to go by.
 */
const toYears = (
  details: CareerShowDetails | undefined,
  startYear: number,
  endYear: number,
  ongoing: boolean,
): ReadonlyArray<number> | undefined => {
  const aired = (details?.seasons ?? []).filter(
    (season) =>
      (season.season_number ?? 0) > 0 &&
      !!season.air_date &&
      (season.episode_count ?? 0) > 0,
  );
  if (aired.length === 0) {
    return undefined;
  }
  const years = new Set([startYear]);
  for (const { air_date } of aired) {
    const year = Number(air_date?.slice(0, 4));
    if (!year) {
      continue;
    }
    years.add(year);
    if (Number(air_date?.slice(5, 7)) >= 11) {
      years.add(year + 1);
    }
  }
  if (ongoing) {
    for (let year = Math.max(...years); year < endYear; year++) {
      years.add(year);
    }
  }
  years.add(endYear);
  return [...years]
    .filter((year) => year >= startYear && year <= endYear)
    .sort((a, b) => a - b);
};

const toRow = (
  show: PersonShow,
  details: CareerShowDetails | undefined,
  thisYear: number,
): PersonCareerRow | undefined => {
  const startYear = show.year ?? Number(details?.first_air_date?.slice(0, 4));
  if (!startYear) {
    return undefined;
  }
  const ongoing =
    !!details?.status && RUNNING_STATUSES.includes(details.status);
  const lastYear = details?.last_air_date
    ? Number(details.last_air_date.slice(0, 4))
    : startYear;

  const endYear = Math.max(
    startYear,
    ongoing ? Math.max(lastYear, thisYear) : lastYear,
  );
  const years = toYears(details, startYear, endYear, ongoing);

  return {
    endYear,
    episodeCount: show.episodeCount,
    id: show.id,
    name: show.name,
    ongoing,
    role: show.role,
    slug: show.slug,
    startYear,
    weight: toWeight(show.episodeCount),
    ...(years && { years }),
  };
};

export const buildCareer = (
  shows: PersonShows,
  details: ReadonlyMap<number, CareerShowDetails>,
  thisYear: number,
): PersonCareer => {
  const rows = careerSeries(shows)
    .map((show) => toRow(show, details.get(show.id), thisYear))
    .filter((row): row is PersonCareerRow => !!row)
    .sort(
      (a, b) => a.startYear - b.startYear || b.episodeCount - a.episodeCount,
    );

  const ticks = shows.shows
    .filter((show) => show.isGuest && show.year)
    .map((show) => ({
      id: show.id,
      name: show.name,
      year: show.year as number,
    }))
    .sort((a, b) => a.year - b.year);

  return {
    guest: {
      count: ticks.length,
      ...(ticks.length > 0 && {
        firstYear: ticks[0]?.year,
        lastYear: ticks[ticks.length - 1]?.year,
      }),
      ticks,
    },
    rows,
    upcoming: shows.upcoming.map((show) => ({
      episodeCount: show.episodeCount,
      id: show.id,
      name: show.name,
      role: show.role,
      slug: show.slug,
      state: show.upcoming?.state ?? 'in-development',
      ...(show.upcoming?.date && { date: show.upcoming.date }),
    })),
  };
};
