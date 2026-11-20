import type { DidYouKnowFact } from '@tvseri.es/schemas';
import { formatGrouped, isOver, plural } from '@tvseri.es/utils';
import { DAY_MONTH_YEAR_PATTERN } from '@/lib/format/date';

import { formatDay } from '@/lib/format/datePattern';

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
];

/** 2 → "two", 13 → "13", 1234 → "1,234" */
const inWords = (count: number) => WORDS[count] ?? formatGrouped(count);

/** At the start of a sentence: 2 → "Two", 13 → "13" */
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The word alone: "hour", "hours" */
const noun = (count: number, one: string, many = `${one}s`) =>
  count === 1 ? one : many;

/** Past tense once nothing is left to air (a cancelled show may still air) */
const hasFinished = (fact: DidYouKnowFact) => isOver(fact.series);

/** "last" once it has finished, "latest" while it runs */
const lastOrLatest = (fact: DidYouKnowFact) =>
  hasFinished(fact) ? 'last' : 'latest';

/** "Jan 10, 1999" */
const day = (date: string) =>
  formatDay(date.slice(0, 10), DAY_MONTH_YEAR_PATTERN);

/** 48 → "two days", 30 → "a day", 20 → "20 hours" */
function spanOfLife(hours: number): string {
  if (hours < 24) {
    return plural(hours, 'hour');
  }
  const days = Math.round(hours / 24);
  return days === 1 ? 'a day' : `${inWords(days)} days`;
}

/** One episode a night: 12 → "12 nights", 30 → "about a month" */
function nightsSpan(nights: number): string {
  if (nights < 14) {
    return plural(nights, 'night');
  }
  const weeks = Math.round(nights / 7);
  if (weeks === 4) {
    return 'about a month';
  }
  if (weeks < 7) {
    return `about ${inWords(weeks)} weeks`;
  }
  const months = Math.round(nights / 30.4);
  if (months < 12) {
    return `about ${inWords(months)} months`;
  }
  const years = Math.round(nights / 365);
  return years === 1 ? 'about a year' : `about ${inWords(years)} years`;
}

/** "nine seasons", "one season" */
const seasonsOf = (fact: DidYouKnowFact) =>
  `${inWords(fact.series.numberOfSeasons)} ${noun(fact.series.numberOfSeasons, 'season')}`;

/** Minutes per episode: the last episode's, else from the total */
const runtimeOf = (fact: DidYouKnowFact) =>
  fact.series.lastEpisodeToAir?.runtime ||
  Math.round((fact.value * 60) / Math.max(1, fact.series.numberOfEpisodes));

const hasDates = (fact: DidYouKnowFact) =>
  Boolean(fact.series.firstAirDate && fact.series.lastAirDate);

/** Runs of more than one episode: "back to back", "first to last" */
const hasEpisodes = (fact: DidYouKnowFact) => fact.series.numberOfEpisodes >= 2;

const hasSeasons = (fact: DidYouKnowFact) => fact.series.numberOfSeasons >= 2;

type Phrasing = Readonly<{
  /** False when the fact lacks what the sentence needs */
  fits: (fact: DidYouKnowFact) => boolean;
  /** Unique across all types: neighbours never share one */
  id: string;
  text: (fact: DidYouKnowFact) => string;
}>;

const always = () => true;

const HOURS: ReadonlyArray<Phrasing> = [
  {
    fits: hasEpisodes,
    id: 'hours-back-to-back',
    text: (fact) =>
      `${fact.series.title} is ${plural(fact.series.numberOfEpisodes, 'episode')} of about ${formatGrouped(runtimeOf(fact))} minutes. Watch it back to back and it is ${spanOfLife(fact.value)} of your life.`,
  },
  {
    // Under a day the span would repeat the hours
    fits: (fact) => hasEpisodes(fact) && fact.value >= 24,
    id: 'hours-add-up',
    text: (fact) =>
      `All ${formatGrouped(fact.series.numberOfEpisodes)} episodes of ${fact.series.title} add up to ${plural(fact.value, 'hour')}: ${spanOfLife(fact.value)} without a break.`,
  },
  {
    fits: hasEpisodes,
    id: 'hours-per-episode',
    text: (fact) =>
      `At about ${formatGrouped(runtimeOf(fact))} minutes an episode, ${fact.series.title} takes ${plural(fact.value, 'hour')} from the first episode to the ${lastOrLatest(fact)}.`,
  },
  {
    fits: hasEpisodes,
    id: 'hours-a-night',
    text: (fact) =>
      `One episode a night, and ${fact.series.title} lasts ${nightsSpan(fact.series.numberOfEpisodes)}.`,
  },
  {
    // Only when no other fits (a single episode)
    fits: (fact) => !hasEpisodes(fact),
    id: 'hours-plain',
    text: (fact) =>
      `${fact.series.title} runs for about ${plural(fact.value, 'hour')} in all.`,
  },
];

const EPISODES: ReadonlyArray<Phrasing> = [
  {
    fits: always,
    id: 'episodes-ran',
    text: (fact) => {
      const { numberOfSeasons, title } = fact.series;
      const episodes = plural(fact.value, 'episode');
      const run =
        numberOfSeasons > 0 ? `${seasonsOf(fact)} and ${episodes}` : episodes;
      return hasFinished(fact)
        ? `${title} ran ${run}.`
        : `${title} has run ${run} so far.`;
    },
  },
  {
    fits: hasSeasons,
    id: 'episodes-across',
    text: (fact) =>
      `${capital(plural(fact.value, 'episode'))} across ${seasonsOf(fact)}: ${fact.series.title} from start to ${hasFinished(fact) ? 'finish' : 'now'}.`,
  },
  {
    fits: hasSeasons,
    id: 'episodes-average',
    text: (fact) => {
      const average = Math.round(fact.value / fact.series.numberOfSeasons);
      return `${fact.series.title} ${hasFinished(fact) ? 'averaged' : 'averages'} ${plural(average, 'episode')} a season over ${seasonsOf(fact)}.`;
    },
  },
];

const YEARS: ReadonlyArray<Phrasing> = [
  {
    fits: hasDates,
    id: 'years-story',
    text: (fact) => {
      const { firstAirDate, lastAirDate, numberOfEpisodes, title } =
        fact.series;
      return `${title} took from ${day(firstAirDate)} to ${day(lastAirDate)} to tell its story: ${plural(numberOfEpisodes, 'episode')}, ${seasonsOf(fact)}.`;
    },
  },
  {
    fits: hasDates,
    id: 'years-later',
    text: (fact) => {
      const later =
        fact.value === 1 ? 'a year' : `${inWords(fact.value)} years`;
      return `${fact.series.title} first aired on ${day(fact.series.firstAirDate)}. Its ${lastOrLatest(fact)} episode came ${later} later.`;
    },
  },
  {
    fits: hasEpisodes,
    id: 'years-separate',
    text: (fact) =>
      `${capital(inWords(fact.value))} ${noun(fact.value, 'year separates', 'years separate')} the first and ${lastOrLatest(fact)} episode of ${fact.series.title}.`,
  },
  {
    // Only when no other fits (no dates, one episode)
    fits: (fact) => !hasDates(fact) && !hasEpisodes(fact),
    id: 'years-plain',
    text: (fact) =>
      `${fact.series.title} was on air for ${plural(fact.value, 'year')}.`,
  },
];

const PHRASINGS: Readonly<
  Record<DidYouKnowFact['type'], ReadonlyArray<Phrasing>>
> = { episodes: EPISODES, hours: HOURS, years: YEARS };

const UNIT: Readonly<
  Record<DidYouKnowFact['type'], (value: number) => string>
> = {
  episodes: (value) => noun(value, 'episode'),
  hours: (value) => noun(value, 'hour'),
  years: (value) => `${noun(value, 'year')} on air`,
};

/**
 * The phrasing for each fact in the deck. Deterministic (the server and the
 * client agree, a reload reads the same): each fact starts from its series
 * id and place in the deck, then steps past phrasings the deck already used,
 * and never takes its neighbours' ("Another" wraps, so the last fact's
 * neighbour is the first).
 */
export function pickPhrasings(
  facts: ReadonlyArray<DidYouKnowFact>,
): ReadonlyArray<Phrasing> {
  const picked: Phrasing[] = [];
  facts.forEach((fact, index) => {
    const fitting = PHRASINGS[fact.type].filter((p) => p.fits(fact));
    const options = fitting.length > 0 ? fitting : PHRASINGS[fact.type];
    const start = (fact.series.id + index) % options.length;
    const neighbours = new Set([picked[index - 1]?.id]);
    if (index > 0 && index === facts.length - 1) {
      neighbours.add(picked[0]?.id);
    }
    const used = new Set(picked.map((one) => one.id));
    const inTurn = Array.from(
      { length: options.length },
      (_, step) => options[(start + step) % options.length]!,
    );
    // Not used yet in this deck; else at least not beside its neighbours
    const choice =
      inTurn.find((option) => !used.has(option.id)) ??
      inTurn.find((option) => !neighbours.has(option.id)) ??
      inTurn[0]!;
    picked.push(choice);
  });
  return picked;
}

export type FactCopy = Readonly<{
  /** the big number, grouped: "1,234" */
  value: string;
  /** under the big number: "hours", "episodes", "years on air" */
  unit: string;
  /** the sentence beside it */
  text: string;
}>;

/** What each fact in the deck says */
export function deckCopy(
  facts: ReadonlyArray<DidYouKnowFact>,
): ReadonlyArray<FactCopy> {
  const phrasings = pickPhrasings(facts);
  return facts.map((fact, index) => ({
    text: phrasings[index]!.text(fact),
    unit: UNIT[fact.type](fact.value),
    value: formatGrouped(fact.value),
  }));
}
