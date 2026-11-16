import type { User, WatchProvider } from '@tvseri.es/schemas';
import { imgUrlOrEmpty } from './images';

export const USER_ID = 'stub-user-lena';
export const USERNAME = 'lena';

const provider = (
  id: number,
  name: string,
  file: string,
  logoPath: string,
): WatchProvider => ({
  id,
  logo: imgUrlOrEmpty(file),
  logoPath: `/stub/${logoPath}.png`,
  name,
});

/** "Watches on" in the profile sidebar (TMDB provider ids). */
const userProviders = (): WatchProvider[] => [
  provider(8, 'Netflix', 'st_prov_netflix.png', 'netflix'),
  provider(9, 'Prime Video', 'st_prov_prime.png', 'prime-video'),
  provider(531, 'Paramount+', 'st_prov_paramount.png', 'paramount-plus'),
  provider(29, 'Sky Go', 'st_prov_skygo.png', 'sky-go'),
  provider(41, 'ITVX', 'st_prov_itvx.png', 'itvx'),
];

export const buildUser = (username: string = USERNAME): User => ({
  country: 'GB',
  createdAt: '2024-11-08T10:00:00.000Z',
  followerCount: FOLLOWERS,
  followingCount: FOLLOWING,
  id: USER_ID,
  name: 'Nina',
  role: 'user',
  username,
  version: 1,
  watchProviders: userProviders(),
});

/** `GET /user/:id/list/:list/count` ("watched" is the finished shows) */
export const LIST_COUNTS: Readonly<Record<string, number>> = {
  favorites: 31,
  in_progress: 7,
  resuming_soon: 3,
  watched: 218,
  watchlist: 12,
};

export const EPISODES_WATCHED = 5341;
export const FOLLOWERS = 6;
export const FOLLOWING = 8;

/** All-time minutes watched (about 49 minutes an episode) */
export const ALL_TIME_RUNTIME = 261709;
