import type { ThemeLandingFacts } from '@tvseri.es/schemas';
import { ratingText } from '@/lib/format/rating';
import { formatGrouped } from '@/lib/formatCount';

/**
 * A theme's name inside a sentence: its first letter lower case ("time
 * travel", "robots and AI"), unless its first word is an abbreviation
 * ("LGBTQ+").
 */
export function themeLower(name: string): string {
  const [first = ''] = name.split(' ');
  return first.length > 1 && first === first.toUpperCase()
    ? name
    : `${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/**
 * The series of a theme named in the plural (people, creatures), where
 * "{name} series" would not read: the singular, as a modifier.
 */
const SERIES: Readonly<Record<string, string>> = {
  aliens: 'alien series',
  'alternate-realities': 'alternate reality series',
  detectives: 'detective series',
  ghosts: 'ghost series',
  monsters: 'monster series',
  'robots-and-ai': 'robot and AI series',
  'serial-killers': 'serial killer series',
  'set-in-the-1980s': 'series set in the 1980s',
  spies: 'spy series',
  superheroes: 'superhero series',
  vampires: 'vampire series',
  zombies: 'zombie series',
};

/** A subgenre named as a kind of show already ("Dark comedies") */
const SHOW_KIND = /(?:comedies|dramas|thrillers|mysteries)$/;

/**
 * A theme's series as a noun: "time travel series", "detective series",
 * "dark comedies" (the kind of show is the name).
 */
export function themeSeries(slug: string, name: string): string {
  const lower = themeLower(name);
  return SERIES[slug] ?? (SHOW_KIND.test(lower) ? lower : `${lower} series`);
}

/** A best row that reads better as a plural noun ("The best dystopias") */
const PLURALS: Readonly<Record<string, string>> = { dystopia: 'dystopias' };

/** "The best dystopias", "The best time travel series", "The best dark comedies" */
export function bestTitle(slug: string, name: string): string {
  return `The best ${PLURALS[slug] ?? themeSeries(slug, name)}`;
}

/** "Mostly Sci-Fi & Fantasy, Drama" (the theme's top genres); null without any */
export function mostlyLine(facts: ThemeLandingFacts): string | null {
  const names = facts.topGenres.map((genre) => genre.name);
  return names.length > 0 ? `Mostly ${names.join(', ')}` : null;
}

export type SpotlightKind = 'anthology' | 'best' | 'miniseries';

type Candidate = Readonly<{ id: number; voteAverage: number }>;

/**
 * The "Start here": the theme's best-rated anthology or miniseries
 * (any episode, or one short run, is an easy way in), else its best-rated
 * show. Each list is already best-rated first.
 */
export function pickSpotlight<T extends Candidate>(
  lists: Readonly<{
    anthology: ReadonlyArray<T>;
    best: ReadonlyArray<T>;
    miniseries: ReadonlyArray<T>;
  }>,
): Readonly<{ kind: SpotlightKind; show: T }> | null {
  const [anthology] = lists.anthology;
  const [miniseries] = lists.miniseries;
  if (
    anthology &&
    (!miniseries || anthology.voteAverage >= miniseries.voteAverage)
  ) {
    return { kind: 'anthology', show: anthology };
  }
  if (miniseries) {
    return { kind: 'miniseries', show: miniseries };
  }
  const [best] = lists.best;
  return best ? { kind: 'best', show: best } : null;
}

/**
 * The spotlight's reason: a plain sentence built from the data (the design's
 * "Start with San Junipero" would be an invented fact).
 */
export function spotlightReason(
  kind: SpotlightKind,
  data: Readonly<{
    episodes: number | null;
    /** the theme's series (`themeSeries`): "dystopia series" */
    series: string;
    voteAverage: number;
    voteCount: number;
  }>,
): string {
  switch (kind) {
    case 'anthology':
      return 'An anthology: every episode stands alone, so any one is a way in.';
    case 'miniseries':
      return data.episodes
        ? `A miniseries: ${formatGrouped(data.episodes)} episodes, and then it ends.`
        : 'A miniseries: one season, and then it ends.';
    case 'best':
      return `The best-rated ${data.series} on TMDB: ${ratingText(
        data.voteAverage,
      )} from ${formatGrouped(data.voteCount)} votes.`;
  }
}
