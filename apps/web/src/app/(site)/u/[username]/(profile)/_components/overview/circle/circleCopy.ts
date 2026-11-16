import type { CirclePerson, CirclePick, TasteLevel } from '@tvseri.es/schemas';

import { plural } from '@/lib/format/text';

const LEVEL_LABELS: Readonly<Record<TasteLevel, string>> = {
  high: 'High',
  low: 'Low',
  medium: 'Medium',
  super: 'Super',
  'very-high': 'Very high',
  'very-low': 'Very low',
};

/** "Super", "Very high"; null while the match has no level yet (under 5 shared shows) */
export function levelLabel(level: TasteLevel | null): string | null {
  return level ? LEVEL_LABELS[level] : null;
}

/** The two top levels are "your closest matches" */
const isClose = (person: CirclePerson) =>
  person.level === 'super' || person.level === 'very-high';

type ReasonPick = Pick<CirclePick, 'doorGenre' | 'kind' | 'people'>;

/**
 * The card's line under the meta (From your circle): why this show.
 * "A favourite of your closest match.", "Both your closest matches finished
 * it.", "ivo’s door to anime." Names stand in where the people are not
 * close matches, so the line never claims more than the match says.
 */
export function pickReason({ doorGenre, kind, people }: ReasonPick): string {
  const [first, second] = people;
  if (!first) {
    return kind === 'favourite'
      ? 'A favourite in your circle.'
      : 'Finished by people in your circle.';
  }
  if (doorGenre) {
    return `${first.username}’s door to ${doorGenre.toLowerCase()}.`;
  }
  if (!second) {
    if (kind === 'favourite') {
      return isClose(first)
        ? 'A favourite of your closest match.'
        : `A favourite of ${first.username}.`;
    }
    return isClose(first)
      ? 'Your closest match finished it.'
      : `${first.username} finished it.`;
  }
  const both = isClose(first) && isClose(second);
  if (kind === 'favourite') {
    return both
      ? 'A favourite of both your closest matches.'
      : `A favourite of ${first.username} and ${second.username}.`;
  }
  return both
    ? 'Both your closest matches finished it.'
    : `${first.username} and ${second.username} finished it.`;
}

/** "3 seasons, 26 episodes" (the pick's second fact) */
export function seasonsAndEpisodes(
  seasons: number,
  episodes: number,
): string | null {
  const parts = [
    seasons > 0 ? plural(seasons, 'season') : null,
    episodes > 0 ? plural(episodes, 'episode') : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(', ') : null;
}

/** The match chip's accessible name: "juno, Super match" */
export function personLabel(person: CirclePerson): string {
  const level = levelLabel(person.level);
  return level ? `${person.username}, ${level} match` : person.username;
}
