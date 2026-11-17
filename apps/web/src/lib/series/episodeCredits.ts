import type { EpisodePerson, Person } from '@tvseri.es/schemas';

/** A face or a name | character line in the modal. */
export type CreditPerson = Readonly<{
  id: number;
  name: string;
  /** The role played; '' for crew. */
  character: string;
  /** '' when there's no photo. */
  image: string;
  /**
   * The person page's slug, so a link goes straight to the canonical URL:
   * without it the page redirects there in the stream, and the screen stays
   * empty until the redirect lands. Absent in an answer cached before it.
   */
  slug?: string;
}>;

/** One crew credit in the roll: "Directed by" over its names. */
export type CrewBlock = Readonly<{
  role: string;
  people: ReadonlyArray<Pick<CreditPerson, 'id' | 'name' | 'slug'>>;
}>;

/**
 * What `GET /api/series/:id/season/:s/episode/:e` sends the modal: the
 * episode's guest stars, the show's regulars ("Starring") and the crew the
 * credits roll names, nothing else.
 */
export type EpisodeModalCredits = Readonly<{
  guestStars: ReadonlyArray<CreditPerson>;
  starring: ReadonlyArray<CreditPerson>;
  crew: ReadonlyArray<CrewBlock>;
}>;

/** The crew blocks, in the order the modal draws them. */
const CREW_ROLES: ReadonlyArray<
  Readonly<{ role: string; jobs: ReadonlyArray<string> }>
> = [
  { jobs: ['Director'], role: 'Directed by' },
  {
    jobs: ['Writer', 'Teleplay', 'Screenplay', 'Story'],
    role: 'Written by',
  },
  { jobs: ['Director of Photography'], role: 'Director of photography' },
  { jobs: ['Editor'], role: 'Edited by' },
];

/** The show's main cast (seven regulars on The Bear). */
const MAX_STARRING = 8;

/** An episode's guest star or crew member, with the slug the route adds. */
export type SlugPerson = EpisodePerson & Readonly<{ slug: string }>;

const toPerson = (
  person: Readonly<{
    id: number;
    name: string;
    character: string;
    image: string;
    slug: string;
  }>,
): CreditPerson => ({
  character: person.character,
  id: person.id,
  image: person.image,
  name: person.name,
  slug: person.slug,
});

/** Trims an episode's credits and the show's cast to the modal's view. */
export function toEpisodeModalCredits(
  episode: Readonly<{
    credits: Readonly<{
      crew: ReadonlyArray<SlugPerson>;
      guestStars: ReadonlyArray<SlugPerson>;
    }>;
  }>,
  cast: ReadonlyArray<Person>,
): EpisodeModalCredits {
  const crew = CREW_ROLES.flatMap(({ jobs, role }) => {
    const byId = new Map<number, Pick<CreditPerson, 'id' | 'name' | 'slug'>>();
    for (const { id, job, name, slug } of episode.credits.crew) {
      if (jobs.includes(job) && !byId.has(id)) {
        byId.set(id, { id, name, slug });
      }
    }
    const people = [...byId.values()];
    return people.length > 0 ? [{ people, role }] : [];
  });
  return {
    crew,
    guestStars: episode.credits.guestStars.map(toPerson),
    starring: cast.slice(0, MAX_STARRING).map(toPerson),
  };
}

/** A block of the rolling credits: names, or name | character pairs. */
export type RollBlock = Readonly<
  | { kind: 'names'; role: string; people: CrewBlock['people'] }
  | { kind: 'pairs'; role: string; people: ReadonlyArray<CreditPerson> }
>;

/**
 * The roll's order: Directed by, Written by, Guest starring,
 * Starring, then the rest of the crew. Empty groups are left out.
 */
export function toRollBlocks(credits: EpisodeModalCredits): RollBlock[] {
  const names = (block: CrewBlock): RollBlock => ({ kind: 'names', ...block });
  const lead = credits.crew.filter(
    (block) => block.role === 'Directed by' || block.role === 'Written by',
  );
  const rest = credits.crew.filter((block) => !lead.includes(block));
  const pairs: RollBlock[] = [];
  if (credits.guestStars.length > 0) {
    pairs.push({
      kind: 'pairs',
      people: credits.guestStars,
      role: 'Guest starring',
    });
  }
  if (credits.starring.length > 0) {
    pairs.push({ kind: 'pairs', people: credits.starring, role: 'Starring' });
  }
  return [...lead.map(names), ...pairs, ...rest.map(names)];
}

/** The big faces: up to ten guest stars with a photo. */
export const guestFaces = (credits: EpisodeModalCredits) =>
  credits.guestStars.filter((person) => person.image).slice(0, 10);

/** The show's regulars with a photo, for the smaller "Starring" faces. */
export const starringFaces = (credits: EpisodeModalCredits) =>
  credits.starring.filter((person) => person.image);
