import type { EpisodeWithCredits, Person } from '@tvseri.es/schemas';

/** A face or a name | character line in the modal. */
export type CreditPerson = Readonly<{
  id: number;
  name: string;
  /** The role played; '' for crew. */
  character: string;
  /** '' when there's no photo. */
  image: string;
}>;

/** One crew credit in the roll: "Directed by" over its names. */
export type CrewBlock = Readonly<{
  role: string;
  people: ReadonlyArray<Pick<CreditPerson, 'id' | 'name'>>;
}>;

/**
 * What `GET /api/series/:id/season/:s/episode/:e` sends the modal: the
 * episode's guest stars, the show's regulars ("Starring") and the crew the
 * board's roll names, nothing else.
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

/** The board draws the show's main cast (seven regulars on The Bear). */
const MAX_STARRING = 8;

const toPerson = (
  person: Readonly<{
    id: number;
    name: string;
    character: string;
    image: string;
  }>,
): CreditPerson => ({
  character: person.character,
  id: person.id,
  image: person.image,
  name: person.name,
});

/** Trims an episode's credits and the show's cast to the modal's view. */
export function toEpisodeModalCredits(
  episode: Pick<EpisodeWithCredits, 'credits'>,
  cast: ReadonlyArray<Person>,
): EpisodeModalCredits {
  const crew = CREW_ROLES.flatMap(({ jobs, role }) => {
    const byId = new Map<number, Pick<CreditPerson, 'id' | 'name'>>();
    for (const { id, job, name } of episode.credits.crew) {
      if (jobs.includes(job) && !byId.has(id)) {
        byId.set(id, { id, name });
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

/** The board's big faces: up to ten guest stars with a photo. */
export const guestFaces = (credits: EpisodeModalCredits) =>
  credits.guestStars.filter((person) => person.image).slice(0, 10);

/** The show's regulars with a photo, for the smaller "Starring" faces. */
export const starringFaces = (credits: EpisodeModalCredits) =>
  credits.starring.filter((person) => person.image);
