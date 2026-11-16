import type { WatchingNow } from '@tvseri.es/schemas';
import { watchingNow } from '@tvseri.es/utils';

import type { StubResponse } from '../../types.ts';
import { fail, ok } from './http.ts';
import type { PersonName } from './people.ts';
import { personById } from './people.ts';
import { entriesOf } from './pg-library.ts';

/** `include=watching` costs reads per row on the API: at most 24 rows a page */
const WATCHING_MAX_LIMIT = 24;

/**
 * `?include=watching` on `/user/:id/followers|following` (PG Final visitor
 * Circle): each row gains `watching` (their latest In progress show they
 * haven't hidden, or null). 400 for another `include` or `limit` above 24.
 */
export const withWatching = (
  query: URLSearchParams,
  page: Readonly<{ items: ReadonlyArray<Readonly<{ id: string }>> }>,
): StubResponse => {
  const include = query.get('include');
  if (include === null) {
    return ok(page);
  }
  const limit = Number.parseInt(query.get('limit') ?? '20', 10);
  if (include !== 'watching' || limit > WATCHING_MAX_LIMIT) {
    return fail(
      400,
      `include=watching takes limit up to ${WATCHING_MAX_LIMIT}`,
    );
  }
  return ok({
    ...page,
    items: page.items.map((item) => {
      const person = personById(item.id);
      const watching: WatchingNow | null = person
        ? watchingNow(entriesOf(person.user.username as PersonName))
        : null;
      return { ...item, watching };
    }),
  });
};
