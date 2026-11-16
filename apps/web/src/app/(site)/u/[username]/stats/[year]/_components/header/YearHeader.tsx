import type { StatsYears } from '@tvseri.es/schemas';
import { TextLine } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { getYears } from '@/lib/stats/getYears';
import { getStatsClock } from '../../_data/clock';
import {
  getDaily,
  getGenres,
  getProviders,
  getSummary,
  getWeekly,
  isUnavailable,
} from '../../_data/loaders';
import { type SentencePart, yearSentence } from '../../_lib/sentence';
import ShareButton from '../share/ShareButton';
import type { SectionProps } from '../types';
import StatsUnavailable from '../ui/StatsUnavailable';
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
 * "2025 at a glance" (STD_Recommended, STMobile): the year, its Share button
 * (finished years, desktop), the sentence, the 53 week lines with the month
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
    return (
      <StatsUnavailable
        id="stats-header"
        placeholder={<YearHeaderSkeleton />}
        title={String(year)}
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
          {shareable ? (
            <div className="hidden md:block">
              <ShareButton user={user} variant="header" year={year} />
            </div>
          ) : null}
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
      {parts.map((part, index) =>
        part.strong ? (
          <span
            className="font-semibold text-white"
            key={`${index}-${part.text}`}
          >
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

const BLOCK = `rounded-8 ${GHOST_FILL}`;

/** The chart's weeks as even ghost bars */
const WEEK_GHOSTS = Array.from({ length: 52 }, (_, n) => n);

/**
 * The header's size while it loads: the year, a two-line sentence (four on
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
        <div className="h-[60px] md:h-[76px]">
          <div className={`h-full w-36 ${BLOCK}`} />
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
            <span className={`h-1/3 flex-1 ${BLOCK}`} key={week} />
          ))}
        </div>
        <TextLine className="text-caption" width="w-full" />
        <div className="h-9" />
      </div>
    </div>
  );
}
