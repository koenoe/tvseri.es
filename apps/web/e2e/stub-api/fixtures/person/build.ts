import type {
  Movie,
  Person,
  PersonAward,
  PersonAwardGroup,
  PersonAwards,
  PersonCareer,
  PersonCareerRow,
  PersonCareerWeight,
  PersonCollaborators,
  PersonFamilyAndAwards,
  PersonLinks,
  PersonShow,
  PersonShowCounts,
  PersonShows,
  PersonWatched,
  PersonWatchedItem,
  TvSeries,
} from '@tvseri.es/schemas';

/**
 * Builders for the person fixtures. They mirror the API (`apps/api/src/lib/
 * person/*.ts`, `lib/wikidata/person.ts`): shows newest first, `upcoming`
 * group, `self` split, filter counts, career rows oldest start first with a
 * weight by episode count, guest ticks, awards groups most wins first. The
 * data files only list credits; everything derived comes from here.
 */

const POSTER = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2';
export const PROFILE = 'https://image.tmdb.org/t/p/w600_and_h900_bestv2';

/** Everything a person route answers; one per fixture person. */
export type StubPerson = Readonly<{
  person: Person;
  knownFor: ReadonlyArray<TvSeries | Movie>;
  links: PersonLinks;
  shows: PersonShows;
  career: PersonCareer;
  collaborators: PersonCollaborators;
  familyAndAwards: PersonFamilyAndAwards;
  watched: PersonWatched;
}>;

/** What `slugify(name, { lower: true, strict: true })` makes of a title. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

/** One show the person is credited in (cast and crew merged, as TMDB's). */
export type Credit = Readonly<{
  id: number;
  name: string;
  /** First air year; the date is January 1st of it unless `date` says */
  year?: number;
  /** A precise first air date, where the order needs one */
  date?: string;
  /** Cast: the characters; empty for crew only */
  characters?: ReadonlyArray<string>;
  /** Crew: the jobs, with the episodes TMDB gives for each (0 when none) */
  crew?: ReadonlyArray<Readonly<{ job: string; episodeCount: number }>>;
  /** Episodes credited in (the most of his credits for the show) */
  episodes: number;
  /** TMDB poster path, e.g. `/abc.jpg`; empty when not known */
  poster?: string;
  /** Announced work: `in-development`, or a YYYY-MM-DD premiere date */
  upcoming?: 'in-development' | string;
}>;

const VOICE = /\bvoice\b/i;

const toShow = (credit: Credit): PersonShow => {
  const characters = credit.characters ?? [];
  const crew = credit.crew ?? [];
  const jobs = crew.map((entry) => entry.job);
  const isCast = characters.length > 0;
  const isSelf =
    isCast && characters.every((c) => /\b(self|himself)\b/i.test(c));
  const firstAirDate =
    credit.upcoming && credit.upcoming !== 'in-development'
      ? credit.upcoming
      : (credit.date ?? (credit.year ? `${credit.year}-01-01` : undefined));
  return {
    characters,
    ...(crew.length > 0 && {
      crewJobs: crew.map(({ episodeCount, job }) => ({ episodeCount, job })),
    }),
    episodeCount: credit.episodes,
    ...(firstAirDate && { firstAirDate }),
    id: credit.id,
    isCast,
    isCrew: jobs.length > 0,
    isGuest: isCast && !isSelf && credit.episodes <= 1,
    isVoice: characters.some((c) => VOICE.test(c)),
    jobs,
    name: credit.name,
    posterImage: credit.poster ? `${POSTER}${credit.poster}` : '',
    role: characters.length > 0 ? characters.join(' / ') : jobs.join(', '),
    slug: slug(credit.name),
    ...(firstAirDate && { year: Number(firstAirDate.slice(0, 4)) }),
    ...(credit.upcoming && {
      upcoming:
        credit.upcoming === 'in-development'
          ? { state: 'in-development' as const }
          : { date: credit.upcoming, state: 'dated' as const },
    }),
  };
};

const isSelfShow = (show: PersonShow) =>
  show.isCast &&
  !show.isCrew &&
  show.characters.every((c) => /\b(self|himself)\b/i.test(c));

const newestFirst = (a: PersonShow, b: PersonShow) =>
  (b.firstAirDate ?? '').localeCompare(a.firstAirDate ?? '');

export function buildShows(credits: ReadonlyArray<Credit>): PersonShows {
  const all = credits.map(toShow);
  const self = all.filter(isSelfShow);
  const own = all.filter((show) => !isSelfShow(show));
  const upcoming = own
    .filter((show) => show.upcoming)
    .sort((a, b) =>
      a.upcoming?.state === b.upcoming?.state
        ? (a.firstAirDate ?? '').localeCompare(b.firstAirDate ?? '')
        : a.upcoming?.state === 'dated'
          ? -1
          : 1,
    );
  const shows = own
    .filter((show) => !show.upcoming)
    .sort((a, b) =>
      !a.firstAirDate && b.firstAirDate
        ? 1
        : a.firstAirDate && !b.firstAirDate
          ? -1
          : newestFirst(a, b),
    );
  const counts: PersonShowCounts = {
    acting: own.filter((show) => show.isCast).length,
    all: own.length,
    behindTheCamera: own.filter((show) => show.isCrew).length,
    guest: own.filter((show) => show.isGuest).length,
    self: self.length,
    upcoming: upcoming.length,
    voice: own.filter((show) => show.isVoice).length,
  };
  return { counts, self: self.sort(newestFirst), shows, upcoming };
}

/** The last year a show in the Career chart aired (`ongoing`: runs to today). */
export type ChartSpan = Readonly<{
  id: number;
  endYear: number;
  ongoing?: boolean;
  /** Years it aired when not every year from start to end; sorted */
  years?: ReadonlyArray<number>;
}>;

const toWeight = (episodes: number): PersonCareerWeight =>
  episodes <= 5 ? 1 : episodes <= 20 ? 2 : 3;

export function buildCareer(
  shows: PersonShows,
  spans: ReadonlyArray<ChartSpan>,
): PersonCareer {
  const rows = spans
    .flatMap((span): PersonCareerRow[] => {
      const show = shows.shows.find((candidate) => candidate.id === span.id);
      if (!show?.year) {
        return [];
      }
      const years =
        span.years ??
        Array.from(
          { length: span.endYear - show.year + 1 },
          (_, index) => (show.year ?? 0) + index,
        );
      return [
        {
          endYear: span.endYear,
          episodeCount: show.episodeCount,
          id: show.id,
          name: show.name,
          ongoing: span.ongoing ?? false,
          role: show.role,
          slug: show.slug,
          startYear: show.year,
          weight: toWeight(show.episodeCount),
          years,
        },
      ];
    })
    .sort(
      (a, b) => a.startYear - b.startYear || b.episodeCount - a.episodeCount,
    );

  // A one-episode show that has a bar in the chart is not a tick as well
  const charted = new Set(spans.map((span) => span.id));
  const ticks = shows.shows
    .flatMap((show) =>
      show.isGuest && show.year && !charted.has(show.id)
        ? [{ id: show.id, name: show.name, year: show.year }]
        : [],
    )
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
}

/** `episodesWatched` of `episodeCount`; `watched` when the show is finished. */
export type Progress = Readonly<{ seriesId: number; watched: number }>;

export function buildWatched(
  shows: PersonShows,
  progress: ReadonlyArray<Progress>,
): PersonWatched {
  const items = progress
    .flatMap((entry): PersonWatchedItem[] => {
      const show = shows.shows.find((c) => c.id === entry.seriesId);
      if (!show) {
        return [];
      }
      return [
        {
          episodeCount: show.episodeCount,
          episodesWatched: entry.watched,
          seriesId: show.id,
          state: entry.watched >= show.episodeCount ? 'watched' : 'in-progress',
        },
      ];
    })
    .sort((a, b) => b.episodesWatched - a.episodesWatched);
  return {
    episodes: items.reduce((sum, item) => sum + item.episodesWatched, 0),
    items,
    shows: items.length,
    totalShows: shows.counts.all,
  };
}

/** One award, with the group it counts under. */
export type AwardSpec = Readonly<{
  group: string;
  /** Wikidata labels, cycled over the group's items */
  awards: ReadonlyArray<string>;
  works: ReadonlyArray<string>;
  wins: number;
  /** wins + nominations */
  total: number;
  /** Year of the group's first item; later ones step back */
  lastYear: number;
}>;

export function buildAwards(items: ReadonlyArray<PersonAward>): PersonAwards {
  const all = [...items].sort(
    (a, b) =>
      Number(b.won) - Number(a.won) ||
      (b.year ?? 0) - (a.year ?? 0) ||
      a.award.localeCompare(b.award),
  );
  const groups = new Map<string, { wins: number; nominations: number }>();
  for (const item of all) {
    const group = groups.get(item.group) ?? { nominations: 0, wins: 0 };
    group[item.won ? 'wins' : 'nominations']++;
    groups.set(item.group, group);
  }
  const wins = all.filter((item) => item.won).length;
  return {
    groups: [...groups]
      .map(([name, counts]): PersonAwardGroup => ({ name, ...counts }))
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.nominations - a.nominations ||
          a.name.localeCompare(b.name),
      ),
    items: all,
    nominations: all.length - wins,
    total: all.length,
    wins,
  };
}

/** Expands specs into items: wins first within a group, years stepping back. */
export function awardItems(
  specs: ReadonlyArray<AwardSpec>,
): ReadonlyArray<PersonAward> {
  return specs.flatMap((spec) =>
    Array.from(
      { length: spec.total },
      (_, index): PersonAward => ({
        award: spec.awards[index % spec.awards.length] ?? spec.group,
        group: spec.group,
        won: index < spec.wins,
        work: spec.works[index % spec.works.length],
        year: spec.lastYear - ((index * 5) % 14),
      }),
    ),
  );
}

type ShowSeed = Readonly<{
  id: number;
  title: string;
  year: number;
  poster?: string;
  popularity?: number;
  /** TMDB's vote count: Known for ranks by it */
  voteCount?: number;
  /** Films only: YYYY-MM-DD */
  releaseDate?: string;
}>;

/** A list-shaped show for Known for (the fields the tiles use). */
export function knownForSeries(seed: ShowSeed): TvSeries {
  return {
    backdropColor: '#1c2223',
    countries: [],
    createdBy: [],
    description: '',
    firstAirDate: `${seed.year}-01-01`,
    genres: [],
    hasAired: true,
    id: seed.id,
    isAdult: false,
    languages: [{ code: 'en', englishName: 'English', name: 'English' }],
    lastAirDate: '',
    numberOfAiredEpisodes: 0,
    numberOfEpisodes: 0,
    numberOfSeasons: 0,
    originalLanguage: 'en',
    originalTitle: seed.title,
    popularity: seed.popularity ?? 0,
    posterImage: seed.poster ? `${POSTER}${seed.poster}` : '',
    posterPath: seed.poster ?? '',
    releaseYear: String(seed.year),
    slug: slug(seed.title),
    status: 'Ended',
    tagline: '',
    title: seed.title,
    type: 'Scripted',
    voteAverage: 0,
    voteCount: seed.voteCount ?? 0,
  };
}

/** A film: no `firstAirDate`, which is how the web tells it from a series. */
export function knownForMovie(seed: ShowSeed): Movie {
  return {
    backdropColor: '#1c2223',
    countries: [],
    description: '',
    genres: [],
    id: seed.id,
    isAdult: false,
    languages: [{ code: 'en', englishName: 'English', name: 'English' }],
    originalLanguage: 'en',
    originalTitle: seed.title,
    popularity: seed.popularity ?? 0,
    posterImage: seed.poster ? `${POSTER}${seed.poster}` : '',
    posterPath: seed.poster ?? '',
    ...(seed.releaseDate && { releaseDate: seed.releaseDate }),
    slug: slug(seed.title),
    tagline: '',
    title: seed.title,
    voteAverage: 0,
    voteCount: seed.voteCount ?? 0,
  };
}
