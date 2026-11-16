import type {
  PersonShow,
  PersonShowCounts,
  PersonShows,
} from '@tvseri.es/schemas';
import { buildPosterImageUrl } from '@tvseri.es/utils';
import slugify from 'slugify';

export type TmdbPersonCredit = Readonly<{
  id: number;
  name?: string;
  poster_path?: string | null;
  first_air_date?: string | null;
  genre_ids?: ReadonlyArray<number>;
  episode_count?: number;
  character?: string;
  job?: string;
  /** How widely seen the show is (Known for's ranking) */
  vote_count?: number;
  popularity?: number;
}>;

/** A person's TV credits (TMDB's `tv_credits`), the fields the person page reads */
export type PersonTvCredits = Readonly<{
  cast?: ReadonlyArray<TmdbPersonCredit>;
  crew?: ReadonlyArray<TmdbPersonCredit>;
}>;

/** What `/tv/:id` tells about a show that has no (past) air date */
export type ShowDetails = Readonly<{
  status?: string;
  first_air_date?: string | null;
}>;

const TALK_GENRE = 10767;
const NEWS_GENRE = 10763;
const UPCOMING_STATUSES = ['Planned', 'In Production', 'Pilot'];

const SELF_CHARACTER = /\b(self|himself|herself|themselves)\b/i;
const VOICE_CHARACTER = /\bvoice\b/i;

const isSelfCredit = (credit: TmdbPersonCredit) => {
  const character = credit.character?.trim() ?? '';
  return character
    ? SELF_CHARACTER.test(character)
    : !!credit.genre_ids?.some(
        (genre) => genre === TALK_GENRE || genre === NEWS_GENRE,
      );
};

// The arrays are filled while grouping; the group itself never changes
type Group = Readonly<{
  cast: TmdbPersonCredit[];
  crew: TmdbPersonCredit[];
  first: TmdbPersonCredit;
}>;

const groupByShow = (credits: PersonTvCredits) => {
  const groups = new Map<number, Group>();
  const add = (credit: TmdbPersonCredit, kind: 'cast' | 'crew') => {
    const group = groups.get(credit.id) ?? {
      cast: [],
      crew: [],
      first: credit,
    };
    group[kind].push(credit);
    groups.set(credit.id, group);
  };
  for (const credit of credits.cast ?? []) add(credit, 'cast');
  for (const credit of credits.crew ?? []) add(credit, 'crew');
  return groups;
};

const unique = (values: ReadonlyArray<string | undefined>) => [
  ...new Set(
    values
      // TMDB writes "Voice of RADA(voice)": a space before a bracket
      .map((value) => value?.trim().replace(/(\S)\(/g, '$1 ('))
      .filter((value): value is string => !!value),
  ),
];

/** The ids of shows that may be upcoming: no air date yet, or in the future */
export const findUndatedOrFuture = (credits: PersonTvCredits, today: string) =>
  [...groupByShow(credits)]
    .filter(([, { first }]) => {
      const date = first.first_air_date;
      return !date || date > today;
    })
    .map(([id]) => id);

/** Per distinct crew job: the most episodes TMDB gives for it (0 if none) */
const toCrewJobs = (crew: ReadonlyArray<TmdbPersonCredit>) => {
  const episodes = new Map<string, number>();
  for (const credit of crew) {
    const job = credit.job?.trim();
    if (job) {
      episodes.set(
        job,
        Math.max(episodes.get(job) ?? 0, credit.episode_count ?? 0),
      );
    }
  }
  return [...episodes].map(([job, episodeCount]) => ({ episodeCount, job }));
};

const toShow = (
  group: Group,
  details: ShowDetails | undefined,
  today: string,
): PersonShow & Readonly<{ isSelf: boolean }> => {
  const { cast, crew, first } = group;
  const firstAirDate =
    first.first_air_date || details?.first_air_date || undefined;
  const characters = unique(cast.map((credit) => credit.character));
  const jobs = unique(crew.map((credit) => credit.job));
  const episodeCount = Math.max(
    0,
    ...[...cast, ...crew].map((credit) => credit.episode_count ?? 0),
  );
  const isSelf =
    cast.length > 0 && crew.length === 0 && cast.every(isSelfCredit);
  const all = [...cast, ...crew];
  const voteCount = Math.max(0, ...all.map((credit) => credit.vote_count ?? 0));
  const popularity = Math.max(
    0,
    ...all.map((credit) => credit.popularity ?? 0),
  );

  const isUpcoming =
    details?.status && UPCOMING_STATUSES.includes(details.status)
      ? true
      : !!firstAirDate && firstAirDate > today;

  return {
    characters,
    ...(crew.length > 0 && { crewJobs: toCrewJobs(crew) }),
    episodeCount,
    ...(firstAirDate && { firstAirDate }),
    id: first.id,
    isCast: cast.length > 0,
    isCrew: crew.length > 0,
    isGuest: cast.length > 0 && !isSelf && episodeCount <= 1,
    isSelf,
    isVoice: characters.some((character) => VOICE_CHARACTER.test(character)),
    jobs,
    name: first.name ?? '',
    popularity,
    posterImage: first.poster_path
      ? buildPosterImageUrl(first.poster_path)
      : '',
    role: characters.length > 0 ? characters.join(' / ') : jobs.join(', '),
    slug: slugify(first.name ?? '', { lower: true, strict: true }),
    voteCount,
    ...(firstAirDate && { year: Number(firstAirDate.slice(0, 4)) }),
    ...(isUpcoming && {
      upcoming:
        firstAirDate && firstAirDate > today
          ? { date: firstAirDate, state: 'dated' as const }
          : { state: 'in-development' as const },
    }),
  };
};

const newestFirst = (a: PersonShow, b: PersonShow) =>
  (b.firstAirDate ?? '').localeCompare(a.firstAirDate ?? '');

/**
 * Cast and crew credits merged per show, "Self" appearances split out, no
 * genre drops. `today` is YYYY-MM-DD; `details` are the `/tv/:id` lookups of
 * `findUndatedOrFuture`.
 */
export const mergePersonShows = (
  credits: PersonTvCredits,
  details: ReadonlyMap<number, ShowDetails>,
  today: string,
): PersonShows => {
  const all = [...groupByShow(credits).values()].map((group) =>
    toShow(group, details.get(group.first.id), today),
  );

  const strip = ({ isSelf: _, ...show }: (typeof all)[number]): PersonShow =>
    show;
  const self = all.filter((show) => show.isSelf).map(strip);
  const own = all.filter((show) => !show.isSelf).map(strip);

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
};
