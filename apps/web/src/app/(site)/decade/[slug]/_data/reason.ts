/**
 * The decade card's kicker and reason line, built from
 * the data only: the show's place by TMDB votes, its length and whether it
 * ended. Plain template sentences, never an invented fact.
 */

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
] as const;

const ORDINALS = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
] as const;

/** "eight" up to twenty, digits after */
const inWords = (value: number): string => WORDS[value] ?? String(value);

/** "Most rated of the decade", "Number 2 by attention" */
export function decadeKicker(rank: number): string {
  return rank === 1
    ? 'Most rated of the decade'
    : `Number ${rank} by attention`;
}

export type ReasonFacts = Readonly<{
  /** 1 = the decade's most-voted show on TMDB */
  rank: number;
  seasons: number;
  episodes: number;
  /** TMDB status, null when unknown */
  status: string | null;
  /** Nothing is left to air (a cancelled show may still air its last episodes) */
  over: boolean;
  lastAirYear: number | null;
}>;

/** "eight seasons", "five episodes" (one season), null when unknown */
function length({ episodes, seasons }: ReasonFacts): string | null {
  if (seasons > 1) {
    return `${inWords(seasons)} seasons`;
  }
  if (seasons === 1 && episodes > 0) {
    return `${inWords(episodes)} episode${episodes === 1 ? '' : 's'}`;
  }
  return null;
}

/** "finished in 2019", "still running", null when it says nothing */
function state({ lastAirYear, over, status }: ReasonFacts): string | null {
  if (over && lastAirYear) {
    return `finished in ${lastAirYear}`;
  }
  return status === 'Returning Series' ? 'still running' : null;
}

/**
 * "The most-rated show of the decade on TMDB: eight seasons, finished in
 * 2019." For the others their place: "The second most-rated show of the
 * decade on TMDB: three seasons, finished in 2021."
 */
export function decadeReason(facts: ReasonFacts): string {
  const place =
    facts.rank === 1
      ? 'The most-rated series'
      : `The ${ORDINALS[facts.rank] ?? `number ${facts.rank}`} most-rated series`;
  const details = [length(facts), state(facts)].filter(Boolean).join(', ');
  return `${place} of the decade on TMDB${details ? `: ${details}` : ''}.`;
}
