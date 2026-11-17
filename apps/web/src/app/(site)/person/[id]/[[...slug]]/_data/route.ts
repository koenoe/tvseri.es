import type { Person } from '@tvseri.es/schemas';

import { isUnavailable } from '@/lib/cache/unavailable';
import type { EntitySpec } from '@/lib/routing/entityRoute';
import personPath from '@/lib/routing/personPath';

import { loadPerson, loadShows } from './loaders';

const personOf = async (id: number) => {
  const result = await loadPerson(id);
  if (isUnavailable(result)) {
    return result;
  }
  return result.status === 'ok' ? result.person : null;
};

/** How the person's metadata resolves the URL (`resolveEntityRoute`) */
export const PERSON_ROUTE: EntitySpec<Person> = {
  entity: (person) => person,
  load: personOf,
  toPath: personPath,
};

/**
 * The page's: the credits come with the person (the same cached read Known
 * for, Career and Shows use), so a person without TV credits gets no
 * placeholders for the sections that would stay empty.
 */
export const PERSON_PAGE_ROUTE: EntitySpec<
  Readonly<{ person: Person; shows: Awaited<ReturnType<typeof loadShows>> }>
> = {
  entity: ({ person }) => person,
  load: async (id) => {
    const [person, shows] = await Promise.all([personOf(id), loadShows(id)]);
    return person === null || isUnavailable(person)
      ? person
      : { person, shows };
  },
  toPath: personPath,
};
