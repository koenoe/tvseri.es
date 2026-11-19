import { AsyncLocalStorage } from 'node:async_hooks';
import { sleep } from '@tvseri.es/utils';

import type { CookieJar } from './jar';
import type { ReadFailure, ReadFailureReason } from './reader';

/**
 * HTTP shared by every service reader. Redirects are followed by hand so the
 * jar only goes to the service's own endpoints.
 */

const TIMEOUT_MS = 10_000;

/** A proxy's or load balancer's refusals, worth one more try */
const TRANSIENT = new Set([502, 503, 504]);

/** The quick retry's pause: 1 to 3 seconds, never the same twice */
const retryPauseMs = () => 1000 + Math.floor(Math.random() * 2000);

/** The shortest and longest wait a `Retry-After` is taken at */
const MIN_RETRY_AFTER_SECONDS = 60;
const MAX_RETRY_AFTER_SECONDS = 3600;
/** A `Retry-After` this short is the quick retry's to wait out */
const QUICK_RETRY_AFTER_SECONDS = 3;

export const readFailure = (reason: ReadFailureReason): ReadFailure => ({
  ok: false,
  reason,
});

const retryAfterOf = (headers: Headers, now: number): number | null => {
  const value = headers.get('retry-after')?.trim();
  if (!value) {
    return null;
  }
  const seconds = /^\d+$/.test(value)
    ? Number(value)
    : (Date.parse(value) - now) / 1000;
  return Number.isNaN(seconds) ? null : seconds;
};

/** `Retry-After`, clamped to a minute to an hour */
export const retryAfterSeconds = (
  headers: Headers,
  now = Date.now(),
): number | null => {
  const seconds = retryAfterOf(headers, now);
  return seconds === null
    ? null
    : Math.min(
        MAX_RETRY_AFTER_SECONDS,
        Math.max(MIN_RETRY_AFTER_SECONDS, Math.ceil(seconds)),
      );
};

export type Answer = Readonly<{
  headers: Headers;
  status: number;
  text: string;
}>;

type RefusalOptions = Readonly<{
  /**
   * False for a page whose 401 or 403 says nothing about the session (a
   * title withheld for its own reasons): `read-failed` then.
   */
  authStatus?: boolean;
}>;

/** Only the service's own 401 or 403 means signed out; 429 and 5xx are `unavailable` */
export const failureOf = (
  { headers, status }: Pick<Answer, 'headers' | 'status'>,
  { authStatus = true }: RefusalOptions = {},
): ReadFailure => {
  if (status === 401 || status === 403) {
    return readFailure(authStatus ? 'signed-out' : 'read-failed');
  }
  if (status === 429 || status >= 500) {
    const after = retryAfterSeconds(headers);
    return after === null
      ? readFailure('unavailable')
      : { ...readFailure('unavailable'), retryAfterSeconds: after };
  }
  return readFailure('read-failed');
};

/**
 * Node's own user agent names itself; reads should look like the browser the
 * session came from. Bump the version now and then: an old Chrome stands out.
 */
const BROWSER_HEADERS: Readonly<Record<string, string>> = {
  'accept-language': 'en-GB,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

const browser = new AsyncLocalStorage<Readonly<{ userAgent: string }>>();

/**
 * Runs `read` with the viewer's own user agent, which a service may have tied
 * the session to. Older extensions send none: desktop Chrome's then.
 */
export const asBrowser = <T>(
  userAgent: string | null,
  read: () => Promise<T>,
): Promise<T> => (userAgent ? browser.run({ userAgent }, read) : read());

type AskInit = Omit<RequestInit, 'headers' | 'signal'> &
  Readonly<{ headers: Readonly<Record<string, string>> }>;

/** Throws on a value a header can't carry; the message quotes it, so never let it out */
const headersOf = (init: AskInit, jar: CookieJar | undefined): Headers => {
  const headers = new Headers(init.headers);
  if (jar) {
    headers.set('cookie', jar.header());
  }
  const own = browser.getStore();
  if (own && !headers.has('user-agent')) {
    headers.set('user-agent', own.userAgent);
  }
  for (const [name, value] of Object.entries(BROWSER_HEADERS)) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }
  return headers;
};

/**
 * One try; null on any network failure (the timeout covers the body too).
 * Nothing is logged or thrown: a header's error would carry the session.
 */
const askOnce = async (
  url: string,
  init: AskInit,
  jar: CookieJar | undefined,
): Promise<Answer | null> => {
  try {
    const response = await fetch(url, {
      ...init,
      headers: headersOf(init, jar),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    jar?.renew(response.headers.getSetCookie());
    const text = await response.text();
    return { headers: response.headers, status: response.status, text };
  } catch {
    return null;
  }
};

/**
 * Retries a passing failure (timeout, dropped connection, 502/503/504) once
 * after a short pause, unless it asks for a longer wait. Only a failure that
 * outlasts this reaches the sync, as a strike.
 */
export const ask = async (
  url: string,
  init: AskInit,
  jar?: CookieJar,
): Promise<Answer | null> => {
  const first = await askOnce(url, init, jar);
  if (
    first &&
    (!TRANSIENT.has(first.status) ||
      (retryAfterOf(first.headers, Date.now()) ?? 0) >
        QUICK_RETRY_AFTER_SECONDS)
  ) {
    return first;
  }
  await sleep(retryPauseMs());
  return (await askOnce(url, init, jar)) ?? first;
};

export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Redirects followed before a read gives up */
const MAX_REDIRECTS = 3;

type GetOptions = RefusalOptions &
  Readonly<{
    /** Only the caller knows which redirect is its service's sign-in page */
    redirect: (location: URL) => 'follow' | ReadFailure;
    /** Without one, `headers` carry the cookies as given */
    jar?: CookieJar;
  }>;

type GetJsonOptions = GetOptions &
  Readonly<{
    /** A 200 that isn't JSON (a bot check, a sign-in page): `changed` unless read otherwise */
    notJson?: (text: string) => ReadFailure;
  }>;

/** Follows redirects by hand, so the jar only goes where `redirect` allows */
export const getText = async (
  url: string,
  headers: Readonly<Record<string, string>>,
  options: GetOptions,
  hops = 0,
): Promise<Readonly<{ ok: true; text: string }> | ReadFailure> => {
  const { jar, redirect } = options;
  const answer = await ask(url, { headers, redirect: 'manual' }, jar);
  if (!answer) {
    return readFailure('unavailable');
  }
  if (answer.status >= 300 && answer.status < 400) {
    let next: URL;
    try {
      next = new URL(answer.headers.get('location') ?? '', url);
    } catch {
      return readFailure('changed');
    }
    const where = redirect(next);
    if (where !== 'follow') {
      return where;
    }
    return hops < MAX_REDIRECTS
      ? getText(next.href, headers, options, hops + 1)
      : readFailure('read-failed');
  }
  if (answer.status < 200 || answer.status >= 300) {
    return failureOf(answer, options);
  }
  return { ok: true, text: answer.text };
};

export const getJson = async (
  url: string,
  headers: Readonly<Record<string, string>>,
  { notJson = () => readFailure('changed'), ...options }: GetJsonOptions,
): Promise<Readonly<{ ok: true; body: unknown }> | ReadFailure> => {
  const read = await getText(
    url,
    { accept: 'application/json', ...headers },
    options,
  );
  if (!read.ok) {
    return read;
  }
  const body = parseJson(read.text);
  return body === undefined ? notJson(read.text) : { body, ok: true };
};
