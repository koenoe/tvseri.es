import { type BrowserContext, test } from '@playwright/test';

import {
  SESSION_COOKIE_NAME,
  USER_DISPLAY_COOKIE_NAME,
} from '../../src/auth/cookies';

/** The stub API's viewers (`e2e/stub-api/fixtures/show/store.ts`). */
export type StubViewer =
  | 'alex'
  | 'kit'
  | 'marathonwatcher-2026'
  | 'mira'
  | 'nina'
  | 'rae'
  | 'sam'
  | 'seenit';

/** Fresh per worker process, so a reused stub never serves a stale copy. */
const runId = Math.random().toString(36).slice(2, 8);

const e2ePort = Number(process.env.E2E_PORT ?? 3100);

/** Where the auth stub listens (`playwright.config.ts` starts it). */
const stubAuthUrl = `http://localhost:${Number(process.env.STUB_AUTH_PORT ?? e2ePort + 1100)}`;

/** This test's namespace: its own copy of the stub's state */
function currentNamespace(): string {
  const info = test.info();
  return `${runId}-${info.testId}-${info.repeatEachIndex}-${info.retry}`;
}

const stubApiUrl = `http://localhost:${Number(process.env.STUB_API_PORT ?? e2ePort + 1000)}`;

/**
 * Makes every request of this test whose path contains `includes` fail, for
 * the viewer's reads (they carry the token that names the test's copy of
 * the stub): `500` answers an error at once, `hang` outlasts the web's 10 s
 * fetch timeout. Call it after `signInAs`, before the first navigation.
 */
export async function failRead(
  viewer: StubViewer,
  includes: string,
  mode: '500' | 'hang' = '500',
): Promise<void> {
  await stubFault(viewer, { includes, mode });
}

/**
 * Makes every signed-out read whose path contains `includes` answer 503 for
 * the rest of the stub's life (the shared copy: cached public content reads
 * carry no token, so they can't be a test's own). Pick a path no other spec
 * reads, such as one landing slug's routes.
 */
export async function failSharedRead(includes: string): Promise<void> {
  const response = await fetch(`${stubApiUrl}/__stub/outage`, {
    body: JSON.stringify({ includes, mode: '500' }),
    headers: { 'content-type': 'application/json', 'x-api-key': 'stub' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`stub answered ${response.status}`);
  }
}

/** POSTs to one of the stub's outage routes as `viewer`, in this test's namespace */
async function postOutage(
  viewer: StubViewer,
  path: string,
  body: unknown,
): Promise<void> {
  const namespace = currentNamespace();
  const token = await (
    await fetch(`${stubAuthUrl}/__token?user=${viewer}&ns=${namespace}`)
  ).text();
  const response = await fetch(`${stubApiUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-api-key': 'stub',
    },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`stub answered ${response.status}`);
  }
}

/**
 * Any fault for this test's reads (`fixtures/__outage.ts`): `path` matches
 * one path exactly (`/me`), `includes` any path containing it; `slow`
 * answers as usual after `delayMs`, `answer` answers `body` (after `delayMs`
 * when set, or once `releaseHeld` is called when `held`); `times` limits it
 * to the first N matching reads.
 */
export async function stubFault(
  viewer: StubViewer,
  rule: Readonly<{
    body?: unknown;
    delayMs?: number;
    held?: boolean;
    includes?: string;
    mode: '500' | 'hang' | 'slow' | 'answer';
    path?: string;
    times?: number;
  }>,
): Promise<void> {
  await postOutage(viewer, '/__stub/outage', rule);
}

/** Lets this test's `held` answers go, and the later ones through at once */
export async function releaseHeld(viewer: StubViewer): Promise<void> {
  await postOutage(viewer, '/__stub/outage/release', {});
}

/** The stub's viewer ids (`e2e/stub-api/fixtures/show/store.ts`). */
const viewerId = (viewer: StubViewer) =>
  `01STUB${viewer.toUpperCase()}`.padEnd(26, '0');

/**
 * Marks episodes of one season watched in this test's copy of the stub, as
 * the API's batch route would (dates a day apart from 20 Apr 2025). Call it
 * after `signInAs`, before the navigation that should show the marks.
 */
export async function markWatched(
  viewer: StubViewer,
  seriesId: number,
  seasonNumber: number,
  episodeNumbers: ReadonlyArray<number>,
): Promise<void> {
  if (!episodeNumbers.length) {
    return;
  }
  const namespace = currentNamespace();
  const token = await (
    await fetch(`${stubAuthUrl}/__token?user=${viewer}&ns=${namespace}`)
  ).text();
  const read = async <T>(path: string): Promise<T> =>
    (await (
      await fetch(`${stubApiUrl}${path}`, { headers: { 'x-api-key': 'stub' } })
    ).json()) as T;
  const series = await read<{
    id: number;
    posterPath: string | null;
    slug: string;
    title: string;
  }>(`/series/${seriesId}`);
  const season = await read<{
    episodes: ReadonlyArray<{
      airDate: string;
      episodeNumber: number;
      runtime: number;
      seasonNumber: number;
      stillPath: string;
      title: string;
    }>;
  }>(`/series/${seriesId}/season/${seasonNumber}`);
  const first = Date.UTC(2025, 3, 20, 20);
  const items = season.episodes
    .filter((episode) => episodeNumbers.includes(episode.episodeNumber))
    .map((episode) => ({
      episode,
      tvSeries: {
        id: series.id,
        posterPath: series.posterPath ?? '',
        slug: series.slug,
        title: series.title,
      },
      userId: viewerId(viewer),
      watchedAt: first + episode.episodeNumber * 86_400_000,
    }));
  const response = await fetch(
    `${stubApiUrl}/user/${viewerId(viewer)}/watched/batch`,
    {
      body: JSON.stringify(items),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-api-key': 'stub',
      },
      method: 'POST',
    },
  );
  if (!response.ok) {
    throw new Error(`stub answered ${response.status}`);
  }
}

/**
 * Calls the stub API as a viewer, in this test's copy of the stub (what the
 * web would send with that viewer's session): to set up state a page then
 * reads. Call it after `signInAs`.
 */
export async function stubApiAs(
  viewer: StubViewer,
  path: string,
  init: Readonly<{ method?: string; body?: unknown }> = {},
): Promise<Response> {
  const namespace = currentNamespace();
  const token = await (
    await fetch(`${stubAuthUrl}/__token?user=${viewer}&ns=${namespace}`)
  ).text();
  return fetch(`${stubApiUrl}${path}`, {
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-api-key': 'stub',
    },
    method: init.method ?? 'GET',
  });
}

/**
 * Signs a browser context in as a stub viewer by adding the session cookie
 * (and the display cookie the header reads). Call it before the first
 * navigation, never between `instant()` and a `goto`: it only sets cookies.
 *
 * Every call gets its own copy of the stub's state: the session carries a
 * namespace named after the running test (and its retry/repeat), so the viewer
 * starts from the seed and nothing another test writes, nor anything this test
 * writes, is ever seen outside it. Specs therefore never reset the stub.
 * Parallel specs can all sign in as `alex`, and a write without a namespaced
 * session is rejected by the stub.
 */
export async function signInAs(
  context: BrowserContext,
  viewer: StubViewer,
): Promise<void> {
  const namespace = currentNamespace();
  const response = await fetch(
    `${stubAuthUrl}/__session?user=${viewer}&ns=${namespace}&format=json`,
  );
  if (!response.ok) {
    throw new Error(`auth stub answered ${response.status}`);
  }
  const { value } = (await response.json()) as { value: string };
  await context.addCookies([
    {
      domain: 'localhost',
      httpOnly: true,
      name: SESSION_COOKIE_NAME,
      path: '/',
      sameSite: 'Lax',
      value,
    },
    {
      domain: 'localhost',
      name: USER_DISPLAY_COOKIE_NAME,
      path: '/',
      sameSite: 'Lax',
      value: viewer,
    },
  ]);
}

/**
 * Signs in as `viewer` with the display cookie naming `username` instead:
 * the owner's view of a page whose owner is not a stub viewer (the Stats
 * fixtures' `lena`). Only the display cookie decides what the shell holds
 * for its owner; nothing else on the page may depend on it.
 */
export async function signInShownAs(
  context: BrowserContext,
  viewer: StubViewer,
  username: string,
): Promise<void> {
  await signInAs(context, viewer);
  await context.addCookies([
    {
      domain: 'localhost',
      name: USER_DISPLAY_COOKIE_NAME,
      path: '/',
      sameSite: 'Lax',
      value: username,
    },
  ]);
}

/**
 * Gives a context the library hint a browser keeps once it has seen the
 * viewer's library (`lib/viewer/htmlHints.ts`): the tracked show ids for that
 * account, in place before the first paint. Call it before the first
 * navigation. Without it the browser is a first visit: no hint.
 */
export async function setLibraryHint(
  context: BrowserContext,
  viewer: StubViewer,
  ids: ReadonlyArray<number>,
): Promise<void> {
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // no storage
      }
    },
    [
      'tvseries:library-hint',
      JSON.stringify({ ids, u: viewer, v: 1 }),
    ] as const,
  );
}

/** What the auth stub counted for one rotating session (`stub-auth/rotation.ts`). */
export type RefreshStats = Readonly<{
  calls: number;
  issued: number;
  rejected: number;
}>;

export type RotatingSession = Readonly<{
  /** The session cookie value the browser starts with. */
  cookie: string;
  stats: () => Promise<RefreshStats>;
  /** Moves the family's used refresh tokens past the issuer's reuse window. */
  lapse: () => Promise<void>;
  /**
   * Refreshes the browser's refresh token elsewhere (another server instance,
   * a dev server since restarted); the browser never gets the new cookie.
   */
  spendElsewhere: () => Promise<void>;
  /** Revokes the family's refresh tokens (a definitive rejection). */
  revoke: () => Promise<void>;
  /** Makes `/token` answer `failWith` (e.g. 503), or clears it. */
  fault: (failWith?: number) => Promise<void>;
}>;

const rotationCall = async (
  path: string,
  ns: string,
  {
    method = 'POST',
    query = '',
  }: Readonly<{ method?: string; query?: string }> = {},
) => {
  const response = await fetch(
    `${stubAuthUrl}/__rotation${path}?ns=${ns}${query}`,
    { method },
  );
  if (!response.ok) {
    throw new Error(`auth stub answered ${response.status}`);
  }
  return (await response.json()) as RefreshStats;
};

/**
 * Signs a context in with a session whose refresh tokens rotate exactly like
 * the real issuer's (single use, with a reuse window). `accessSeconds` is the
 * lifetime left on the first access token: 0 means already expired, so the
 * next request that may refresh does. `reuseSeconds` is the issuer's reuse
 * window (300 as deployed; 0 = no grace). The cookie is host-only, like the
 * one the server writes, so a refresh replaces it instead of adding a copy.
 */
export async function signInRotating(
  context: BrowserContext,
  viewer: StubViewer,
  baseURL: string,
  {
    accessSeconds = 0,
    reuseSeconds = 300,
  }: Readonly<{ accessSeconds?: number; reuseSeconds?: number }> = {},
): Promise<RotatingSession> {
  const info = test.info();
  const ns = `${runId}-${info.testId}-${info.repeatEachIndex}-${info.retry}`;
  const response = await fetch(
    `${stubAuthUrl}/__session?user=${viewer}&ns=${ns}&rotate=1&access=${accessSeconds}&reuse=${reuseSeconds}&format=json`,
  );
  if (!response.ok) {
    throw new Error(`auth stub answered ${response.status}`);
  }
  const { value } = (await response.json()) as { value: string };
  await context.addCookies([
    {
      httpOnly: true,
      name: SESSION_COOKIE_NAME,
      sameSite: 'Lax',
      url: baseURL,
      value,
    },
    {
      name: USER_DISPLAY_COOKIE_NAME,
      sameSite: 'Lax',
      url: baseURL,
      value: viewer,
    },
  ]);
  return {
    cookie: value,
    fault: async (failWith) => {
      await rotationCall('/fault', ns, {
        query: failWith ? `&failWith=${failWith}` : '',
      });
    },
    lapse: async () => {
      await rotationCall('/lapse', ns);
    },
    revoke: async () => {
      await rotationCall('/revoke', ns);
    },
    spendElsewhere: async () => {
      await rotationCall('/spend', ns);
    },
    stats: () => rotationCall('', ns, { method: 'GET' }),
  };
}
