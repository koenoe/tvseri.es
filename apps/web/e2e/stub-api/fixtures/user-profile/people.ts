import type { User, WatchProvider } from '@tvseri.es/schemas';

import { img } from './shows.ts';

/**
 * The profile fixtures' people. `alex`, `nina`, `rae` and `sam` are the
 * auth stub's viewers (same ids as `fixtures/show/store.ts`, so one session
 * works for both); `juno` and the circle are
 * profiles you can visit. All invented, emails at example.com.
 *
 * - `alex`: the owner's page: every block filled.
 * - `nina`: a brand-new account: Get started, every block empty.
 * - `juno`: someone alex follows, with a Super match.
 * - `wren`, `ivo`, `noor`: alex's circle.
 * - `tamsin`, `oskar`, `bea`, `leo`, `rumi`: one card each for the other
 *   match levels (very high to very low); `noor` is "not enough shared".
 * - `marathonwatcher-2026`: the heavy profile (`heavy.ts`): a 20-character
 *   name, four-digit counts, every lane far past its cap.
 * - `mira`: a medium profile, a few rows in every lane.
 * - `seenit`: two finished shows marked "Seen it" (undated only).
 */

/** A fake ULID-shaped id: `01STUB<NAME>` padded with zeros to 26 chars */
export const fakeId = (name: string): string =>
  `01STUB${name.toUpperCase()}`.padEnd(26, '0');

const provider = (id: number, name: string, logo: string): WatchProvider => ({
  id,
  logo: img(logo),
  logoPath: `/${logo}`,
  name,
});

export const PROVIDERS = {
  appletv: provider(350, 'Apple TV+', 'pp_prov_appletv.png'),
  disney: provider(337, 'Disney Plus', 'pp_prov_disney.png'),
  netflix: provider(8, 'Netflix', 'pp_prov_netflix.png'),
  paramount: provider(531, 'Paramount Plus', 'pp_prov_paramount.png'),
} as const;

/** The heavy profile's long list of services ("Watches on" with ten icons) */
const MANY_PROVIDERS: ReadonlyArray<WatchProvider> = [
  ...Object.values(PROVIDERS),
  provider(9, 'Amazon Prime Video', 'pp_prov_disney.png'),
  provider(29, 'Sky Go', 'pp_prov_netflix.png'),
  provider(41, 'ITVX', 'pp_prov_appletv.png'),
  provider(38, 'BBC iPlayer', 'pp_prov_paramount.png'),
  provider(103, 'All 4', 'pp_prov_disney.png'),
  provider(1899, 'Max', 'pp_prov_netflix.png'),
];

type Person = Readonly<{
  user: User;
  episodes: number;
  finished: number;
  followers: number;
  following: number;
}>;

const person = (
  name: string,
  createdAt: string,
  counts: Omit<Person, 'user'>,
  watchProviders: ReadonlyArray<WatchProvider>,
  role: User['role'] = 'user',
): Person => {
  const id = fakeId(name);
  return {
    ...counts,
    user: {
      country: 'GB',
      createdAt,
      email: `${name}@example.com`,
      id,
      name: `${name[0]?.toUpperCase()}${name.slice(1)} Example`,
      role,
      updatedAt: createdAt,
      username: name,
      version: 1,
      watchProviders: [...watchProviders],
    },
  };
};

const all = [
  PROVIDERS.netflix,
  PROVIDERS.disney,
  PROVIDERS.appletv,
  PROVIDERS.paramount,
];

export const PEOPLE = {
  alex: person(
    'alex',
    '2024-11-03T10:00:00.000Z',
    { episodes: 5341, finished: 218, followers: 6, following: 8 },
    all,
  ),
  bea: person(
    'bea',
    '2025-03-02T10:00:00.000Z',
    { episodes: 1500, finished: 70, followers: 1, following: 1 },
    [PROVIDERS.netflix],
  ),
  ivo: person(
    'ivo',
    '2025-02-11T10:00:00.000Z',
    { episodes: 1204, finished: 61, followers: 2, following: 3 },
    [PROVIDERS.netflix],
  ),
  juno: person(
    'juno',
    '2024-12-14T10:00:00.000Z',
    { episodes: 9024, finished: 155, followers: 1, following: 2 },
    [
      PROVIDERS.netflix,
      PROVIDERS.disney,
      PROVIDERS.appletv,
      PROVIDERS.paramount,
    ],
  ),
  // Partway through The Bear like alex (the show stub seeds kit the same
  // way), with an overview that agrees with it: marks from Continue
  // watching and the profile's Up next round-trip through the show stub
  kit: person(
    'kit',
    '2023-07-01T10:00:00.000Z',
    { episodes: 31, finished: 0, followers: 0, following: 0 },
    [PROVIDERS.disney],
  ),
  leo: person(
    'leo',
    '2025-04-02T10:00:00.000Z',
    { episodes: 900, finished: 40, followers: 1, following: 1 },
    [PROVIDERS.disney],
  ),
  'marathonwatcher-2026': person(
    'marathonwatcher-2026',
    '2019-02-28T10:00:00.000Z',
    { episodes: 9876, finished: 1204, followers: 1234, following: 987 },
    MANY_PROVIDERS,
  ),
  mira: person(
    'mira',
    '2025-08-15T10:00:00.000Z',
    { episodes: 642, finished: 37, followers: 12, following: 9 },
    [PROVIDERS.netflix, PROVIDERS.appletv],
  ),
  nina: person(
    'nina',
    new Date(Date.now() - 3_600_000).toISOString(),
    { episodes: 0, finished: 0, followers: 0, following: 0 },
    [],
  ),
  noor: person(
    'noor',
    '2025-06-01T10:00:00.000Z',
    { episodes: 310, finished: 12, followers: 1, following: 1 },
    [PROVIDERS.netflix],
  ),
  oskar: person(
    'oskar',
    '2025-02-02T10:00:00.000Z',
    { episodes: 2600, finished: 90, followers: 2, following: 2 },
    [PROVIDERS.netflix, PROVIDERS.paramount],
  ),
  rae: person(
    'rae',
    '2023-07-01T10:00:00.000Z',
    { episodes: 2, finished: 0, followers: 0, following: 0 },
    [PROVIDERS.disney],
  ),
  rumi: person(
    'rumi',
    '2025-05-02T10:00:00.000Z',
    { episodes: 700, finished: 30, followers: 1, following: 1 },
    [PROVIDERS.appletv],
  ),
  sam: person(
    'sam',
    '2022-09-15T09:00:00.000Z',
    { episodes: 820, finished: 31, followers: 4, following: 2 },
    [PROVIDERS.disney],
    'admin',
  ),
  // Day 0 with only "Seen it" marks (Get started): two finished shows, every
  // episode undated, so no year has a dated episode (Stats is an empty year)
  seenit: person(
    'seenit',
    '2026-11-01T10:00:00.000Z',
    { episodes: 18, finished: 2, followers: 0, following: 0 },
    [],
  ),
  tamsin: person(
    'tamsin',
    '2025-01-02T10:00:00.000Z',
    { episodes: 3300, finished: 110, followers: 2, following: 2 },
    [PROVIDERS.netflix, PROVIDERS.appletv],
  ),
  wren: person(
    'wren',
    '2025-01-20T10:00:00.000Z',
    { episodes: 4102, finished: 120, followers: 3, following: 5 },
    [PROVIDERS.netflix, PROVIDERS.appletv],
  ),
} as const;

export type PersonName = keyof typeof PEOPLE;

export const personById = (id: string) =>
  Object.values(PEOPLE).find((candidate) => candidate.user.id === id);

export const personByUsername = (username: string) =>
  Object.values(PEOPLE).find(
    (candidate) => candidate.user.username === username,
  );

/** `toPublicUser`: what `/user/:id` and `/user/by-username/:username` return */
export const publicUser = (person: Person) => ({
  createdAt: person.user.createdAt,
  id: person.user.id,
  username: person.user.username,
  watchProviders: person.user.watchProviders,
});
