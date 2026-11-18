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

/**
 * Everyone, in the order the sheet lists them: the creators first, then the
 * cast in billing order. A creator who also acts is listed once, as the
 * creator, so the count and the list always agree.
 */
export function toCastAndCrew(
  creators: ReadonlyArray<Credit>,
  cast: ReadonlyArray<Credit>,
): ReadonlyArray<CastCrewPerson> {
  const creatorIds = new Set(creators.map((creator) => creator.id));
  return [
    ...creators.map((creator) => toPerson(creator, CREATOR_ROLE)),
    ...cast.filter((person) => !creatorIds.has(person.id)).map(toCastPerson),
  ];
}

/**
 * The phone stack's line: the first name (a creator when the show has one),
 * the first of the cast, and how many more ("Christopher Storer", ", Jeremy
 * Allen White", " and 18 more"). `total` counts everyone, not only the
 * names given; a second creator waits in the count, not the line.
 */
export function stackLine(
  people: ReadonlyArray<CastCrewPerson>,
  total: number,
): Readonly<{ first: string; rest: string }> {
  const [first, ...others] = people;
  const second =
    others.find((person) => person.role !== CREATOR_ROLE) ?? others[0];
  if (!first || !second) {
    return { first: first?.name ?? '', rest: '' };
  }
  const more = total - 2;
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
