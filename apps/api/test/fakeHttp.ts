/**
 * A fake for outbound HTTP (TMDB, OMDb, Wikidata...): tests register JSON
 * responses per URL; anything unregistered is a 404. Replaces global fetch.
 *
 * Upstream conditions (`setUpstreamConditions`) shape every answer on top of
 * the routes: latency, a rate limit (N a second per host, then 429 with
 * `Retry-After`) and an outage. Every request is logged with its time, so a
 * test (or the load rig in `tools/load`) can count calls per second and the
 * peak in flight.
 */
type Answer = Readonly<{ status: number; body: unknown }>;

type Route = {
  readonly match: (url: URL) => boolean;
  readonly respond: (url: URL) => Answer;
  /** The next this-many requests hang until their signal aborts */
  stalls: number;
  /** The next this-many requests answer with this status instead */
  failures: ReadonlyArray<number>;
};

type Outage = Readonly<{
  /** Every request answers this status (e.g. 429, 503) */
  status: number;
  /** Seconds for `Retry-After`; absent sends none */
  retryAfter?: number;
}>;

export type UpstreamConditions = Readonly<{
  /** How long each answer takes, ms (a function for a spread per request) */
  latencyMs?: number | ((url: URL) => number);
  /** Past this many requests in the last second (per host): 429 */
  rateLimit?: Readonly<{ perSecond: number; retryAfter?: number }>;
  /** Every request fails with a status, or hangs until aborted */
  outage?: Outage | 'hang';
}>;

type Logged = Readonly<{ at: number; url: URL }>;

const routes: Route[] = [];
const requests: Logged[] = [];
let conditions: UpstreamConditions = {};
let inFlight = 0;
let peakInFlight = 0;

/**
 * Registers a JSON response for a host + path (query ignored unless
 * `query` is given, then those params must match).
 */
export const onGet = (
  href: string,
  body: unknown,
  {
    exact = false,
    failFirst = [],
    query,
    stallFirst = 0,
    status = 200,
  }: Readonly<{
    /** The request has exactly these `query` params (the API key aside) */
    exact?: boolean;
    /** The first requests get these statuses (one each), then `body` */
    failFirst?: ReadonlyArray<number>;
    query?: Record<string, string>;
    /** The first this-many requests hang until aborted (a stalled connection) */
    stallFirst?: number;
    status?: number;
  }> = {},
) => {
  const target = new URL(href);
  routes.unshift({
    failures: failFirst,
    match: (url) =>
      url.host === target.host &&
      url.pathname === target.pathname &&
      Object.entries(query ?? {}).every(
        ([key, value]) => url.searchParams.get(key) === value,
      ) &&
      (!exact ||
        [...url.searchParams.keys()].every(
          (key) => key === 'api_key' || key in (query ?? {}),
        )),
    respond: () => ({ body, status }),
    stalls: stallFirst,
  });
};

/**
 * Registers a computed answer for every URL `match` accepts (the load rig's
 * synthetic upstream). Routes registered later win, as with `onGet`.
 */
export const onMatch = (
  match: (url: URL) => boolean,
  respond: (url: URL) => Answer,
) => {
  routes.unshift({ failures: [], match, respond, stalls: 0 });
};

/** Shorthand for TMDB v3 paths, e.g. onTmdb('/tv/1396', {...}) */
export const onTmdb = (
  path: string,
  body: unknown,
  options?: Parameters<typeof onGet>[2],
) => onGet(`https://api.themoviedb.org/3${path}`, body, options);

/** Sets the latency, rate limit and outage every request goes through */
export const setUpstreamConditions = (next: UpstreamConditions) => {
  conditions = next;
};

/** Every URL fetched since the last reset (to assert what a route did not call) */
export const requestedUrls = (): ReadonlyArray<URL> =>
  requests.map(({ url }) => url);

/**
 * Requests per whole second since the first one (index 0 = the first
 * second), optionally for one host: the shape a rate limit sees.
 */
export const callsPerSecond = (host?: string): ReadonlyArray<number> => {
  const times = requests
    .filter(({ url }) => !host || url.host === host)
    .map(({ at }) => at);
  const first = times[0];
  if (first === undefined) {
    return [];
  }
  const counts: number[] = [];
  for (const at of times) {
    const second = Math.floor((at - first) / 1000);
    counts[second] = (counts[second] ?? 0) + 1;
  }
  return Array.from(counts, (count) => count ?? 0);
};

/** The most requests that were open at once since the last reset */
export const peakRequestsInFlight = () => peakInFlight;

/** Forgets the requests so far (the routes stay) */
export const resetRequests = () => {
  requests.length = 0;
  peakInFlight = inFlight;
};

export const resetHttp = () => {
  routes.length = 0;
  requests.length = 0;
  conditions = {};
  inFlight = 0;
  peakInFlight = 0;
};

/** Hangs until `signal` aborts, then rejects with its reason, like fetch */
const hang = (signal: AbortSignal | null | undefined) =>
  new Promise<never>((_, reject) => {
    signal?.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });

/** Waits `ms`, or rejects when `signal` aborts first, like a slow fetch */
const wait = (ms: number, signal: AbortSignal | null | undefined) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

const json = (body: unknown, status: number, retryAfter?: number): Response =>
  new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      ...(retryAfter !== undefined && { 'retry-after': String(retryAfter) }),
    },
    status,
  });

/** Whether this request is past the host's rate limit (it is logged already) */
const isOverLimit = (url: URL, at: number) => {
  const limit = conditions.rateLimit;
  if (!limit) {
    return false;
  }
  let inLastSecond = 0;
  for (let index = requests.length - 1; index >= 0; index--) {
    const logged = requests[index] as Logged;
    if (at - logged.at >= 1000) {
      break;
    }
    if (logged.url.host === url.host) {
      inLastSecond++;
    }
  }
  return inLastSecond > limit.perSecond;
};

const answer = (url: URL, init: RequestInit | undefined, at: number) => {
  const { outage, rateLimit } = conditions;
  if (outage === 'hang') {
    return hang(init?.signal);
  }
  if (outage) {
    return json({ status_message: 'Outage' }, outage.status, outage.retryAfter);
  }
  if (isOverLimit(url, at)) {
    return json(
      {
        status_code: 25,
        status_message: 'Your request count is over the limit',
      },
      429,
      rateLimit?.retryAfter,
    );
  }

  const route = routes.find((candidate) => candidate.match(url));
  if (!route) {
    return json({ status_message: 'Not found' }, 404);
  }
  if (route.stalls > 0) {
    route.stalls--;
    return hang(init?.signal);
  }
  const [failure, ...failures] = route.failures;
  if (failure !== undefined) {
    route.failures = failures;
    return json({ status_message: 'Failed' }, failure);
  }
  const { body, status } = route.respond(url);
  return json(body, status);
};

export const fakeFetch = async (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const at = Date.now();
  requests.push({ at, url });
  inFlight++;
  peakInFlight = Math.max(peakInFlight, inFlight);
  try {
    const { latencyMs } = conditions;
    const delay =
      typeof latencyMs === 'function' ? latencyMs(url) : (latencyMs ?? 0);
    if (delay > 0) {
      await wait(delay, init?.signal);
    }
    return await answer(url, init, at);
  } finally {
    inFlight--;
  }
};
