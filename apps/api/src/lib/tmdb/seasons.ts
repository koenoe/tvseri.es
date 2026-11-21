import type {
  Episode,
  EpisodePerson,
  EpisodeStill,
  EpisodeWithCredits,
  Season,
  SeriesRuntimes,
  TmdbTvSeriesSeason,
} from '@tvseri.es/schemas';
import {
  buildPosterImageUrl,
  buildProfileImageUrl,
  chunk,
  hasAiredAt,
} from '@tvseri.es/utils';
import { hasFilePath, tmdbFetch } from '@/lib/tmdb/client';
import { normalizeTvSeriesEpisode } from '@/lib/tmdb/helpers';
import { fetchRawTvSeries } from '@/lib/tmdb/series';

export async function fetchTvSeriesSeason(
  id: number,
  season: number,
): Promise<Season | undefined> {
  const response = await tmdbFetch(`/3/tv/${id}/season/${season}`);

  return response ? toSeason(response) : undefined;
}

/** TMDB answers at most 20 appended sub-requests per call. */
const APPEND_LIMIT = 20;

/** A show with up to 20 of its seasons appended (`season/N`) */
const fetchWithSeasons = (id: number, numbers: ReadonlyArray<number>) =>
  tmdbFetch(`/3/tv/${id}`, {
    append: numbers.map((number) => `season/${number}` as const),
  });

/**
 * Several seasons of a show with their episodes (as `fetchTvSeriesSeason`),
 * in one `/tv/:id` call per 20 seasons (`append_to_response=season/N,…`).
 * A season TMDB doesn't list is absent; undefined for an unknown show.
 */
export async function fetchTvSeriesSeasons(
  id: number,
  seasonNumbers: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, Season> | undefined> {
  const chunks = chunk([...new Set(seasonNumbers)], APPEND_LIMIT);
  const pages = await Promise.all(
    chunks.map((numbers) => fetchWithSeasons(id, numbers)),
  );
  if (pages.some((page) => !page)) {
    return undefined;
  }
  const seasons = new Map<number, Season>();
  for (const [index, numbers] of chunks.entries()) {
    for (const number of numbers) {
      const season = pages[index]?.[`season/${number}`];
      if (season) {
        seasons.set(
          number,
          toSeason({
            ...season,
            season_number: season.season_number ?? number,
          }),
        );
      }
    }
  }
  return seasons;
}

const toSeason = (response: TmdbTvSeriesSeason): Season => {
  const episodes = (response?.episodes ?? []).map((episode) =>
    normalizeTvSeriesEpisode(episode),
  );
  const numberOfEpisodes = episodes.length;
  const numberOfAiredEpisodes =
    episodes.filter((episode) => episode.hasAired).length ?? numberOfEpisodes;

  let airDate = '';
  if (response.air_date) {
    airDate = new Date(response.air_date).toISOString();
  } else {
    // No season air_date: the earliest aired episode's date
    const airedEpisodesWithDates = episodes.filter(
      (episode) => episode.hasAired && episode.airDate,
    );
    if (airedEpisodesWithDates.length > 0) {
      const earliestEpisode = airedEpisodesWithDates.reduce(
        (earliest, current) =>
          new Date(current.airDate) < new Date(earliest.airDate)
            ? current
            : earliest,
      );
      airDate = earliestEpisode.airDate;
    }
  }

  return {
    airDate,
    description: response.overview ?? '',
    episodes,
    hasAired: hasAiredAt(airDate, Date.now()),
    id: response.id,
    numberOfAiredEpisodes,
    numberOfEpisodes,
    seasonNumber: response.season_number,
    title: response.name as string,
  };
};

/**
 * Every regular season's episode runtimes in minutes (0 where TMDB has
 * none), by season number, index = episode number − 1: the show page's time
 * left and runtime range. One `/tv/:id` call per 20 seasons
 * (`append_to_response=season/1,…`) instead of a request per season.
 * Specials (season 0) are left out. Undefined for an unknown show.
 */
export async function fetchTvSeriesRuntimes(
  id: number,
  /** The regular season numbers when the caller knows them (no details call) */
  seasonNumbers?: ReadonlyArray<number>,
): Promise<SeriesRuntimes | undefined> {
  let numbers = seasonNumbers?.filter((number) => number > 0);
  if (!numbers) {
    const series = await fetchRawTvSeries(id);
    if (!series) {
      return undefined;
    }
    numbers = (series.seasons ?? [])
      .map((season) => season.season_number)
      .filter((number) => number > 0);
  }
  const all = numbers;
  const chunks = chunk(all, APPEND_LIMIT);
  const pages = await Promise.all(
    chunks.map((seasonNumbers) => fetchWithSeasons(id, seasonNumbers)),
  );
  const runtimes: Record<number, number[]> = {};
  for (const [index, seasonNumbers] of chunks.entries()) {
    for (const number of seasonNumbers) {
      const episodes = pages[index]?.[`season/${number}`]?.episodes ?? [];
      const length = Math.max(
        0,
        ...episodes.map((episode) => episode.episode_number),
      );
      const minutes = Array.from({ length }, () => 0);
      for (const episode of episodes) {
        if (episode.episode_number > 0) {
          minutes[episode.episode_number - 1] = episode.runtime ?? 0;
        }
      }
      runtimes[number] = minutes;
    }
  }
  return runtimes;
}

type TmdbEpisodePerson = Readonly<{
  character?: string;
  id: number;
  job?: string;
  name?: string;
  profile_path?: string | null;
}>;

const normalizeEpisodePeople = (
  people: ReadonlyArray<TmdbEpisodePerson> | undefined,
): ReadonlyArray<EpisodePerson> =>
  (people ?? []).map((person) => ({
    character: person.character ?? '',
    id: person.id,
    image: person.profile_path
      ? buildProfileImageUrl(person.profile_path, 'w138_and_h175_face')
      : '',
    job: person.job ?? '',
    name: person.name ?? '',
  }));

/** A season's poster (the season details carry it; the Season type doesn't) */
export async function fetchTvSeriesSeasonPoster(
  id: number,
  season: number,
): Promise<string | undefined> {
  const response = await tmdbFetch(`/3/tv/${id}/season/${season}`);

  return response?.poster_path
    ? buildPosterImageUrl(response.poster_path)
    : undefined;
}

/** The stills (episode images) TMDB has for one episode, with size and votes */
export async function fetchTvSeriesEpisodeStills(
  id: number,
  season: number,
  episode: number,
): Promise<ReadonlyArray<EpisodeStill>> {
  const response = await tmdbFetch(
    `/3/tv/${id}/season/${season}/episode/${episode}/images`,
  );

  return (response?.stills ?? []).filter(hasFilePath).map((still) => ({
    aspectRatio: still.aspect_ratio,
    height: still.height,
    path: still.file_path,
    voteAverage: still.vote_average,
    voteCount: still.vote_count,
    width: still.width,
  }));
}

export async function fetchTvSeriesEpisode(
  id: number,
  season: number,
  episode: number,
): Promise<Episode | undefined> {
  const response = await tmdbFetch(
    `/3/tv/${id}/season/${season}/episode/${episode}`,
  );

  return response ? normalizeTvSeriesEpisode(response) : undefined;
}

/** The episode plus its guest stars and crew, in the same TMDB call */
export async function fetchTvSeriesEpisodeWithCredits(
  id: number,
  season: number,
  episode: number,
): Promise<EpisodeWithCredits | undefined> {
  const response = await tmdbFetch(
    `/3/tv/${id}/season/${season}/episode/${episode}`,
    { append: ['credits'] },
  );

  if (!response) {
    return undefined;
  }

  return {
    ...normalizeTvSeriesEpisode(response),
    credits: {
      crew: normalizeEpisodePeople(response.credits?.crew),
      guestStars: normalizeEpisodePeople(
        response.credits?.guest_stars ?? response.guest_stars,
      ),
    },
  };
}
