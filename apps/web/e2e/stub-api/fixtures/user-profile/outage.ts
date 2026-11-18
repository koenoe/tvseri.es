import type { StubResponse } from '../../types.ts';
import { fail } from './http.ts';

/**
 * Profiles whose one read fails, for the "one read never takes the page
 * down" specs. `out-<mode>-<read>` is a visitable profile (juno's data under
 * another name); the one read named fails: `500` answers an error at once,
 * `hang` outlasts the web's fetch timeout. Every other read answers as
 * juno's would. Only these specs use these names.
 */

export type OutageMode = '500' | 'hang';

/** Which stub path a read key fails; the keys are the reads the pages make */
export const OUTAGE_READS = {
  counts: '/user/:id/followers/count',
  follow: '/user/:id/following/:fid',
  history: '/user/:id/watched',
  // the Library page and its shelf nav, History's month index
  library: '/user/:id/library/:shelf',
  librarySummary: '/user/:id/library',
  list: '/user/:id/list/:list',
  match: '/user/:id/match',
  overview: '/user/:id/overview',
  social: '/user/:id/followers',
  stats: '/user/:id/stats/:year/genres',
  statsYears: '/user/:id/stats/years',
  // the profile read (`/u/out-500-user`): answered in `__outage.ts`
  user: '/user/by-username/:username',
} as const;

export type OutageRead = keyof typeof OUTAGE_READS;

const ID_PREFIX = '01STUBOUT-';
const HANG_MS = 25_000;

/** The username a spec visits: `/u/out-500-counts` */
export const outageUsername = (mode: OutageMode, read: OutageRead): string =>
  `out-${mode}-${read}`;

/** The id the stub gives that profile: the fake ULID shape of `people.ts` */
export const outageId = (username: string): string =>
  `${ID_PREFIX}${username.slice('out-'.length).toUpperCase()}`.padEnd(26, '0');

export const isOutageId = (id: string | undefined): id is string =>
  id?.startsWith(ID_PREFIX) ?? false;

const parse = (id: string) => {
  const [mode, read] = id
    .slice(ID_PREFIX.length)
    .replace(/0+$/, '')
    .toLowerCase()
    .split('-');
  return { mode, read };
};

/**
 * `out-500-art`: the profile's Stats name shows whose `/series/:id` read
 * fails (`ART_DOWN_OFFSET` in `__outage.ts`). That read carries no token and
 * is cached per show, so the show id is the only switch.
 */
export const isArtOutage = (id: string | undefined): boolean =>
  isOutageId(id) && parse(id).read === 'art';

/** The failing answer for this read of this profile, or `undefined` to pass */
export const outageFor = (
  id: string | undefined,
  read: OutageRead,
): StubResponse | Promise<StubResponse> | undefined => {
  if (!isOutageId(id)) {
    return undefined;
  }
  const outage = parse(id);
  // the id is upper case: compare the read names case-blind (`librarySummary`)
  if (outage.read !== read.toLowerCase()) {
    return undefined;
  }
  const down = fail(503, 'Service Unavailable');
  if (outage.mode === 'hang') {
    return new Promise((resolve) => setTimeout(() => resolve(down), HANG_MS));
  }
  return down;
};
