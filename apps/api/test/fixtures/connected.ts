import { onGet, onTmdb } from '../fakeHttp';

/**
 * A small TMDB world for Connected by: from each start show S, its lead
 * (person S·10) was also in show S+500 (the show in between), whose lead
 * (person (S+500)·10, not in S) was in show S+900, well liked (8.4 from
 * 2,000 voters). S → S+500 → S+900, two steps.
 */

const castMember = (id: number, character: string, order: number) => ({
  id,
  name: `Person ${id}`,
  order,
  profile_path: `/person-${id}.jpg`,
  roles: [{ character, episode_count: 10 }],
  total_episode_count: 10,
});

const credit = (id: number, { voteAverage = 8.4, voteCount = 2000 } = {}) => ({
  character: `Someone in ${id}`,
  episode_count: 10,
  first_air_date: '2015-01-01',
  // a credit without a genre is dropped (`fetchPersonTvCredits`)
  genre_ids: [18],
  id,
  name: `Show ${id}`,
  popularity: 50,
  poster_path: `/p${id}.jpg`,
  vote_average: voteAverage,
  vote_count: voteCount,
});

export const bridgeOf = (start: number) => start + 500;
export const endOf = (start: number) => start + 900;

/** This week's trending list (MDBList), in order */
export const fakeTrending = (ids: ReadonlyArray<number>) =>
  onGet('https://api.mdblist.com/lists/koenoe/trending/items', {
    shows: ids.map((id) => ({ id, mediaType: 'show', title: `Show ${id}` })),
  });

/** One start's two-step path (see above); `linked: false` leaves it without one */
export const fakePathFrom = (start: number, { linked = true } = {}) => {
  const bridge = bridgeOf(start);
  const end = endOf(start);
  onTmdb(`/tv/${start}`, {
    first_air_date: '2020-01-01',
    id: start,
    name: `Show ${start}`,
    poster_path: `/p${start}.jpg`,
  });
  onTmdb(`/tv/${start}/aggregate_credits`, {
    cast: linked ? [castMember(start * 10, `Lead of ${start}`, 0)] : [],
    crew: [],
  });
  onTmdb(`/person/${start * 10}/tv_credits`, {
    cast: [credit(bridge)],
    crew: [],
  });
  onTmdb(`/tv/${bridge}/aggregate_credits`, {
    cast: [
      castMember(bridge * 10, `Lead of ${bridge}`, 0),
      castMember(start * 10, `Guest from ${start}`, 1),
    ],
    crew: [],
  });
  onTmdb(`/person/${bridge * 10}/tv_credits`, {
    cast: [credit(start), credit(bridge), credit(end)],
    crew: [],
  });
  onTmdb(`/tv/${end}/aggregate_credits`, {
    cast: [castMember(bridge * 10, `Hero of ${end}`, 0)],
    crew: [],
  });
};
