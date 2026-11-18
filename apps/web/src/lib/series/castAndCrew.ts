import type { Person } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';

/**
 * One face of a show's cast and crew, as the show page draws it: in the
 * desktop row, the phone stack and the cast & crew sheet. `role` is the
 * character, or "Creator".
 */
export type CastCrewPerson = Readonly<{
  id: number;
  image: string;
  name: string;
  role: string;
  slug: string;
}>;

type Credit = Pick<Person, 'character' | 'id' | 'image' | 'name' | 'slug'>;

const CREATOR_ROLE = 'Creator';

const toPerson = (person: Credit, role: string): CastCrewPerson => ({
  id: person.id,
  image: person.image,
  name: person.name,
  role,
  slug: person.slug,
});

/** A cast member as a face: the role is the character */
export const toCastPerson = (person: Credit): CastCrewPerson =>
  toPerson(person, person.character);

/** The phone stack's faces before its "+N" */
const STACK_SIZE = 5;

/**
 * The phone stack's faces: the first five of the cast with a photo, so the
 * stack never draws an empty ring. Those skipped still count in its "+N".
 */
export const toCastStack = (
  cast: ReadonlyArray<Credit>,
): ReadonlyArray<CastCrewPerson> =>
  cast
    .filter((person) => person.image)
    .slice(0, STACK_SIZE)
    .map(toCastPerson);

/** The cast & crew sheet's two sections */
export type CastAndCrew = Readonly<{
  cast: ReadonlyArray<CastCrewPerson>;
  crew: ReadonlyArray<CastCrewPerson>;
}>;

/**
 * The sheet's sections: the whole cast in billing order, then the creators.
 * A creator who also acts is in both, so the Cast section always matches the
 * cast counts the page shows.
 */
export const toCastAndCrew = (
  creators: ReadonlyArray<Credit>,
  cast: ReadonlyArray<Credit>,
): CastAndCrew => ({
  cast: cast.map(toCastPerson),
  crew: creators.map((creator) => toPerson(creator, CREATOR_ROLE)),
});

/** Everyone the sheet lists, each person once however many roles they have */
export const countPeople = (
  creators: ReadonlyArray<Pick<Credit, 'id'>>,
  cast: ReadonlyArray<Pick<Credit, 'id'>>,
): number => new Set([...creators, ...cast].map((person) => person.id)).size;

/**
 * The phone stack's line: the first two of the cast and how many more
 * ("Jeremy Allen White", ", Ayo Edebiri", " and 18 more"). `castCount`
 * counts the whole cast, not only the names given.
 */
export function stackLine(
  cast: ReadonlyArray<Pick<CastCrewPerson, 'name'>>,
  castCount: number,
): Readonly<{ first: string; rest: string }> {
  const [first, second] = cast;
  if (!first || !second) {
    return { first: first?.name ?? '', rest: '' };
  }
  const more = castCount - 2;
  if (more <= 0) {
    return { first: first.name, rest: ` and ${second.name}` };
  }
  return { first: first.name, rest: `, ${second.name} and ${more} more` };
}

/** "21 people", "1 person", "1,204 people" */
export const peopleCount = (total: number): string =>
  plural(total, 'person', 'people');

/** A face link's name: "Ayo Edebiri as Sydney Adamu", "Christopher Storer, creator" */
export function faceLabel(person: CastCrewPerson): string {
  if (person.role === CREATOR_ROLE) {
    return `${person.name}, creator`;
  }
  return person.role ? `${person.name} as ${person.role}` : person.name;
}
