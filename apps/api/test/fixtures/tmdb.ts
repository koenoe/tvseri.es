import { onTmdb } from '../fakeHttp';

type FakeSeason = Readonly<{
  /** Episode count */
  episodes: number;
  /** First air date (YYYY-MM-DD); episodes air a week apart */
  airDate: string;
  /** Episodes after this many haven't aired yet */
  aired?: number;
  runtime?: number;
  /** Per-episode runtimes (index = episode − 1), else `runtime` for all */
  runtimes?: ReadonlyArray<number>;
}>;

type FakeShow = Readonly<{
  id: number;
  name?: string;
  status?: string;
  /** Season 1, 2... (index + 1); a season 0 of specials with `specials` */
  seasons: ReadonlyArray<FakeSeason>;
  specials?: FakeSeason;
  extra?: Record<string, unknown>;
}>;

const addDays = (date: string, days: number) =>
  new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

const episodesOf = (showId: number, seasonNumber: number, season: FakeSeason) =>
  Array.from({ length: season.episodes }, (_, index) => ({
    air_date:
      index < (season.aired ?? season.episodes)
        ? addDays(season.airDate, index * 7)
        : addDays('2099-01-01', index),
    episode_number: index + 1,
    id: showId * 10_000 + seasonNumber * 100 + index + 1,
    name: `Episode ${index + 1}`,
    overview: '',
    runtime: season.runtimes?.[index] ?? season.runtime ?? 30,
    season_number: seasonNumber,
    still_path: `/still-${seasonNumber}-${index + 1}.jpg`,
  }));

/**
 * Registers a show on the fake TMDB: /tv/:id, every season and episode.
 * Returns the raw TMDB series object.
 */
export const fakeShow = ({
  extra,
  id,
  name = `Show ${id}`,
  seasons,
  specials,
  status = 'Ended',
}: FakeShow) => {
  const all = [
    ...(specials ? [[0, specials] as const] : []),
    ...seasons.map((season, index) => [index + 1, season] as const),
  ];
  const lastAired = [...seasons.entries()]
    .reverse()
    .find(([, season]) => (season.aired ?? season.episodes) > 0);
  const series = {
    // The API always appends external_ids to /tv/:id
    external_ids: { imdb_id: null },
    first_air_date: seasons[0]?.airDate,
    genres: [{ id: 18, name: 'Drama' }],
    id,
    last_episode_to_air: lastAired
      ? {
          air_date: addDays(
            lastAired[1].airDate,
            ((lastAired[1].aired ?? lastAired[1].episodes) - 1) * 7,
          ),
          episode_number: lastAired[1].aired ?? lastAired[1].episodes,
          id: 1,
          name: 'Last',
          season_number: lastAired[0] + 1,
        }
      : null,
    name,
    next_episode_to_air: null,
    number_of_episodes: seasons.reduce(
      (sum, season) => sum + season.episodes,
      0,
    ),
    number_of_seasons: seasons.length,
    poster_path: `/poster-${id}.jpg`,
    seasons: all.map(([seasonNumber, season]) => ({
      air_date: season.airDate,
      episode_count: season.episodes,
      id: id * 100 + seasonNumber,
      name: seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`,
      overview: '',
      season_number: seasonNumber,
    })),
    status,
    ...extra,
  };
  // `append_to_response=season/N` answers each season under its own key
  onTmdb(`/tv/${id}`, {
    ...series,
    ...Object.fromEntries(
      all.map(([seasonNumber, season]) => [
        `season/${seasonNumber}`,
        { episodes: episodesOf(id, seasonNumber, season) },
      ]),
    ),
  });
  for (const [seasonNumber, season] of all) {
    const episodes = episodesOf(id, seasonNumber, season);
    onTmdb(`/tv/${id}/season/${seasonNumber}`, {
      air_date: season.airDate,
      episodes,
      id: id * 100 + seasonNumber,
      name: `Season ${seasonNumber}`,
      overview: '',
      season_number: seasonNumber,
    });
    for (const episode of episodes) {
      onTmdb(
        `/tv/${id}/season/${seasonNumber}/episode/${episode.episode_number}`,
        episode,
      );
    }
  }
  return series;
};
