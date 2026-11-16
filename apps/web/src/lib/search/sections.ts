import type { MemberMatch } from '@tvseri.es/schemas';

import type { GridBlock } from '@/lib/grid/moveSelection';
import personPath from '@/lib/routing/personPath';
import profilePath from '@/lib/routing/profilePath';
import showPath from '@/lib/routing/showPath';

import type { SearchPersonView, SearchShow, SearchView } from './searchView';

/** The overlay's two layouts: the 672px panel, or full screen on a phone. */
export type SearchLayout = 'desktop' | 'phone';

/**
 * One option in the listbox: a poster, a face, a member or a recent chip.
 * A member has no TMDB id: their cell carries none.
 */
export type SearchCell = Readonly<{
  href: string;
  image: string;
  /** Unique across blocks: `show-1396`, `person-17419`, `member-juno` */
  key: string;
  /** People: “Breaking Bad, Isle of Dogs” */
  knownFor?: string;
  name: string;
  /** People: “Actor” */
  role?: string;
  /** Shows: the first air year */
  year?: string;
}> &
  (
    | Readonly<{ id: number; kind: 'person' | 'show' }>
    | Readonly<{ id?: never; kind: 'member' }>
  );

export type SearchSection = Readonly<{
  cells: ReadonlyArray<SearchCell>;
  kind: 'members' | 'people' | 'shows';
}>;

/** 8 posters (two rows of four); 6 on a phone (two rows of three). */
export const MAX_SHOWS: Readonly<Record<SearchLayout, number>> = {
  desktop: 8,
  phone: 6,
};

/** TMDB's `known_for_department`, as the person cell names the role. */
const ROLES: Readonly<Record<string, string>> = {
  Acting: 'Actor',
  Directing: 'Director',
  Editing: 'Editor',
  Production: 'Producer',
  Writing: 'Writer',
};

export function personRole(department: string | undefined): string {
  if (!department) {
    return '';
  }
  const role = ROLES[department] ?? department;
  return role.charAt(0) + role.slice(1).toLowerCase();
}

const showCell = (show: SearchShow): SearchCell => ({
  href: showPath(show.id, show.slug),
  id: show.id,
  image: show.posterImage,
  key: `show-${show.id}`,
  kind: 'show',
  name: show.title,
  year: show.releaseYear,
});

const personCell = (person: SearchPersonView): SearchCell => ({
  href: personPath(person.id, person.slug),
  id: person.id,
  image: person.image,
  key: `person-${person.id}`,
  kind: 'person',
  knownFor: person.knownFor.slice(0, 2).join(', '),
  name: person.name,
  role: personRole(person.knownForDepartment),
});

/** A member found by their exact handle: no face (members have none), the handle */
const memberCell = (member: MemberMatch): SearchCell => ({
  href: profilePath(member.username),
  image: '',
  key: `member-${member.username}`,
  kind: 'member',
  name: `@${member.username}`,
});

/**
 * The result blocks in the order the design draws them: the block holding the
 * best match (the API's `best`) comes first, so the first cell is always
 * what Enter opens; ties and unknowns go to the shows. An `@` query's answer
 * is a member found by their handle (`best: 'members'`), first. Empty blocks
 * are left out.
 */
export function buildSections(
  view: SearchView,
  layout: SearchLayout,
): ReadonlyArray<SearchSection> {
  const shows: SearchSection = {
    cells: view.series.slice(0, MAX_SHOWS[layout]).map(showCell),
    kind: 'shows',
  };
  const people: SearchSection = {
    cells: view.people.map(personCell),
    kind: 'people',
  };
  const members: SearchSection = {
    cells: (view.members ?? []).map(memberCell),
    kind: 'members',
  };
  const ordered =
    view.best === 'members'
      ? [members, shows, people]
      : view.best === 'people'
        ? [people, shows]
        : [shows, people];
  return ordered.filter((section) => section.cells.length > 0);
}

/**
 * Four columns on desktop; on a phone the people are one sideways strip and
 * the posters three across. Members are one row of chips, like the recents.
 */
export function gridOf(
  sections: ReadonlyArray<SearchSection>,
  layout: SearchLayout,
): ReadonlyArray<GridBlock> {
  return sections.map((section) => ({
    columns:
      section.kind === 'members'
        ? Number.POSITIVE_INFINITY
        : layout === 'desktop'
          ? 4
          : section.kind === 'people'
            ? Number.POSITIVE_INFINITY
            : 3,
    size: section.cells.length,
  }));
}
