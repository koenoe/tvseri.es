import type { MemberMatch } from '@tvseri.es/schemas';

import type { StubRoute } from '../types.ts';
import { fail, ok, viewerIdOf } from './user-profile/http.ts';
import { personByUsername } from './user-profile/people.ts';

/**
 * `GET /me/member?username=` (search's exact-handle lookup) for the
 * profile stub's invented people: signed in only, exact handle only, the id
 * and the handle and nothing else. The web route has already dropped the
 * `@` and lowercased it.
 */
export const routes: readonly StubRoute[] = [
  {
    handle: (request) => {
      if (!viewerIdOf(request.headers)) {
        return fail(401, 'Authentication required');
      }
      const person = personByUsername(request.query.get('username') ?? '');
      return person
        ? ok({
            id: person.user.id,
            username: person.user.username,
          } satisfies MemberMatch)
        : fail(404, 'Not Found');
    },
    path: '/me/member',
  },
];
