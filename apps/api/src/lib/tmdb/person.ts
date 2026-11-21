import type {
  Movie,
  Person,
  TmdbPerson,
  TmdbPersonTvCredits,
  TvSeries,
} from '@tvseri.es/schemas';
import { buildProfileImageUrl, toSlug } from '@tvseri.es/utils';
import { readThroughStale } from '@/lib/db/cache/readThroughStale';
import {
  PERSON_FRESH,
  PERSON_KEEP,
  REFRESH_CLAIM_SECONDS,
  UNKNOWN_PERSON_FRESH,
} from '@/lib/person/lifetime';
import type { TmdbPersonExternalIds } from '@/lib/person/links';
import type { PersonTvCredits } from '@/lib/person/shows';
import { tmdbFetch } from '@/lib/tmdb/client';
import {
  GLOBAL_GENRES_TO_IGNORE,
  normalizeMovie,
  normalizeTvSeries,
} from '@/lib/tmdb/helpers';
import calculateAge from '@/utils/calculateAge';

export async function searchPerson(query: string) {
  const response = await tmdbFetch('/3/search/person', {
    query: { query },
  });

  return (response?.results ?? []).map((person) => {
    return {
      id: person.id,
      image: person.profile_path
        ? buildProfileImageUrl(person.profile_path)
        : '',
      isAdult: person.adult,
      knownFor: (person.known_for ?? []).map((item): TvSeries | Movie =>
        item.media_type === 'tv'
          ? normalizeTvSeries(item)
          : normalizeMovie(item),
      ),
      knownForDepartment: person.known_for_department,
      name: person.name ?? '',
      popularity: person.popularity ?? 0,
      slug: toSlug(person.name as string),
    };
  });
}

const TMDB_GENDERS: Readonly<Record<number, NonNullable<Person['gender']>>> = {
  1: 'female',
  2: 'male',
  3: 'non-binary',
};

// A person's details are read by several routes of the person page, each in
// its own Lambda: one stored copy (lifetime: lib/person/lifetime.ts)

export async function fetchPerson(id: number) {
  const person = await readThroughStale<TmdbPerson | null>(
    `tmdb-person:v2:${id}`,
    (found) => (found ? PERSON_FRESH : UNKNOWN_PERSON_FRESH),
    PERSON_KEEP,
    async () => (await tmdbFetch(`/3/person/${id}`)) ?? null,
    { singleFlightSeconds: REFRESH_CLAIM_SECONDS },
  );

  if (!person) {
    return undefined;
  }

  const gender =
    typeof person.gender === 'number' ? TMDB_GENDERS[person.gender] : undefined;

  return {
    age: person.birthday
      ? calculateAge(
          person.birthday,
          person.deathday as (typeof person)['birthday'],
        )
      : undefined,
    biography: person.biography,
    birthdate: person.birthday,
    deathdate: person.deathday,
    ...(gender && { gender }),
    id: person.id,
    image: person.profile_path ? buildProfileImageUrl(person.profile_path) : '',
    imdbId: person.imdb_id,
    isAdult: person.adult,
    knownForDepartment: person.known_for_department,
    name: person.name ?? '',
    numberOfEpisodes:
      'total_episode_count' in person ? person.total_episode_count : 0,
    placeOfBirth: person.place_of_birth,
    slug: toSlug(person.name as string),
  } as Person;
}

export async function fetchPersonKnownFor(
  person: Person,
): Promise<ReadonlyArray<TvSeries | Movie>> {
  const results = await searchPerson(person.name);
  return results[0]?.knownFor.filter((item) => !!item.posterImage) ?? [];
}

/**
 * `/person/:id/tv_credits` as TMDB answers it: the person page, Go deeper,
 * Connected by and the created-shows lookup each shape it their own way
 */
export const fetchRawPersonTvCredits = (id: number) =>
  tmdbFetch(`/3/person/${id}/tv_credits`);

export async function fetchPersonTvCredits(id: number) {
  const credits = await fetchRawPersonTvCredits(id);

  if (!credits) {
    return undefined;
  }

  const sortAndGroup = (
    results: TmdbPersonTvCredits['cast'] | TmdbPersonTvCredits['crew'] = [],
  ) => {
    const currentDate = new Date();
    const uniqueResults = [
      ...new Map(results.map((item) => [item.id, item])).values(),
    ];
    const normalizedResults = uniqueResults
      .filter(
        (series) =>
          series.poster_path &&
          series.genre_ids &&
          series.genre_ids.length > 0 &&
          !series.genre_ids.some((genre) =>
            GLOBAL_GENRES_TO_IGNORE.includes(genre),
          ),
      )
      .sort((a, b) => {
        if (!a.first_air_date && !b.first_air_date) return 0;
        if (!a.first_air_date) return -1;
        if (!b.first_air_date) return 1;

        const dateA = new Date(a.first_air_date);
        const dateB = new Date(b.first_air_date);
        return dateB.getTime() - dateA.getTime();
      })
      .map((series) => normalizeTvSeries(series));

    const upcoming = normalizedResults.filter((series) => {
      if (!series.firstAirDate) return true;
      return new Date(series.firstAirDate) > currentDate;
    });
    const previous = normalizedResults.filter((series) => {
      if (!series.firstAirDate) return false;
      return new Date(series.firstAirDate) <= currentDate;
    });

    return { previous, upcoming };
  };

  const cast = sortAndGroup(credits.cast);
  const crew = sortAndGroup(credits.crew);

  return { cast, crew };
}

export async function fetchPersonExternalIds(
  id: number,
): Promise<TmdbPersonExternalIds | undefined> {
  return tmdbFetch(`/3/person/${id}/external_ids`);
}

/**
 * A person's TV credits as `/person/:id/tv_credits` gives them, trimmed to
 * what the person page reads (lib/person/load.ts caches them per person);
 * undefined for a person TMDB doesn't know.
 */
export async function fetchPersonCredits(
  id: number,
): Promise<PersonTvCredits | undefined> {
  const credits: PersonTvCredits | undefined =
    await fetchRawPersonTvCredits(id);
  if (!credits) {
    return undefined;
  }
  const trim = (list: PersonTvCredits['cast']) =>
    (list ?? []).map((credit) => ({
      character: credit.character,
      episode_count: credit.episode_count,
      first_air_date: credit.first_air_date,
      genre_ids: credit.genre_ids,
      id: credit.id,
      job: credit.job,
      name: credit.name,
      popularity: credit.popularity,
      poster_path: credit.poster_path,
      vote_count: credit.vote_count,
    }));
  return { cast: trim(credits.cast), crew: trim(credits.crew) };
}
