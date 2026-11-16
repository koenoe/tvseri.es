import type {
  StatsDaily,
  StatsShowRow,
  StatsSummary,
} from '@tvseri.es/schemas';
import { formatGrouped } from '@/lib/formatCount';
import { joinAnd } from '@/lib/text/fitNames';
import { streakBracket } from '../_components/header/model';
import { formatStatsRuntime, formatYearHours } from '../_lib/format';
import { headline } from '../_lib/sentence';
import { WEEKS } from '../_lib/weeks';

/**
 * What the share card says (STShare V2b), derived from the page's own reads:
 * only what the public page shows. Pure, so the route, the og:image and the
 * tests share it.
 */

/** The story's wall holds the top 10, the square's the top 6 */
const MAX_WALL = 10;

/** Fewer shows than this and the card has no wall */
const MIN_WALL = 3;

export type CardShow = Readonly<{
  id: number;
  title: string;
  posterImage: string | null;
  runtimeMinutes: number;
}>;

export type CardStreak = Readonly<{
  /** Visual weeks (0 to 52) the bracket spans */
  first: number;
  last: number;
  /** "42 days in a row. Blame The Traitors." */
  line: string;
}>;

export type CardModel = Readonly<{
  username: string;
  year: number;
  /** "Fewer hours," / "more shows."; null without a year to compare with */
  headline: readonly [string, string] | null;
  runtime: string;
  episodes: string;
  episodesLabel: string;
  shows: string;
  showsLabel: string;
  /** Episodes per visual week (53) */
  weeks: ReadonlyArray<number>;
  streak: CardStreak | null;
  /** Most hours first, at most 10; empty under 3 shows (no wall) */
  top: ReadonlyArray<CardShow>;
  /** The #1 show's hours ("36h"), the wall's only label */
  topHours: string | null;
}>;

/** "Fewer hours, more shows" → ["Fewer hours,", "more shows."] */
export function headlineLines(
  line: string | null,
): readonly [string, string] | null {
  if (!line) {
    return null;
  }
  const at = line.indexOf(', ');
  return at < 0
    ? [`${line}.`, '']
    : [line.slice(0, at + 1), `${line.slice(at + 2)}.`];
}

/** Most hours first; ties by episodes, then the API's order */
export const byHours = (
  shows: ReadonlyArray<StatsShowRow>,
): ReadonlyArray<StatsShowRow> =>
  [...shows].sort(
    (a, b) => b.runtimeMinutes - a.runtimeMinutes || b.episodes - a.episodes,
  );

/** The wall's shows: the top `MAX_WALL` by hours, none under `MIN_WALL` */
export function wallShows(
  shows: ReadonlyArray<StatsShowRow>,
): ReadonlyArray<CardShow> {
  if (shows.length < MIN_WALL) {
    return [];
  }
  return byHours(shows)
    .slice(0, MAX_WALL)
    .map(({ id, posterImage, runtimeMinutes, title }) => ({
      id,
      posterImage,
      runtimeMinutes,
      title,
    }));
}

/**
 * The show watched most during the streak: the most episodes in the weeks
 * the streak spans (weeks, not days: `/shows` counts per week, so a week the
 * streak only touches counts in full). Ties go to more hours. Null when no
 * show has an episode in those weeks.
 */
export function blameShow(
  shows: ReadonlyArray<StatsShowRow>,
  first: number,
  last: number,
): StatsShowRow | null {
  let best: StatsShowRow | null = null;
  let bestEpisodes = 0;
  for (const show of byHours(shows)) {
    const episodes = show.weeks
      .slice(first, last + 1)
      .reduce((sum, value) => sum + value, 0);
    if (episodes > bestEpisodes) {
      best = show;
      bestEpisodes = episodes;
    }
  }
  return best;
}

/** "Blame The Traitors." without doubling a title's own end mark */
const sentenceEnd = (title: string) =>
  /[.!?…]$/.test(title) ? title : `${title}.`;

/** The bracket's weeks and its line, from the page's own streak bracket */
export function cardStreak(
  streak: StatsDaily['longestStreak'],
  year: number,
  shows: ReadonlyArray<StatsShowRow>,
): CardStreak | null {
  const bracket = streakBracket(streak, year);
  if (!bracket) {
    return null;
  }
  const first = Math.round((bracket.left / 100) * WEEKS);
  const last = first + Math.round((bracket.width / 100) * WEEKS) - 1;
  const blamed = blameShow(shows, first, last);
  return {
    first,
    last,
    line: blamed
      ? `${bracket.label}. Blame ${sentenceEnd(blamed.title)}`
      : `${bracket.label}.`,
  };
}

/** This year has more shows than every other year with stats */
export const mostShowsYet = (current: number, others: ReadonlyArray<number>) =>
  others.length > 0 && others.every((other) => current > other);

type ModelInput = Readonly<{
  username: string;
  year: number;
  summary: StatsSummary;
  /** Episodes per visual week (53) */
  weeks: ReadonlyArray<number>;
  streak: StatsDaily['longestStreak'];
  shows: ReadonlyArray<StatsShowRow>;
  /** Every other year's show count, for "the most yet" */
  otherShowCounts: ReadonlyArray<number>;
}>;

/** The card of a finished year */
export function buildCardModel(input: ModelInput): CardModel {
  const { current } = input.summary;
  const top = wallShows(input.shows);
  const first = top[0];
  const showWord = 'series';
  return {
    episodes: formatGrouped(current.episodeCount),
    episodesLabel: current.episodeCount === 1 ? 'episode' : 'episodes',
    headline: headlineLines(headline(input.summary, 'finished')),
    runtime: formatStatsRuntime(current.totalRuntime),
    shows: formatGrouped(current.seriesCount),
    showsLabel: mostShowsYet(current.seriesCount, input.otherShowCounts)
      ? `${showWord}, the most yet`
      : showWord,
    streak: cardStreak(input.streak, input.year, input.shows),
    top,
    topHours: first ? formatYearHours(first.runtimeMinutes) : null,
    username: input.username,
    weeks: input.weeks,
    year: input.year,
  };
}

/** How many shows the description names before "and more" */
const NAMED_SHOWS = 6;

const listOf = (names: ReadonlyArray<string>, more: boolean) => {
  if (more) {
    return `${names.join(', ')} and more`;
  }
  return joinAnd(names);
};

/**
 * The card in words (STShare's `aria-label`): the share UI's image
 * description, so the card reads the same without seeing it.
 */
export function cardDescription(model: CardModel): string {
  const parts = [`${model.username}’s ${model.year} on tvseri.es.`];
  if (model.headline) {
    parts.push(model.headline.filter(Boolean).join(' '));
  }
  if (model.top.length > 0) {
    const names = model.top
      .slice(0, NAMED_SHOWS)
      .map((show, rank) =>
        rank === 0 && model.topHours
          ? `${show.title} (${model.topHours})`
          : show.title,
      );
    parts.push(
      `A wall of the year’s top series, sized by hours: ${listOf(names, model.top.length > NAMED_SHOWS)}.`,
    );
  }
  parts.push('Episodes per week across the year.');
  if (model.streak) {
    parts.push(model.streak.line);
  }
  const showWord = model.showsLabel.split(',')[0];
  parts.push(
    `${model.runtime} of TV, ${model.episodes} ${model.episodesLabel}, ${model.shows} ${showWord}.`,
  );
  return parts.join(' ');
}
