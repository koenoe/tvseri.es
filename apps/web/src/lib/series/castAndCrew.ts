import type { CrewCredit, Person } from '@tvseri.es/schemas';
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

/** What a face needs of anyone: cast, creator or crew */
type Face = Pick<Person, 'id' | 'image' | 'name' | 'slug'>;

type Credit = Face & Pick<Person, 'character'>;

const CREATOR_ROLE = 'Creator';

const toPerson = (person: Face, role: string): CastCrewPerson => ({
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

/** One of the sheet's crew sections, under its IMDb-style name */
export type CrewSection = Readonly<{
  people: ReadonlyArray<CastCrewPerson>;
  title: string;
}>;

/** The cast & crew sheet: the cast, then the crew in sections */
export type CastAndCrew = Readonly<{
  cast: ReadonlyArray<CastCrewPerson>;
  crew: ReadonlyArray<CrewSection>;
}>;

/** IMDb's full-credits order; a section without anyone is left out */
const CREW_SECTIONS = [
  'Created by',
  'Directed by',
  'Written by',
  'Produced by',
  'Music by',
  'Cinematography',
  'Editing',
  'Casting',
  'Art',
  'Costume & make-up',
  'Visual effects',
  'Sound',
  'Camera',
  'Lighting',
  'Crew',
] as const;

type CrewSectionTitle = (typeof CREW_SECTIONS)[number];

/** TMDB departments that are one section whole */
const DEPARTMENT_SECTIONS: Readonly<Record<string, CrewSectionTitle>> = {
  Art: 'Art',
  'Costume & Make-Up': 'Costume & make-up',
  Directing: 'Directed by',
  Editing: 'Editing',
  Lighting: 'Lighting',
  'Visual Effects': 'Visual effects',
  Writing: 'Written by',
};

const MUSIC_JOB = /music|composer|theme song|\bsongs?\b/i;
const CASTING_JOB = /casting/i;
const CINEMATOGRAPHY_JOBS = new Set([
  'Cinematography',
  'Director of Photography',
]);

/**
 * A job's section: by its department, except where IMDb splits one (the
 * composers out of Sound, the cinematographers out of Camera, casting out of
 * Production). Anything unrecognised is Crew.
 */
export function crewSectionOf(
  department: string,
  job: string,
): CrewSectionTitle {
  switch (department) {
    case 'Production':
      return CASTING_JOB.test(job) ? 'Casting' : 'Produced by';
    case 'Sound':
      return MUSIC_JOB.test(job) ? 'Music by' : 'Sound';
    case 'Camera':
      return CINEMATOGRAPHY_JOBS.has(job) ? 'Cinematography' : 'Camera';
    default:
      return DEPARTMENT_SECTIONS[department] ?? 'Crew';
  }
}

type CrewJob = CrewCredit['jobs'][number];

/** A person's credit in one section */
type SectionCredit = Readonly<{
  episodes: number;
  jobs: ReadonlyArray<CrewJob>;
  person: CrewCredit;
}>;

/**
 * " · 12 episodes", or nothing when TMDB doesn't say. Several jobs, or
 * several departments' rows, in one section can be the same episodes: the
 * section takes the largest count, never a sum that could outnumber the show.
 */
const episodesSuffix = (episodes: number) =>
  episodes > 0 ? ` · ${plural(episodes, 'episode')}` : '';

/** "Executive Producer, Writer · 12 episodes": the busiest job first */
function sectionRole(credit: SectionCredit): string {
  const busiestFirst = [...credit.jobs].sort((a, b) => b.episodes - a.episodes);
  const jobs = [...new Set(busiestFirst.map(({ job }) => job))];
  return `${jobs.join(', ')}${episodesSuffix(credit.episodes)}`;
}

/** Busiest first, then by name */
const byEpisodesThenName = (a: SectionCredit, b: SectionCredit) =>
  b.episodes - a.episodes || a.person.name.localeCompare(b.person.name);

/**
 * A crew row's jobs by the section each belongs to; a row without a job is
 * still listed, in its department's section
 */
function jobsBySection(
  person: CrewCredit,
): Map<CrewSectionTitle, ReadonlyArray<CrewJob>> {
  const sections = new Map<CrewSectionTitle, ReadonlyArray<CrewJob>>();
  if (person.jobs.length === 0) {
    sections.set(crewSectionOf(person.department, ''), []);
  }
  for (const job of person.jobs) {
    const title = crewSectionOf(person.department, job.job);
    sections.set(title, [...(sections.get(title) ?? []), job]);
  }
  return sections;
}

/** Each section's credits, a person once per section */
function creditsBySection(
  crew: ReadonlyArray<CrewCredit>,
): Map<CrewSectionTitle, Map<number, SectionCredit>> {
  const sections = new Map<CrewSectionTitle, Map<number, SectionCredit>>();
  for (const person of crew) {
    const byTitle = jobsBySection(person);
    for (const [title, jobs] of byTitle) {
      // A row whole in one section: TMDB's total counts its episodes once
      const episodes =
        byTitle.size === 1 && person.numberOfEpisodes > 0
          ? person.numberOfEpisodes
          : Math.max(0, ...jobs.map((job) => job.episodes));
      const section = sections.get(title) ?? new Map<number, SectionCredit>();
      const earlier = section.get(person.id);
      section.set(person.id, {
        episodes: Math.max(earlier?.episodes ?? 0, episodes),
        jobs: [...(earlier?.jobs ?? []), ...jobs],
        person,
      });
      sections.set(title, section);
    }
  }
  return sections;
}

/**
 * The crew in IMDb's sections, the creators first in their own order.
 * Someone with several jobs in a section is listed once, their jobs joined;
 * someone in several sections (a creator who directs) is in each.
 */
export function toCrewSections(
  creators: ReadonlyArray<Face>,
  crew: ReadonlyArray<CrewCredit>,
): ReadonlyArray<CrewSection> {
  const sections = creditsBySection(crew);
  const peopleOf = (title: CrewSectionTitle) =>
    title === 'Created by'
      ? creators.map((creator) => toPerson(creator, CREATOR_ROLE))
      : [...(sections.get(title)?.values() ?? [])]
          .sort(byEpisodesThenName)
          .map((credit) => toPerson(credit.person, sectionRole(credit)));
  return CREW_SECTIONS.map((title) => ({
    people: peopleOf(title),
    title,
  })).filter((section) => section.people.length > 0);
}

/**
 * The sheet's sections: the whole cast in billing order, then the crew. A
 * creator who also acts is in both, so the Cast section always matches the
 * cast counts the page shows.
 */
export const toCastAndCrew = (
  creators: ReadonlyArray<Face>,
  cast: ReadonlyArray<Credit>,
  crew: ReadonlyArray<CrewCredit>,
): CastAndCrew => ({
  cast: cast.map(toCastPerson),
  crew: toCrewSections(creators, crew),
});

/** Everyone the sheet lists, each person once however many roles they have */
export const countPeople = (
  ...groups: ReadonlyArray<ReadonlyArray<Pick<Credit, 'id'>>>
): number => new Set(groups.flat().map((person) => person.id)).size;

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

/** A cast face link's name: "Ayo Edebiri as Sydney Adamu" */
export const faceLabel = (person: CastCrewPerson): string =>
  person.role ? `${person.name} as ${person.role}` : person.name;

/** A crew row's name: "Christopher Storer, creator", "Joanna Calo, Director · 3 episodes" */
export function crewLabel(person: CastCrewPerson): string {
  if (person.role === CREATOR_ROLE) {
    return `${person.name}, creator`;
  }
  return person.role ? `${person.name}, ${person.role}` : person.name;
}
