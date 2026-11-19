import {
  type ConnectionCookie,
  type ConnectionLatest,
  type NetflixViewedItem,
  NetflixViewedItemSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import {
  ask,
  failureOf,
  getText,
  parseJson,
  readFailure,
} from '@/lib/connections/http';
import { type CookieJar, cookieJar } from '@/lib/connections/jar';
import type { ReadFailure } from '@/lib/connections/reader';

const SITE = 'netflix.com';

/**
 * Read the way Netflix's own page does: `/browse` gives the build id and
 * profile guid, then `pathEvaluator` answers one page at a time.
 */

export type NetflixSession = Readonly<{
  build: string;
  guid: string;
  jar: CookieJar;
}>;

export type ActivityPage = Readonly<{
  items: ReadonlyArray<NetflixViewedItem>;
  invalid: number;
  profileName: string | null;
  total: number | null;
}>;

/** A field Netflix may leave out or send oddly: null rather than a failed read */
const orNull = <T extends v.GenericSchema>(schema: T) =>
  v.fallback(v.nullable(schema), null);

/** Anything else means Netflix changed it */
const ActivityResponseSchema = v.object({
  jsonGraph: v.object({
    aui: v.object({
      viewingActivity: v.object({
        value: v.object({
          profileInfo: orNull(v.object({ profileName: orNull(v.string()) })),
          vhSize: orNull(v.number()),
          viewedItems: v.array(v.unknown()),
        }),
      }),
    }),
  }),
});

const ORIGIN = 'https://www.netflix.com';
const BROWSE_URL = `${ORIGIN}/browse`;
/** Asked for; Netflix answers about 20 whatever this says */
const PAGE_SIZE = 50;

const firstMatch = (pattern: RegExp, text: string): string | null =>
  pattern.exec(text)?.[1] ?? null;

const isSignInPath = (url: URL) =>
  /\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?login\b/i.test(url.pathname);

const isNetflix = (url: URL) =>
  url.protocol === 'https:' &&
  (url.hostname === 'netflix.com' || url.hostname.endsWith('.netflix.com'));

/**
 * Off Netflix is `changed`, not signed out: nothing says the session is gone,
 * so the viewer isn't asked to link again. The jar is never sent there.
 */
const browseRedirect = (location: URL): 'follow' | ReadFailure => {
  if (!isNetflix(location)) {
    return readFailure('changed');
  }
  return isSignInPath(location) ? readFailure('signed-out') : 'follow';
};

/** Redirects followed by hand so a cookie renewed on the way isn't lost */
export const openSession = async (
  stored: ReadonlyArray<ConnectionCookie>,
): Promise<Readonly<{ ok: true; session: NetflixSession }> | ReadFailure> => {
  if (!stored.some((cookie) => cookie.name === 'NetflixId')) {
    return readFailure('signed-out');
  }
  const jar = cookieJar(stored, SITE);
  const read = await getText(
    BROWSE_URL,
    { accept: 'text/html' },
    { jar, redirect: browseRedirect },
  );
  if (!read.ok) {
    return read;
  }
  const html = read.text;
  const build = firstMatch(/BUILD_IDENTIFIER"\s*:\s*"([^"]+)"/, html);
  const guid =
    firstMatch(/"guid"\s*:\s*"([A-Z0-9]{8,})"/, html) ??
    firstMatch(/"profileGuid"\s*:\s*"([A-Z0-9]{8,})"/, html);
  // Netflix expiring its own session cookie is its word that it's gone
  if (!jar.cookies().some((cookie) => cookie.name === 'NetflixId')) {
    return readFailure('signed-out');
  }
  if (!build || !guid) {
    return readFailure('changed');
  }
  return { ok: true, session: { build, guid, jar } };
};

/** `guid` may be the linked profile rather than the one `/browse` landed on */
export const readActivityPage = async (
  session: NetflixSession,
  page: number,
  guid = session.guid,
): Promise<Readonly<{ ok: true; page: ActivityPage }> | ReadFailure> => {
  const callPath = encodeURIComponent(
    `["aui","viewingActivity",${page},${PAGE_SIZE}]`,
  );
  // A read, though a POST: asking again (`ask`) changes nothing at Netflix
  const answer = await ask(
    `${ORIGIN}/api/aui/pathEvaluator/web/^2.0.0?method=call&callPath=${callPath}&falcor_server=0.1.0`,
    {
      body: `param=${encodeURIComponent(JSON.stringify({ guid }))}`,
      headers: {
        accept: '*/*',
        'content-type': 'application/x-www-form-urlencoded',
        'x-netflix.client.request.name': 'ui/xhrUnclassified',
        'x-netflix.clienttype': 'akira',
        'x-netflix.esnprefix': 'NFCDCH-LX-',
        'x-netflix.nq.stack': 'prod',
        'x-netflix.request.routing':
          '{"path":"/nq/aui/endpoint/^1.0.0-web/pathEvaluator","control_tag":"auinqweb"}',
        'x-netflix.uiversion': session.build,
      },
      method: 'POST',
      // Never followed: the jar goes to Netflix's own endpoint only
      redirect: 'manual',
    },
    session.jar,
  );
  if (!answer) {
    return readFailure('unavailable');
  }
  if (answer.status < 200 || answer.status >= 300) {
    return failureOf(answer);
  }
  const parsed = v.safeParse(ActivityResponseSchema, parseJson(answer.text));
  if (!parsed.success) {
    return readFailure('changed');
  }
  const { profileInfo, vhSize, viewedItems } =
    parsed.output.jsonGraph.aui.viewingActivity.value;
  const items: NetflixViewedItem[] = [];
  for (const item of viewedItems) {
    const entry = v.safeParse(NetflixViewedItemSchema, item);
    if (entry.success) {
      items.push(entry.output);
    }
  }
  return {
    ok: true,
    page: {
      invalid: viewedItems.length - items.length,
      items,
      profileName: profileInfo?.profileName ?? null,
      total: vhSize,
    },
  };
};

const latestOf = (
  items: ReadonlyArray<NetflixViewedItem>,
): ConnectionLatest | null => {
  const [newest] = items;
  if (!newest) {
    return null;
  }
  const isEpisode = Boolean(newest.seriesTitle);
  return {
    episodeTitle: isEpisode ? (newest.episodeTitle ?? newest.title) : null,
    title: newest.seriesTitle ?? newest.title,
    watchedAt: newest.date,
  };
};

export type NetflixRead =
  | Readonly<{
      cookies: ReadonlyArray<ConnectionCookie>;
      guid: string;
      latest: ConnectionLatest | null;
      ok: true;
      profileName: string | null;
      total: number | null;
    }>
  | ReadFailure;

export const netflixTestRead = async (
  stored: ReadonlyArray<ConnectionCookie>,
): Promise<NetflixRead> => {
  const opened = await openSession(stored);
  if (!opened.ok) {
    return opened;
  }
  const read = await readActivityPage(opened.session, 0);
  if (!read.ok) {
    return read;
  }
  return {
    cookies: opened.session.jar.cookies(),
    guid: opened.session.guid,
    latest: latestOf(read.page.items),
    ok: true,
    profileName: read.page.profileName,
    total: read.page.total,
  };
};
