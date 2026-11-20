import { UnresolvedKeySchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import { ask, failureOf, parseJson, readFailure } from '@/lib/connections/http';
import type { CookieJar } from '@/lib/connections/jar';
import type { ReadFailure } from '@/lib/connections/reader';

import { clientKey, dropClientKey } from './clientKey';

/**
 * The BBC's User Activity Service (UAS): the viewer's whole iPlayer history,
 * one row per episode, overwritten by its latest play event. Wants the
 * `.bbc.co.uk` cookies and the BBC's public client key (./clientKey.ts).
 *
 * Not through `getJson`: a 400's text says whether the client key was
 * refused or the page is past the last.
 *
 * Its access token (`ckns_atkn`) lasts hours, and nothing UAS answers renews
 * it: iPlayer's pages get a new one from the BBC's session service with the
 * long-lived sign-in (`ckns_id`). A refused page does the same, once.
 */

const PLAYS_URL = 'https://activity.api.bbc.co.uk/my/plays';

/** idcta's `tokenRefresh_url`, as the BBC's config serves it */
const SESSION_URL =
  'https://session.bbc.co.uk/session?ptrt=https%3A%2F%2Fsession.bbc.co.uk%2Fsession%2Fannounce';

const ACCESS_TOKEN = 'ckns_atkn';

/** What the BBC's own pages send */
const BBC_PAGE_HEADERS = {
  accept: 'application/json',
  origin: 'https://www.bbc.co.uk',
  referer: 'https://www.bbc.co.uk/',
} as const;

export const PLAYS_PER_PAGE = 100;

const PageSchema = v.object({
  items: v.array(v.unknown()),
  total: v.fallback(v.nullable(v.number()), null),
});

const RowSchema = v.object({
  action: v.string(),
  actionContext: v.fallback(v.string(), ''),
  created: v.string(),
  playMode: v.fallback(v.optional(v.string()), undefined),
  resourceId: UnresolvedKeySchema,
});

/** `urn:bbc:tv:version_offset:<version pid>#<seconds>` */
const ACTION_CONTEXT = /version_offset:([a-z0-9]+)#([\d.]+)?/;

export type ActivityPlay = Readonly<{
  action: string;
  /** A live stream's play: its offset is no position in an episode */
  live: boolean;
  /** Seconds into the episode; null when the service gives none */
  offset: number | null;
  pid: string;
  /** The version played has its own length */
  versionPid: string | null;
  /** Epoch ms */
  watchedAt: number;
}>;

export type ActivityPage = Readonly<{
  end: boolean;
  invalid: number;
  ok: true;
  plays: ReadonlyArray<ActivityPlay>;
  total: number | null;
}>;

const toPlay = (item: unknown): ActivityPlay | null => {
  const parsed = v.safeParse(RowSchema, item);
  if (!parsed.success) {
    return null;
  }
  const row = parsed.output;
  const watchedAt = Date.parse(row.created);
  if (Number.isNaN(watchedAt)) {
    return null;
  }
  const context = ACTION_CONTEXT.exec(row.actionContext);
  const offset = context?.[2] === undefined ? null : Number(context[2]);
  return {
    action: row.action,
    live: row.playMode === 'live',
    offset: offset !== null && Number.isFinite(offset) ? offset : null,
    pid: row.resourceId,
    versionPid: context?.[1] ?? null,
    watchedAt,
  };
};

/** A 400 for a `startIndex` past the history's end */
const PAST_THE_END =
  /Invalid page parameters|higher than the number of available/i;
const KEY_REFUSED = /validClientKey/i;

const END: ActivityPage = {
  end: true,
  invalid: 0,
  ok: true,
  plays: [],
  total: null,
};

const accessToken = (jar: CookieJar) =>
  jar.cookies().find((cookie) => cookie.name === ACCESS_TOKEN)?.value;

/**
 * A new access token into the jar. A refusal, a redirect (to sign-in) or an
 * answer without a token means the BBC sign-in itself is gone; the session
 * service being down doesn't.
 */
const renewAccessToken = async (
  jar: CookieJar,
): Promise<Readonly<{ ok: true }> | ReadFailure> => {
  const before = accessToken(jar);
  const answer = await ask(
    SESSION_URL,
    {
      headers: { ...BBC_PAGE_HEADERS, 'content-type': 'application/json' },
      redirect: 'manual',
    },
    jar,
  );
  if (!answer) {
    return readFailure('unavailable');
  }
  if (answer.status >= 200 && answer.status < 400) {
    const after = accessToken(jar);
    return answer.status < 300 && after !== undefined && after !== before
      ? { ok: true }
      : readFailure('signed-out');
  }
  return failureOf(answer);
};

const readOnce = async (
  jar: CookieJar,
  page: number,
): Promise<ActivityPage | ReadFailure> => {
  const key = await clientKey();
  if (!key) {
    return readFailure('unavailable');
  }
  const query = new URLSearchParams({
    items: String(PLAYS_PER_PAGE),
    resourceDomain: 'tv',
    resourceType: 'episode',
    startIndex: String(page * PLAYS_PER_PAGE),
  });
  const answer = await ask(
    `${PLAYS_URL}?${query}`,
    {
      headers: { ...BBC_PAGE_HEADERS, 'x-api-key': key },
      redirect: 'manual',
    },
    jar,
  );
  if (!answer) {
    return readFailure('unavailable');
  }
  const { status, text } = answer;
  if (status >= 300 && status < 400) {
    return readFailure('changed');
  }
  if (status === 400 && PAST_THE_END.test(text)) {
    return END;
  }
  if (status === 400 && KEY_REFUSED.test(text)) {
    // A rotated key: the next read looks for the new one
    dropClientKey();
    return readFailure('unavailable');
  }
  if (status < 200 || status >= 300) {
    return failureOf(answer);
  }
  const parsed = v.safeParse(PageSchema, parseJson(text));
  if (!parsed.success) {
    return readFailure('changed');
  }
  const plays: ActivityPlay[] = [];
  for (const item of parsed.output.items) {
    const play = toPlay(item);
    if (play) {
      plays.push(play);
    }
  }
  return {
    end: false,
    invalid: parsed.output.items.length - plays.length,
    ok: true,
    plays,
    total: parsed.output.total,
  };
};

export const readActivityPage = async (
  jar: CookieJar,
  page: number,
): Promise<ActivityPage | ReadFailure> => {
  const read = await readOnce(jar, page);
  if (read.ok || read.reason !== 'signed-out') {
    return read;
  }
  const renewed = await renewAccessToken(jar);
  return renewed.ok ? readOnce(jar, page) : renewed;
};
