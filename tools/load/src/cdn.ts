/**
 * A small model of the API's CloudFront distribution (Origin Shield in one
 * Region): what decides how much traffic reaches the Lambdas.
 *
 * - The key is method + path + query (the real key adds `Origin`, which is
 *   one value for the web).
 * - `s-maxage` keeps an answer fresh; `stale-while-revalidate` serves it
 *   stale while ONE background request refreshes it; `stale-if-error`
 *   serves it stale when the origin answers a 5xx.
 * - Simultaneous misses on one key make one origin request (collapsing).
 * - A 5xx is kept 10 s (CloudFront's error caching minimum TTL).
 * - `private` / `no-store` answers pass through and never collapse.
 *
 * Not modelled: edge locations in front of the shield, eviction, `Origin`.
 */

export type OriginAnswer = Readonly<{
  body: string;
  cacheControl: string;
  status: number;
}>;

export type CdnOutcome = 'hit' | 'stale' | 'miss' | 'pass' | 'stale-if-error';

type Stored = OriginAnswer &
  Readonly<{ freshUntil: number; swrUntil: number; sieUntil: number }>;

const ERROR_TTL_MS = 10_000;

const directive = (cacheControl: string, name: string) => {
  const match = new RegExp(`(?:^|,)\\s*${name}=(\\d+)`).exec(cacheControl);
  return match ? Number(match[1]) * 1000 : 0;
};

const isPrivate = (cacheControl: string) =>
  /\b(private|no-store)\b/.test(cacheControl);

export const createCdn = (
  origin: (path: string, init: RequestInit) => Promise<OriginAnswer>,
  now: () => number,
) => {
  const store = new Map<string, Stored>();
  const inFlight = new Map<string, Promise<OriginAnswer>>();

  const save = (key: string, answer: OriginAnswer) => {
    const at = now();
    if (answer.status >= 500) {
      store.set(key, {
        ...answer,
        freshUntil: at + ERROR_TTL_MS,
        sieUntil: 0,
        swrUntil: 0,
      });
      return;
    }
    if (isPrivate(answer.cacheControl)) {
      return;
    }
    const fresh = directive(answer.cacheControl, 's-maxage');
    if (fresh === 0) {
      return;
    }
    store.set(key, {
      ...answer,
      freshUntil: at + fresh,
      sieUntil: at + fresh + directive(answer.cacheControl, 'stale-if-error'),
      swrUntil:
        at + fresh + directive(answer.cacheControl, 'stale-while-revalidate'),
    });
  };

  /** One origin request per key at a time; errors keep a usable copy */
  const fill = (key: string, path: string, init: RequestInit) => {
    const pending = inFlight.get(key);
    if (pending) {
      return pending;
    }
    const request = origin(path, init)
      .then((answer) => {
        const previous = store.get(key);
        // stale-if-error: keep the good copy instead of the error
        if (
          answer.status >= 500 &&
          previous &&
          previous.status < 500 &&
          previous.sieUntil > now()
        ) {
          return answer;
        }
        save(key, answer);
        return answer;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };

  const request = async (
    path: string,
    init: RequestInit = {},
  ): Promise<OriginAnswer & Readonly<{ outcome: CdnOutcome }>> => {
    const method = init.method ?? 'GET';
    const signedIn = new Headers(init.headers).has('authorization');
    if (method !== 'GET' || signedIn) {
      return { ...(await origin(path, init)), outcome: 'pass' };
    }

    const key = `${method} ${path}`;
    const at = now();
    const stored = store.get(key);
    if (stored && stored.freshUntil > at) {
      return { ...stored, outcome: 'hit' };
    }
    if (stored && stored.status < 500 && stored.swrUntil > at) {
      void fill(key, path, init).catch(() => undefined);
      return { ...stored, outcome: 'stale' };
    }

    const answer = await fill(key, path, init);
    if (answer.status >= 500 && stored && stored.status < 500) {
      if (stored.sieUntil > now()) {
        return { ...stored, outcome: 'stale-if-error' };
      }
    }
    if (isPrivate(answer.cacheControl)) {
      return { ...answer, outcome: 'pass' };
    }
    return { ...answer, outcome: 'miss' };
  };

  return { request, size: () => store.size };
};
