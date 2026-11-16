import type { PersonChild, PersonFamily } from '@tvseri.es/schemas';
import personPath from '@/lib/routing/personPath';

/**
 * The sidebar's family lines: "Married to Robin Dearden since
 * 1989" and "Daughter Taylor Dearden". Wikidata gives the data.
 */

/** The latest marriage: "since 1989" while it lasts, else its years. */
export function spouseLine(family: PersonFamily | null): string | undefined {
  const spouse = family?.spouses.at(-1);
  if (!spouse) {
    return undefined;
  }
  if (spouse.endYear) {
    const years = spouse.startYear
      ? `${spouse.startYear}–${spouse.endYear}`
      : `until ${spouse.endYear}`;
    return `Married to ${spouse.name}, ${years}`;
  }
  return spouse.startYear
    ? `Married to ${spouse.name} since ${spouse.startYear}`
    : `Married to ${spouse.name}`;
}

export type ChildLink = Readonly<{ name: string; href?: string }>;

export type ChildrenLine = Readonly<{
  /** "Daughter", "Sons", "Children" */
  label: string;
  people: ReadonlyArray<ChildLink>;
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
    people: children.map((child) => ({
      name: child.name,
      ...(child.tmdbId && {
        href: personPath(child.tmdbId, child.slug),
      }),
    })),
  };
}
