import { castOf, SHOW_COUNT } from './upstream';

/**
 * A viral day's traffic, per page view:
 * 90% signed out (show pages, Home, person pages, half the show views
 * prefetching up to 10 cast members' pages), 10% signed in (Home, profile,
 * the person page's watched line, single-episode marks). The API paths are
 * the ones the web's loaders read.
 */

/**
 * Whether show pages prefetch their cast's person pages (the tiles'
 * viewport prefetch, today's setting). `LOAD_PERSON_PREFETCH=0` models
 * person tiles prefetched on intent only.
 */
const PERSON_PREFETCH = process.env.LOAD_PERSON_PREFETCH !== '0';

export type Call = Readonly<{
  kind: string;
  path: string;
  /** Signed in as this user (a private, uncached read or a write) */
  as?: string;
  method?: string;
  body?: unknown;
}>;

export type Visit =
  | Readonly<{ kind: 'reads'; calls: ReadonlyArray<Call> }>
  | Readonly<{ kind: 'mark'; seriesId: number; userId: string }>;

/** A seeded PRNG (mulberry32), so a run's mix is the same every time */
export const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Show popularity: Zipf over the synthetic catalogue. s = 1.3 sends about 8%
 * of show views past the top 300 shows: with this rig's default rate that is
 * the analysis' "new show URLs 2-8 a second" scaled to the simulated share.
 */
const ZIPF_S = 1.3;
const zipf = (() => {
  const weights = Array.from(
    { length: SHOW_COUNT },
    (_, rank) => 1 / (rank + 1) ** ZIPF_S,
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let running = 0;
  return weights.map((weight) => {
    running += weight / total;
    return running;
  });
})();

export const pickShow = (random: () => number) => {
  const value = random();
  let low = 0;
  let high = zipf.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((zipf[middle] ?? 1) < value) low = middle + 1;
    else high = middle;
  }
  return low + 1;
};

export const showPage = (id: number): ReadonlyArray<Call> =>
  [
    `/series/${id}?include_images=true`,
    `/series/${id}/season/1`,
    `/series/${id}/runtimes`,
    `/series/${id}/credits`,
    `/series/${id}/recommendations`,
    `/series/${id}/rating`,
    `/series/${id}/keywords`,
    `/series/${id}/content-rating?region=US`,
    `/series/${id}/watch-providers?region=US`,
  ].map((path) => ({ kind: 'show', path }));

export const personPage = (id: number): ReadonlyArray<Call> =>
  [
    `/person/${id}`,
    `/person/${id}/external-ids`,
    `/person/${id}/shows`,
    `/person/${id}/career`,
    `/person/${id}/collaborators`,
    `/person/${id}/family-and-awards`,
    `/person/${id}/known-for`,
  ].map((path) => ({ kind: 'person', path }));

export const homePage = (date: string, week: string): ReadonlyArray<Call> =>
  [
    '/collection/trending',
    `/home/feature?date=${date}`,
    `/home/toy?date=${date}`,
    `/home/new-this-week?date=${date}`,
    '/premieres',
    `/home/hidden-gems?week=${week}`,
    `/discover/go-deeper?date=${date}`,
    '/duration',
  ].map((path) => ({ kind: 'home', path }));

const signedInHome = (userId: string, date: string): ReadonlyArray<Call> =>
  [
    '/me/overview?view=up-next',
    `/me/home/because-you-watched?date=${date}`,
    `/me/home/if-you-liked?date=${date}`,
    '/me/home/more-genre',
  ].map((path) => ({ as: userId, kind: 'home-me', path }));

const profilePage = (userId: string): ReadonlyArray<Call> =>
  ['/me/overview', '/me/waiting-for'].map((path) => ({
    as: userId,
    kind: 'profile',
    path,
  }));

export const createMix = (
  random: () => number,
  users: ReadonlyArray<string>,
  today: () => Readonly<{ date: string; week: string }>,
) => {
  const anyUser = () => users[Math.floor(random() * users.length)] as string;

  return (): Visit => {
    const roll = random();
    const { date, week } = today();
    if (roll < 0.45) {
      const id = pickShow(random);
      // Half the show views scroll the cast row into view: up to 10 person
      // pages are prefetched (the tiles' viewport prefetch)
      const prefetched =
        PERSON_PREFETCH && random() < 0.5
          ? castOf(id)
              .slice(0, 10)
              .flatMap((personId) => personPage(personId))
          : [];
      return { calls: [...showPage(id), ...prefetched], kind: 'reads' };
    }
    if (roll < 0.75) {
      return { calls: homePage(date, week), kind: 'reads' };
    }
    if (roll < 0.9) {
      const personId = castOf(pickShow(random))[Math.floor(random() * 12)];
      return { calls: personPage(personId ?? 100_000), kind: 'reads' };
    }
    // Signed in: 10%
    const userId = anyUser();
    if (roll < 0.94) {
      return {
        calls: [...homePage(date, week), ...signedInHome(userId, date)],
        kind: 'reads',
      };
    }
    if (roll < 0.96) {
      return { calls: profilePage(userId), kind: 'reads' };
    }
    if (roll < 0.97) {
      const personId = castOf(pickShow(random))[0] ?? 100_000;
      return {
        calls: [
          ...personPage(personId),
          {
            as: userId,
            kind: 'person-me',
            path: `/me/person/${personId}/watched`,
          },
        ],
        kind: 'reads',
      };
    }
    return { kind: 'mark', seriesId: pickShow(random), userId };
  };
};
