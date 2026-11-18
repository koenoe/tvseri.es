import type { Person, PersonShow } from '@tvseri.es/schemas';

import { sentenceCase } from '@/lib/format/text';

import { formatDay } from '@/lib/person/format';

export type FactIcon = 'calendar' | 'pin';

export type Fact = Readonly<{ icon: FactIcon; text: string }>;

export type LifeFacts = Readonly<{
  /** `1962 – 2023` under the name, only when the person has died */
  years?: string;
  facts: ReadonlyArray<Fact>;
}>;

/**
 * TMDB's place of birth without the region and country: "Hollywood, Los
 * Angeles, California, USA" → "Hollywood, Los Angeles".
 */
export function placeLabel(place?: string): string | undefined {
  const parts = (place ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.slice(0, 2).join(', ') : undefined;
}

/**
 * The sidebar's first facts. Living: "Born Mar 7,
 * 1956 (age 70)", then the place. Died: "Died Mar 17, 2023, aged 60", then
 * "Born Jun 7, 1962, Baltimore, Maryland", and the years under the name.
 */
export function lifeFacts(
  person: Pick<Person, 'age' | 'birthdate' | 'deathdate' | 'placeOfBirth'>,
): LifeFacts {
  const place = placeLabel(person.placeOfBirth);
  const born = person.birthdate ? formatDay(person.birthdate) : '';
  const died = person.deathdate ? formatDay(person.deathdate) : '';

  if (died) {
    const age = person.age && born ? `, aged ${person.age}` : '';
    const birth = [born && `Born ${born}`, place].filter(Boolean).join(', ');
    const birthYear = person.birthdate?.slice(0, 4);
    const deathYear = person.deathdate?.slice(0, 4);
    return {
      facts: [
        { icon: 'calendar', text: `Died ${died}${age}` },
        ...(birth ? [{ icon: 'pin' as const, text: birth }] : []),
      ],
      ...(birthYear && deathYear && { years: `${birthYear} – ${deathYear}` }),
    };
  }

  const age = person.age ? ` (age ${person.age})` : '';
  return {
    facts: [
      ...(born
        ? [{ icon: 'calendar' as const, text: `Born ${born}${age}` }]
        : []),
      ...(place ? [{ icon: 'pin' as const, text: place }] : []),
    ],
  };
}

const DEPARTMENTS: Readonly<Record<string, string>> = {
  Acting: 'actor',
  Creator: 'creator',
  Directing: 'director',
  Production: 'producer',
  Writing: 'writer',
};

const CREW_ORDER = ['director', 'producer', 'writer', 'creator'];

const JOBS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^director$/i, 'director'],
  [/producer/i, 'producer'],
  [/^creator$/i, 'creator'],
  [/writer|screenplay|teleplay|story|novel/i, 'writer'],
];

/** "Acting" → "Actor": the line before the credits are known. */
export function departmentLabel(department?: string): string | undefined {
  if (!department) {
    return undefined;
  }
  return sentenceCase(DEPARTMENTS[department] ?? department.toLowerCase());
}

/**
 * "Actor, director, producer": acting first when he has cast credits, then
 * his crew work in a fixed order (directing, producing, writing, creating),
 * at most three in all.
 */
export function occupationLabel(
  shows: ReadonlyArray<Pick<PersonShow, 'isCast' | 'jobs'>>,
  department?: string,
): string | undefined {
  const counts = new Map<string, number>();
  for (const show of shows) {
    const kinds = new Set<string>();
    for (const job of show.jobs) {
      const kind = JOBS.find(([pattern]) => pattern.test(job))?.[1];
      if (kind) {
        kinds.add(kind);
      }
    }
    for (const kind of kinds) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  const crew = CREW_ORDER.filter((kind) => counts.has(kind));
  const acts = shows.some((show) => show.isCast);
  const all = acts ? ['actor', ...crew] : crew;
  if (all.length === 0) {
    return departmentLabel(department);
  }
  return sentenceCase(all.slice(0, 3).join(', '));
}
