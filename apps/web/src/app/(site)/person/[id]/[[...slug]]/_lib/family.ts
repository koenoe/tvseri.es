import type {
  PersonChild,
  PersonFamily,
  PersonSpouse,
} from '@tvseri.es/schemas';
import personPath from '@/lib/routing/personPath';

/**
 * The sidebar's family lines: "Married to Robin Dearden since
 * 1989" and "Daughter Taylor Dearden". Wikidata gives the data.
 */

export type FamilyPerson = Readonly<{ name: string; href?: string }>;

/** Linked to their own page when TMDB knows them */
const familyPerson = ({
  name,
  slug,
  tmdbId,
}: PersonChild | PersonSpouse): FamilyPerson => ({
  name,
  ...(tmdbId && { href: personPath(tmdbId, slug) }),
});

export type SpouseLine = Readonly<{
  spouse: FamilyPerson;
  /** What follows the name: " since 1989", ", 1977–1982", or nothing */
  years: string;
}>;

/** The latest marriage: "since 1989" while it lasts, else its years. */
export function spouseLine(
  family: PersonFamily | null,
): SpouseLine | undefined {
  const spouse = family?.spouses.at(-1);
  if (!spouse) {
    return undefined;
  }
  const person = familyPerson(spouse);
  if (spouse.endYear) {
    const years = spouse.startYear
      ? `${spouse.startYear}–${spouse.endYear}`
      : `until ${spouse.endYear}`;
    return { spouse: person, years: `, ${years}` };
  }
  return {
    spouse: person,
    years: spouse.startYear ? ` since ${spouse.startYear}` : '',
  };
}

export type ChildrenLine = Readonly<{
  /** "Daughter", "Sons", "Children" */
  label: string;
  people: ReadonlyArray<FamilyPerson>;
}>;

const LABELS: Readonly<Record<PersonChild['relation'], [string, string]>> = {
  child: ['Child', 'Children'],
  daughter: ['Daughter', 'Daughters'],
  son: ['Son', 'Sons'],
};

/** The children, linked to their own page when TMDB knows them. */
export function childrenLine(
  family: PersonFamily | null,
): ChildrenLine | undefined {
  const children = family?.children ?? [];
  const first = children[0];
  if (!first) {
    return undefined;
  }
  const same = children.every((child) => child.relation === first.relation);
  const [one, many] = LABELS[same ? first.relation : 'child'];
  return {
    label: children.length === 1 ? one : many,
    people: children.map(familyPerson),
  };
}
