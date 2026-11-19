import type { TvSeries } from '@tvseri.es/schemas';
import { isSeasonPremiere, plural } from '@tvseri.es/utils';
import { isValid, parseISO } from 'date-fns';
import { DAY_MONTH_PATTERN } from '@/lib/format/date';

import { formatLocalDate } from '@/lib/format/datePattern';
import { joinAnd } from '@/lib/text/fitNames';

/** The fields the hook line is built from (creators: only their names) */
export type HookSource = Pick<
  TvSeries,
  | 'creatorOf'
  | 'description'
  | 'nextEpisodeToAir'
  | 'numberOfEpisodes'
  | 'numberOfSeasons'
  | 'seasons'
  | 'status'
  | 'tagline'
  | 'topCast'
> &
  Readonly<{ createdBy: ReadonlyArray<Readonly<{ name: string }>> }>;

const MAX_LENGTH = 90;

/** Words whose full stop doesn't end a sentence: titles and initials */
const ABBREVIATION =
  /(?:^|\s)(?:[A-Z]|Capt|Col|Det|Dept|Dr|Gen|Jr|Lt|Mr|Mrs|Ms|Prof|Sgt|Sr|St|vs)\.$/;

const SENTENCE_END = /[.!?](?=\s|$)/g;

function firstSentence(text: string): string {
  for (const match of text.matchAll(SENTENCE_END)) {
    const sentence = text.slice(0, match.index + 1);
    if (!ABBREVIATION.test(sentence)) {
      return sentence;
    }
  }
  return text;
}

/** About 90 characters, cut at a word boundary, with "…" */
function shorten(text: string): string {
  if (text.length <= MAX_LENGTH) {
    return text;
  }
  const cut = text
    .slice(0, MAX_LENGTH + 1)
    .replace(/\s+\S*$/, '')
    .replace(/[\s,;:–-]+$/, '');
  return `${cut}…`;
}

/** The people a line names (cast, creators), at most three */
const MAX_NAMES = 3;

/** "A", "A and B", "A, B and C" */
const joinNames = (names: ReadonlyArray<string>): string =>
  joinAnd(names.slice(0, MAX_NAMES));

/** "Season 4 premieres Nov 17", or "Season 4 is out" once the day has passed */
function premiereLine(series: HookSource, day: string | undefined): string {
  const next = series.nextEpisodeToAir;
  // a calendar date ('2026-11-17'): parsed and printed in the same zone
  const airDate = next ? parseISO(next.airDate) : null;
  if (
    !next ||
    !isSeasonPremiere(next, series.seasons ?? []) ||
    !airDate ||
    !isValid(airDate)
  ) {
    return '';
  }
  // a cached show can name a premiere that has aired since
  return day && next.airDate < day
    ? `Season ${next.seasonNumber} is out`
    : `Season ${next.seasonNumber} premieres ${formatLocalDate(airDate, DAY_MONTH_PATTERN)}`;
}

/** "From Bill Hader and Alec Berg": only when a creator also stars */
function creatorsLine(series: HookSource): string {
  const cast = new Set(series.topCast ?? []);
  const creators = series.createdBy.map((person) => person.name);
  return creators.some((name) => cast.has(name))
    ? `From ${joinNames(creators)}`
    : '';
}

function endedLine(series: HookSource): string {
  return series.status === 'Ended' &&
    series.numberOfSeasons > 0 &&
    series.numberOfEpisodes > 0
    ? `Ended: ${plural(series.numberOfSeasons, 'season')}, ${plural(series.numberOfEpisodes, 'episode')}`
    : '';
}

/**
 * Rule 3, a line derived from facts; the first that has a value wins:
 * 1. a season premiere: "Season 4 premieres Nov 17" ("Season 4 is out" once
 *    the page's day is past it)
 * 2. a creator's better-known show (the API sets `creatorOf` when a creator
 *    made another show with more TMDB votes): "From the creator of Breaking Bad"
 * 3. the creators, when one of them is in the top cast: "From Bill Hader and
 *    Alec Berg"
 * 4. an ended show's size: "Ended: 5 seasons, 42 episodes"
 * 5. the top three cast: "With Tom Hardy, Helen Mirren and Pierce Brosnan"
 *
 * No simpler order fits the tested cases: Stranger Things has creators yet
 * says "Ended…", Barry has ended yet names its creators, MobLand names its
 * cast (`hookLine.test.ts`).
 */
function derivedLine(series: HookSource, day: string | undefined): string {
  const creatorOf = series.creatorOf?.title;
  const cast = series.topCast ?? [];
  return (
    premiereLine(series, day) ||
    (creatorOf ? `From the creator of ${creatorOf}` : '') ||
    creatorsLine(series) ||
    endedLine(series) ||
    (cast.length > 0 ? `With ${joinNames(cast)}` : '')
  );
}

/**
 * The spotlight's one-line hook: the tagline, else
 * the overview's first sentence (about 90 characters at a word boundary),
 * else a line derived from facts we have, else '' (the line is left out and
 * the buttons close up). First rule with a value wins.
 */
export function hookLine(series: HookSource, day?: string): string {
  const tagline = series.tagline.trim();
  if (tagline) {
    return tagline;
  }
  const overview = series.description.trim();
  if (overview) {
    return shorten(firstSentence(overview));
  }
  return derivedLine(series, day);
}
