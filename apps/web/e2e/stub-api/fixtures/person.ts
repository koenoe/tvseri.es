import type { StubRoute } from '../types.ts';
import type { StubPerson } from './person/build.ts';
import { calloway } from './person/calloway.ts';
import { cranston } from './person/cranston.ts';
import { linden } from './person/linden.ts';
import { platt } from './person/platt.ts';
import { reddick } from './person/reddick.ts';

/**
 * The person page's routes: `GET /person/:id` and its
 * `known-for`, `external-ids`, `shows`, `career`, `collaborators` and
 * `family-and-awards`, plus `GET /me/person/:id/watched`. Bodies are shaped
 * with `@tvseri.es/schemas` types and built the way the API builds them
 * (`apps/api/src/lib/person`); data lives in `person/`. Any other id answers
 * 404 on every route.
 *
 * - 17419 Bryan Cranston: living, upcoming work, 46 "Self" credits
 * - 129101 Lance Reddick: deceased, work released after his death
 * - 4242001 Wren Calloway: sparse, two guest roles and nothing else
 * - 4242002: an adult-flagged person (the page 404s)
 * - 4242003 Mara Linden: the family block at its usual count (3 lines on
 *   desktop, 2 below lg)
 * - 17485 Oliver Platt: a guest face of The Bear's S01E02 (the episode
 *   modal links it without a slug)
 */

const PEOPLE: ReadonlyMap<string, StubPerson> = new Map(
  [cranston, reddick, calloway, linden, platt].map((entry) => [
    String(entry.person.id),
    entry,
  ]),
);

const NOT_FOUND = { body: { message: 'Not Found' }, status: 404 } as const;

const route = (
  path: string,
  pick: (entry: StubPerson) => unknown,
): StubRoute => ({
  handle: ({ params }) => {
    const entry = PEOPLE.get(params.id ?? '');
    return entry ? { body: pick(entry) } : NOT_FOUND;
  },
  path,
});

/** An adult-flagged person: the page must 404 */
const ADULT_ID = '4242002';

export const routes: readonly StubRoute[] = [
  {
    handle: ({ params }) => {
      if (params.id === ADULT_ID) {
        return {
          body: {
            ...calloway.person,
            id: Number(ADULT_ID),
            isAdult: true,
            name: 'Adult Example',
            slug: 'adult-example',
          },
        };
      }
      const entry = PEOPLE.get(params.id ?? '');
      return entry ? { body: entry.person } : NOT_FOUND;
    },
    path: '/person/:id',
  },
  route('/person/:id/known-for', (entry) => entry.knownFor),
  route('/person/:id/external-ids', (entry) => entry.links),
  route('/person/:id/shows', (entry) => entry.shows),
  route('/person/:id/career', (entry) => entry.career),
  route('/person/:id/collaborators', (entry) => entry.collaborators),
  route('/person/:id/family-and-awards', (entry) => entry.familyAndAwards),
  {
    // Signed in only, like the API: 401 without a Bearer token
    handle: (request) => {
      if (!request.headers.authorization?.startsWith('Bearer ')) {
        return { body: { message: 'Unauthorized' }, status: 401 };
      }
      const entry = PEOPLE.get(request.params.id ?? '');
      return entry ? { body: entry.watched } : NOT_FOUND;
    },
    path: '/me/person/:id/watched',
  },
];
