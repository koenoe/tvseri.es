import { onMatch } from '../../../apps/api/test/fakeHttp';

/**
 * A synthetic TMDB, MDBList, OMDb and Wikidata for the load rig: every id
 * answers with a plausible, deterministic body built from the id, so the long
 * tail of shows and people exists without fixtures. Nothing here talks to a
 * real service: the rig replaces global `fetch` with the API tests' fake.
 */

const SHOWS = 3000;
const PEOPLE_BASE = 100_000;
const PEOPLE = 6000;

/** A small deterministic hash, for stable "random" shapes per id */
const mix = (value: number) => {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
};

const pad = (value: number) => String(value).padStart(2, '0');

const dateOf = (year: number, month: number, day = 1) =>
  `${year}-${pad(month)}-${pad(day)}`;

const yearOf = (id: number) => 1995 + (mix(id) % 30);

const seasonCountOf = (id: number) => 1 + (mix(id + 1) % 6);

const isReturning = (id: number) => id % 5 === 0;

const GENRES = [
  { id: 18, name: 'Drama' },
  { id: 80, name: 'Crime' },
  { id: 35, name: 'Comedy' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 9648, name: 'Mystery' },
  { id: 99, name: 'Documentary' },
];

const genresOf = (id: number) => [
  GENRES[mix(id) % GENRES.length],
  GENRES[(mix(id) >>> 3) % GENRES.length],
];

/** The cast of a show: 12 people, shared across shows so pages overlap */
export const castOf = (showId: number) =>
  Array.from(
    { length: 12 },
    (_, index) => PEOPLE_BASE + (mix(showId * 31 + index) % PEOPLE),
  );

const showSummary = (id: number) => ({
  backdrop_path: `/b${id}.jpg`,
  first_air_date: dateOf(yearOf(id), 1 + (id % 12)),
  genre_ids: genresOf(id).map((genre) => genre?.id),
  id,
  name: `Series ${id}`,
  origin_country: ['US'],
  original_language: 'en',
  original_name: `Series ${id}`,
  overview: 'A synthetic series for the load rig.',
  popularity: 10_000 / id,
  poster_path: `/p${id}.jpg`,
  vote_average: 6 + (mix(id) % 30) / 10,
  vote_count: 50 + (mix(id) % 5000),
});

const episodesOf = (id: number, season: number) => {
  const year = yearOf(id) + season - 1;
  return Array.from({ length: 8 }, (_, index) => ({
    air_date:
      isReturning(id) && season === seasonCountOf(id) && index > 3
        ? dateOf(2099, 1, 1 + index)
        : dateOf(Math.min(year, 2025), 3, 1 + index * 3),
    episode_number: index + 1,
    id: id * 10_000 + season * 100 + index + 1,
    name: `Episode ${index + 1}`,
    overview: '',
    runtime: 45,
    season_number: season,
    still_path: `/s${id}-${season}-${index + 1}.jpg`,
  }));
};

const seasonsOf = (id: number) =>
  Array.from({ length: seasonCountOf(id) }, (_, index) => ({
    air_date: dateOf(Math.min(yearOf(id) + index, 2025), 3),
    episode_count: 8,
    id: id * 100 + index + 1,
    name: `Season ${index + 1}`,
    poster_path: `/p${id}-${index + 1}.jpg`,
    season_number: index + 1,
  }));

const castCredits = (id: number) => ({
  cast: castOf(id).map((personId, order) => ({
    character: `Role ${order + 1}`,
    id: personId,
    name: `Person ${personId}`,
    order,
    profile_path: `/f${personId}.jpg`,
    roles: [{ character: `Role ${order + 1}`, episode_count: 8 - (order % 8) }],
    total_episode_count: 8 - (order % 8),
  })),
  crew: [],
});

const show = (id: number, appended: string) => {
  const seasons = seasonsOf(id);
  const last = seasons[seasons.length - 1];
  const lastEpisodes = episodesOf(id, last?.season_number ?? 1);
  return {
    ...showSummary(id),
    created_by: [],
    episode_run_time: [45],
    external_ids: { imdb_id: `tt${id}` },
    genres: genresOf(id),
    last_air_date: lastEpisodes[3]?.air_date ?? '',
    last_episode_to_air: { ...lastEpisodes[3] },
    networks: [{ id: 49, logo_path: '/n49.png', name: 'Network' }],
    next_episode_to_air: isReturning(id) ? { ...lastEpisodes[4] } : null,
    number_of_episodes: seasons.length * 8,
    number_of_seasons: seasons.length,
    seasons,
    status: isReturning(id) ? 'Returning Series' : 'Ended',
    type: 'Scripted',
    ...(appended.includes('credits') && { credits: castCredits(id) }),
    ...(appended.includes('images') && { images: images(id) }),
  };
};

const images = (id: number) => ({
  backdrops: [
    {
      aspect_ratio: 1.78,
      file_path: `/b${id}.jpg`,
      height: 1080,
      iso_639_1: null,
      vote_average: 5,
      width: 1920,
    },
  ],
  logos: [
    {
      aspect_ratio: 3,
      file_path: `/l${id}.png`,
      height: 300,
      iso_639_1: 'en',
      vote_average: 5,
      width: 900,
    },
  ],
  posters: [
    {
      aspect_ratio: 0.67,
      file_path: `/p${id}.jpg`,
      height: 1500,
      iso_639_1: 'en',
      vote_average: 5,
      width: 1000,
    },
  ],
});

/** A person's TV credits: 30-90 shows, a few undated or upcoming */
const tvCredits = (personId: number) => {
  const count = 30 + (mix(personId) % 60);
  const credit = (index: number) => {
    const showId = 1 + (mix(personId * 97 + index) % SHOWS);
    const undated = index % 12 === 0;
    return {
      character: index % 9 === 0 ? 'Self' : `Role ${index}`,
      episode_count: 1 + (mix(showId + personId) % 40),
      first_air_date: undated ? null : showSummary(showId).first_air_date,
      genre_ids: genresOf(showId).map((genre) => genre?.id),
      id: showId,
      name: `Series ${showId}`,
      poster_path: `/p${showId}.jpg`,
    };
  };
  return {
    cast: Array.from({ length: count }, (_, index) => credit(index)),
    crew: [],
    id: personId,
  };
};

const person = (id: number) => ({
  adult: false,
  biography: 'A synthetic person for the load rig.',
  birthday: '1970-01-01',
  deathday: null,
  gender: 2,
  id,
  imdb_id: `nm${id}`,
  known_for_department: 'Acting',
  name: `Person ${id}`,
  place_of_birth: 'Somewhere',
  popularity: 1,
  profile_path: `/f${id}.jpg`,
});

const page = (seed: number, size = 20) => ({
  page: 1,
  results: Array.from({ length: size }, (_, index) =>
    showSummary(1 + (mix(seed + index) % SHOWS)),
  ),
  total_pages: 50,
  total_results: 1000,
});

const hashOf = (text: string) =>
  [...text].reduce((hash, char) => mix(hash + char.charCodeAt(0)), 7);

const ok = (body: unknown) => ({ body, status: 200 });
const missing = { body: { status_message: 'Not found' }, status: 404 };

const tmdb = (url: URL) => {
  const path = url.pathname.replace(/^\/3/, '');
  const parts = path.split('/').filter(Boolean);
  const [kind, rawId, sub, ...rest] = parts;
  const id = Number(rawId);
  const appended = url.searchParams.get('append_to_response') ?? '';

  if (kind === 'tv' && Number.isFinite(id)) {
    if (id < 1 || id > SHOWS) {
      return missing;
    }
    if (!sub) return ok(show(id, appended));
    if (sub === 'images') return ok(images(id));
    if (sub === 'season') {
      const season = Number(rest[0]);
      if (rest[1] === 'episode') {
        const episode = episodesOf(id, season)[Number(rest[2]) - 1];
        return episode ? ok({ ...episode, credits: castCredits(id) }) : missing;
      }
      if (season < 1 || season > seasonCountOf(id)) return missing;
      return ok({
        air_date: dateOf(yearOf(id) + season - 1, 3),
        episodes: episodesOf(id, season),
        id: id * 100 + season,
        name: `Season ${season}`,
        poster_path: `/p${id}-${season}.jpg`,
        season_number: season,
      });
    }
    if (sub === 'credits' || sub === 'aggregate_credits') {
      return ok(castCredits(id));
    }
    if (sub === 'recommendations' || sub === 'similar') return ok(page(id, 10));
    if (sub === 'watch') {
      return ok({
        results: {
          US: {
            flatrate: [
              {
                display_priority: 1,
                logo_path: '/w8.png',
                provider_id: 8,
                provider_name: 'Streamer',
              },
            ],
          },
        },
      });
    }
    if (sub === 'content_ratings') {
      return ok({ results: [{ iso_3166_1: 'US', rating: 'TV-14' }] });
    }
    if (sub === 'keywords') return ok({ results: [{ id: 1, name: 'twist' }] });
    return missing;
  }

  if (kind === 'person' && Number.isFinite(id)) {
    if (id < PEOPLE_BASE || id >= PEOPLE_BASE + PEOPLE) return missing;
    if (!sub) return ok(person(id));
    if (sub === 'tv_credits') return ok(tvCredits(id));
    if (sub === 'external_ids') return ok({ id, imdb_id: `nm${id}` });
    return missing;
  }

  if (kind === 'discover') return ok(page(hashOf(url.search)));
  if (kind === 'genre') return ok({ genres: GENRES });
  if (kind === 'search') return ok({ ...page(hashOf(url.search), 5) });
  if (kind === 'network') {
    return ok({
      id,
      logo_path: '/n.png',
      name: 'Network',
      origin_country: 'US',
    });
  }
  if (kind === 'keyword') return ok({ id, name: 'keyword' });
  if (kind === 'configuration') return ok([]);
  if (kind === 'watch') return ok({ results: [] });
  return missing;
};

const mdblist = (url: URL) => {
  if (url.pathname.startsWith('/lists/')) {
    return ok({
      movies: [],
      shows: Array.from({ length: 20 }, (_, index) => ({
        id: 1 + index * 7,
        mediatype: 'show',
        title: `Series ${1 + index * 7}`,
      })),
    });
  }
  const id = Number(url.pathname.split('/').pop());
  return ok({
    ids: { imdb: `tt${id}`, tmdb: id },
    ratings: [{ popular: 1, score: 80, source: 'imdb', value: 8, votes: 1000 }],
  });
};

/** Registers the synthetic upstream on the API tests' fake HTTP */
export const installSyntheticUpstream = () => {
  onMatch((url) => url.host === 'api.themoviedb.org', tmdb);
  onMatch((url) => url.host === 'api.mdblist.com', mdblist);
  onMatch(
    (url) => url.host === 'www.omdbapi.com',
    (url) =>
      url.searchParams.has('Season')
        ? ok({
            Episodes: Array.from({ length: 8 }, (_, index) => ({
              Episode: String(index + 1),
              imdbRating: '8.0',
            })),
            Response: 'True',
          })
        : ok({ imdbRating: '8.1', imdbVotes: '12,345', Response: 'True' }),
  );
  onMatch(
    (url) => url.host === 'query.wikidata.org',
    () => ok({ results: { bindings: [] } }),
  );
};

export const SHOW_COUNT = SHOWS;
