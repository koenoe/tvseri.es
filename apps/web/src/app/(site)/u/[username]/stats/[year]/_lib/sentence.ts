import type { StatsMetrics, StatsSummary } from '@tvseri.es/schemas';
import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';
import type { YearState } from '@/lib/stats/statsYear';
import { formatStatsRuntime } from './format';

/** A run of the sentence; `strong` runs are drawn white and 600 */
export type SentencePart = Readonly<{ text: string; strong?: boolean }>;

const more = (current: number, previous: number, word: string) =>
  current > previous
    ? `More ${word}`
    : current < previous
      ? `Fewer ${word}`
      : `As many ${word}`;

/**
 * The year in one line, from the runtime and shows arrows: "Fewer hours,
 * more shows" (page sentence and share card). Null for a year in progress or
 * without a previous year to compare with.
 */
export function headline(
  summary: StatsSummary,
  state: YearState,
): string | null {
  const { current, previous } = summary;
  if (state !== 'finished' || previous.episodeCount === 0) {
    return null;
  }
  const hours = more(current.totalRuntime, previous.totalRuntime, 'hours');
  const shows = more(current.seriesCount, previous.seriesCount, 'series');
  return `${hours}, ${shows.charAt(0).toLowerCase()}${shows.slice(1)}`;
}

type SentenceInput = Readonly<{
  summary: StatsSummary;
  state: YearState;
  /** The year the user joined tvseri.es */
  joinedYear: number;
  year: number;
  username: string;
  /** The two biggest genres, most shows first */
  genres: ReadonlyArray<string>;
  /** The provider with most shows */
  provider: string | null;
  /** This year's streak is longer than every other year's */
  longestStreakYet: boolean;
}>;

const totals = (
  current: StatsMetrics,
  soFar: boolean,
): ReadonlyArray<SentencePart> => [
  { strong: true, text: formatGrouped(current.episodeCount) },
  { text: ` ${current.episodeCount === 1 ? 'episode' : 'episodes'} of ` },
  { strong: true, text: formatGrouped(current.seriesCount) },
  { text: ` series${soFar ? ' so far' : ''}, ` },
  { strong: true, text: formatStatsRuntime(current.totalRuntime) },
  { text: ' of TV.' },
];

const mostly = (
  genres: ReadonlyArray<string>,
  provider: string | null,
): ReadonlyArray<SentencePart> => {
  const [first, second] = genres;
  const parts: SentencePart[] = [];
  if (first) {
    parts.push({ text: ' Mostly ' }, { strong: true, text: first });
    if (second) {
      parts.push({ text: ' and ' }, { strong: true, text: second });
    }
  }
  if (provider) {
    parts.push(
      { text: first ? ', mostly on ' : ' Mostly on ' },
      { strong: true, text: provider },
    );
  }
  return parts.length > 0 ? [...parts, { text: '.' }] : [];
};

/** "…: 71 series, and a 42-day streak, the longest yet." (the cyan tiles) */
const comparison = (
  summary: StatsSummary,
  line: string,
  longestStreakYet: boolean,
): ReadonlyArray<SentencePart> => {
  const { current, previous } = summary;
  const ups: SentencePart[][] = [];
  if (current.seriesCount > previous.seriesCount) {
    ups.push([
      {
        strong: true,
        text: plural(current.seriesCount, 'series', 'series'),
      },
    ]);
  }
  if (current.longestStreak > previous.longestStreak) {
    ups.push([
      { text: 'a ' },
      {
        strong: true,
        text: `${formatGrouped(current.longestStreak)}-day streak`,
      },
      ...(longestStreakYet ? [{ text: ', the longest yet' }] : []),
    ]);
  }
  if (ups.length === 0) {
    return [{ text: ` ${line}.` }];
  }
  return [
    { text: ` ${line}: ` },
    ...ups.flatMap((up, index) =>
      index === 0 ? up : [{ text: ', and ' }, ...up],
    ),
    { text: '.' },
  ];
};

/**
 * The header sentence: totals, then the joining year's
 * line, or the genres and provider and, for a finished year, the comparison
 * with the year before. Owner-neutral: it names the user, never "you".
 */
export function yearSentence(
  input: SentenceInput,
): ReadonlyArray<SentencePart> {
  const { summary, state } = input;
  const soFar = state === 'current';
  if (summary.current.episodeCount === 0) {
    return [{ text: `Nothing logged in ${input.year}${soFar ? ' yet' : ''}.` }];
  }
  const start = totals(summary.current, soFar);
  if (input.year === input.joinedYear && !soFar) {
    return [
      ...start,
      { text: ` The year ${input.username} joined tvseri.es.` },
    ];
  }
  const line = headline(summary, state);
  return [
    ...start,
    ...mostly(input.genres, input.provider),
    ...(line ? comparison(summary, line, input.longestStreakYet) : []),
  ];
}

export const sentenceText = (parts: ReadonlyArray<SentencePart>) =>
  parts.map((part) => part.text).join('');
