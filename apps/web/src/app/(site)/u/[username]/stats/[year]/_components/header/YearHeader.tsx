import type { StatsYears } from '@tvseri.es/schemas';
import { TextLine } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { getStatsClock } from '@/lib/stats/clock';
import { getYears } from '@/lib/stats/getYears';
import {
  getDaily,
  getGenres,
  getProviders,
  getSummary,
  getWeekly,
  isUnavailable,
} from '@/lib/stats/loaders';
import StatsUnavailable from '../../../_components/StatsUnavailable';
import { type SentencePart, yearSentence } from '../../_lib/sentence';
import ShareButton from '../share/ShareButton';
import type { SectionProps } from '../types';
import { longestStreakYet, streakBracket } from './model';
import WeekChart from './WeekChart';

/** The best of a list by count, most first (the API's order isn't promised) */
const top = <T extends Readonly<{ count: number }>>(
  items: ReadonlyArray<T>,
  take: number,
) => [...items].sort((x, y) => y.count - x.count).slice(0, take);

/** Every other year's longest streak, for "the longest yet" */
async function otherStreaks(
  userId: string,
  year: number,
  years: StatsYears,
): Promise<ReadonlyArray<number>> {
  const others = years.years.filter((item) => item.year !== year);
  const summaries = await Promise.all(
    others.map((item) => getSummary(userId, item.year)),
  );
  return summaries.flatMap((summary) =>
    isUnavailable(summary) ? [] : [summary.current.longestStreak],
  );
}

/**
 * "2025 at a glance": the year, its Share button
 * (finished years; an icon circle on a phone), the sentence, the 53 week lines with the month
 * axis and the longest streak bracketed under them.
 */
export default async function YearHeader({
  shareable,
  state,
  user,
  year,
}: SectionProps) {
  const [summary, weekly, genres, providers, daily, years, clock] =
    await Promise.all([
      getSummary(user.id, year),
      getWeekly(user.id, year),
      getGenres(user.id, year),
      getProviders(user.id, year),
      getDaily(user.id, year),
      getYears(user.id),
      getStatsClock(year),
    ]);
  if (isUnavailable(summary) || isUnavailable(weekly)) {
    const yearTitle = String(year);
    return (
      <StatsUnavailable
        placeholder={<YearHeaderSkeleton />}
        title={yearTitle}
      />
    );
  }
  const streaks = isUnavailable(years)
    ? []
    : await otherStreaks(user.id, year, years);
  const { currentWeek } = clock;
  const sentence = yearSentence({
    genres: isUnavailable(genres)
      ? []
      : top(genres, 2).map((item) => item.genre),
    joinedYear: new Date(user.createdAt).getUTCFullYear(),
    longestStreakYet: longestStreakYet(summary.current.longestStreak, streaks),
    provider: isUnavailable(providers)
      ? null
      : (top(providers, 1)[0]?.name ?? null),
    state,
    summary,
    username: user.username,
    year,
  });
  const values = weekly.map((week) => week.episodes);
  const bracket = isUnavailable(daily)
    ? null
    : streakBracket(daily.longestStreak, year);
  return (
    <div className="flex flex-col gap-6" data-slot="stats-header">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-8">
          <h1 className="shrink-0 text-numeral-xl tabular-nums">{year}</h1>
          {shareable ? <ShareButton user={user} year={year} /> : null}
        </div>
        <Sentence parts={sentence} />
      </div>
      <WeekChart
        bracket={bracket}
        currentWeek={currentWeek}
        values={values}
        year={year}
      />
    </div>
  );
}

function Sentence({ parts }: Readonly<{ parts: ReadonlyArray<SentencePart> }>) {
  return (
    <p className="max-w-[640px] text-body text-white/80">
      {parts.map((part, index) => {
        const partId = `${index}-${part.text}`;
        return part.strong ? (
          <span className="font-semibold text-white" key={partId}>
            {part.text}
          </span>
        ) : (
          part.text
        );
      })}
    </p>
  );
}

const BLOCK = `rounded-8 ${GHOST_FILL}`;

const YEAR_GHOST = `h-full w-36 ${BLOCK}`;

const SHARE_GHOST = `hidden size-10 rounded-full md:h-9 md:w-[97px] [html[data-stats-year=finished]_&]:block ${GHOST_FILL}`;

const WEEK_GHOST = `h-1/3 flex-1 ${BLOCK}`;

/** The chart's weeks as even ghost bars */
const WEEK_GHOSTS = Array.from({ length: 52 }, (_, n) => n);

/**
 * The header's size while it loads: the year (and a finished year's
 * Share), a two-line sentence (four on
 * a phone, three for a current year) and the chart with its axis and bracket.
 */
export function YearHeaderSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-ghost flex-col gap-6"
      data-placeholder="stats-header"
    >
      <div className="flex flex-col gap-3">
        <div className="flex h-[60px] items-center justify-between gap-8 md:h-[76px]">
          <div className={YEAR_GHOST} />
          {/* A finished year's Share (`data-stats-year` on <html>, set
              before the first paint): the circle, or the pill from md */}
          <div className={SHARE_GHOST} />
        </div>
        {/* the sentence: two lines from lg, four below (three for a current
            year on a phone) */}
        <div className="flex max-w-[640px] flex-col">
          <TextLine className="text-body" width="w-full" />
          <TextLine className="text-body" width="w-5/6" />
          <TextLine className="text-body md:hidden" width="w-full" />
          <TextLine
            className="text-body md:hidden max-md:[html[data-stats-year=current]_&]:hidden"
            width="w-1/2"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex h-[88px] items-end gap-1 md:h-[150px] md:gap-[13px]">
          {WEEK_GHOSTS.map((week) => (
            <span className={WEEK_GHOST} key={week} />
          ))}
        </div>
        <TextLine className="text-caption" width="w-full" />
        <div className="h-9" />
      </div>
    </div>
  );
}
