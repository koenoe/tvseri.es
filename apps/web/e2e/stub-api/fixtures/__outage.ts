import type { StubRequest, StubResponse, StubRoute } from '../types.ts';
import { USER_ID as LENA_ID } from './stats/user.ts';
import { routes as lena } from './stats.ts';
import { fail, ok } from './user-profile/http.ts';
import {
  isArtOutage,
  isOutageId,
  OUTAGE_READS,
  type OutageRead,
  outageFor,
  outageId,
} from './user-profile/outage.ts';
import { PEOPLE, publicUser } from './user-profile/people.ts';

/** Where `out-500-art`'s shows move to: `/series/:id` answers 503 above it */
const ART_DOWN_OFFSET = 900_000_000;

type Body = Record<string, unknown>;
const isBody = (value: unknown): value is Body =>
  typeof value === 'object' && value !== null;

/**
 * Lena's Stats with the shows that bring art (Finished, Biggest night and
 * the share card's top show) moved past `ART_DOWN_OFFSET`.
 */
function artDown(body: unknown): unknown {
  // lists (genres, services, popular) carry no show to move
  if (!isBody(body) || Array.isArray(body)) {
    return body;
  }
  const moveId = (show: unknown) =>
    isBody(show) && typeof show.id === 'number'
      ? { ...show, id: show.id + ART_DOWN_OFFSET }
      : show;
  const moveNight = (night: unknown) =>
    isBody(night) && Array.isArray(night.items)
      ? {
          ...night,
          items: night.items.map((item: unknown) =>
            isBody(item) && typeof item.seriesId === 'number'
              ? { ...item, seriesId: item.seriesId + ART_DOWN_OFFSET }
              : item,
          ),
        }
      : night;
  return {
    ...body,
    ...(Array.isArray(body.shows) ? { shows: body.shows.map(moveId) } : {}),
    ...('biggestNight' in body
      ? { biggestNight: moveNight(body.biggestNight) }
      : {}),
    ...(Array.isArray(body.otherNights)
      ? { otherNights: body.otherNights.map(moveNight) }
      : {}),
  };
}

/**
 * Outage profiles (`user-profile/outage.ts`): the name resolves like juno,
 * the one read it names fails. The file name sorts before `__profile.ts`, so
 * these answer first and pass every other read on.
 */
export const routes: StubRoute[] = [
  {
    handle: ({ params }) => {
      if (!params.username?.startsWith('out-')) {
        return undefined;
      }
      const id = outageId(params.username);
      // `out-<mode>-user`: the profile read itself fails (it carries no
      // token, so a spec can't switch it off for its own copy of the stub)
      return (
        outageFor(id, 'user') ??
        ok({
          ...publicUser(PEOPLE.juno),
          id,
          username: params.username,
        })
      );
    },
    path: '/user/by-username/:username',
  },
  ...(Object.entries(OUTAGE_READS) as Array<[OutageRead, string]>).map(
    ([read, path]): StubRoute => ({
      handle: ({ params }) =>
        // `/following/count` also matches `/following/:fid`: not a follow state
        isOutageId(params.id) && params.fid !== 'count'
          ? outageFor(params.id, read)
          : undefined,
      path,
    }),
  ),
  // an outage profile's Stats are lena's (every block has data): only the
  // read the name says (`stats`: Genres) fails, from the routes above
  ...lena
    .filter(
      (route) =>
        (route.method ?? 'GET') === 'GET' &&
        route.path.startsWith('/user/:id/stats'),
    )
    .map(
      (route): StubRoute => ({
        handle: async (request) => {
          if (!isOutageId(request.params.id)) {
            return undefined;
          }
          const response = await route.handle({
            ...request,
            params: { ...request.params, id: LENA_ID },
          });
          return isArtOutage(request.params.id) && response
            ? { ...response, body: artDown(response.body) }
            : response;
        },
        path: route.path,
      }),
    ),
  {
    handle: ({ params }) =>
      Number(params.id) > ART_DOWN_OFFSET
        ? fail(503, 'Service Unavailable')
        : undefined,
    path: '/series/:id',
  },
];

/**
 * A read a spec switched off for its own namespace (the stub loads a private
 * copy of this module per signed-in test, so the rules are that test's):
 * `POST /__stub/outage` with the viewer's token and a rule. Any request of
 * that test whose path contains `includes` (or is exactly `path`) then:
 * `500` answers an error at once, `hang` outlasts the web's fetch timeout,
 * `slow` answers as usual after `delayMs`, `answer` answers `body` (an
 * empty list...). `times` limits the rule to the first N matching requests
 * (a failure that heals on the next visit).
 */
type Rule = Readonly<{
  body?: unknown;
  delayMs?: number;
  includes?: string;
  mode: '500' | 'hang' | 'slow' | 'answer';
  path?: string;
  times?: number;
}>;

const rules: Array<{ rule: Rule; left: number }> = [];
const HANG_MS = 25_000;
const MODES = new Set(['500', 'hang', 'slow', 'answer']);

const isRule = (value: unknown): value is Rule => {
  if (typeof value !== 'object' || value === null || !('mode' in value)) {
    return false;
  }
  const rule = value as Record<string, unknown>;
  return (
    MODES.has(String(rule.mode)) &&
    (typeof rule.includes === 'string' || typeof rule.path === 'string')
  );
};

const matches = (rule: Rule, path: string) =>
  rule.path === undefined
    ? path.includes(rule.includes ?? '')
    : path === rule.path;

export const intercept = (
  request: StubRequest,
): StubResponse | Promise<StubResponse | undefined> | undefined => {
  if (request.path.startsWith('/__stub/')) {
    return undefined;
  }
  const entry = rules.find(
    (candidate) => candidate.left > 0 && matches(candidate.rule, request.path),
  );
  if (!entry) {
    return undefined;
  }
  entry.left -= 1;
  const { rule } = entry;
  const down = fail(503, 'Service Unavailable');
  switch (rule.mode) {
    case 'hang':
      return new Promise((resolve) => setTimeout(() => resolve(down), HANG_MS));
    case 'slow':
      // no answer after the wait: the usual route answers
      return new Promise((resolve) =>
        setTimeout(() => resolve(undefined), rule.delayMs ?? 3000),
      );
    case 'answer':
      // `delayMs`: the answer arrives late (a placeholder's moment on screen)
      return rule.delayMs
        ? new Promise((resolve) =>
            setTimeout(() => resolve(ok(rule.body ?? null)), rule.delayMs),
          )
        : ok(rule.body ?? null);
    default:
      return down;
  }
};

routes.push({
  handle: ({ body }) => {
    if (!isRule(body)) {
      return fail(400, 'Expected { includes | path, mode }');
    }
    rules.push({ left: body.times ?? Number.POSITIVE_INFINITY, rule: body });
    return ok({ message: 'OK' });
  },
  method: 'POST',
  path: '/__stub/outage',
});
