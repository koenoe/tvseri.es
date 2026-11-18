import { episodeCode } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import {
  addDays,
  differenceInCalendarDays,
  getDate,
  getYear,
  isWeekend,
  parseISO,
} from 'date-fns';

import { WEEKDAY_PATTERN, yearSuffix } from '@/lib/format/date';
import { formatLocalDate } from '@/lib/format/datePattern';

/**
 * The Binge calculator's plan: from tonight,
 * `perNight` episodes on every viewing night until the show is done, and the
 * night strip from tonight to the last night. Pure: "today" is injected.
 */

export type NightsMode = 'every' | 'weeknights' | 'weekends';

export const PER_NIGHT_OPTIONS = [1, 2, 3, 4] as const;
export type PerNight = (typeof PER_NIGHT_OPTIONS)[number];

export const NIGHTS_OPTIONS: ReadonlyArray<
  Readonly<{ label: string; mode: NightsMode }>
> = [
  { label: 'Every night', mode: 'every' },
  { label: 'Weeknights', mode: 'weeknights' },
  { label: 'Weekends', mode: 'weekends' },
];

/** The strip's width at 1440 (1440 − 2 × 112 − 2 × 40) */
export const DESKTOP_STRIP_WIDTH = 1136;
/** Up to this many days the strip is one line; past it, it wraps */
const ONE_LINE_DAYS = 120;
/** A guard against a runaway plan */
const MAX_NIGHTS = 400;

export type EpisodeCode = Readonly<{ episode: number; season: number }>;

/** The episode at a 0-based position in the show */
export function episodeAt(
  seasons: ReadonlyArray<number>,
  index: number,
): EpisodeCode {
  let rest = index;
  let season = 0;
  while (season < seasons.length - 1 && rest >= (seasons[season] ?? 0)) {
    rest -= seasons[season] ?? 0;
    season += 1;
  }
  return { episode: rest + 1, season: season + 1 };
}

/** "S01E01" */
const episodeLabel = (code: EpisodeCode) =>
  episodeCode({ episodeNumber: code.episode, seasonNumber: code.season });

/** "1 ep", "2 eps" (the Each night switch) */
export const perNightLabel = (count: number) => plural(count, 'ep');

/** "2 episodes a night, weeknights only" */
export function nightsSummary(perNight: number, mode: NightsMode): string {
  const base = `${plural(perNight, 'episode')} a night`;
  if (mode === 'weeknights') {
    return `${base}, weeknights only`;
  }
  return mode === 'weekends' ? `${base}, weekends only` : base;
}

/** "A night of 2 episodes" (the legend when some nights are off) */
export const legendLabel = (perNight: number) =>
  `A night of ${plural(perNight, 'episode')}`;

const isViewingNight = (day: Date, mode: NightsMode) =>
  mode === 'every' || (mode === 'weekends' ? isWeekend(day) : !isWeekend(day));

export type StripLabel = Readonly<{
  /** `start` hangs right from the cell, `end` left, `center` around it */
  align: 'center' | 'end' | 'start';
  /** Tonight and the last night: white, medium */
  strong: boolean;
  text: string;
}>;

export type StripCell = Readonly<{
  /** `YYYY-MM-DD` */
  day: string;
  dot: 'finish' | 'off' | 'on';
  label: StripLabel | null;
  /** the ring around tonight's dot */
  tonight: boolean;
  /** "Wed Nov 11: S01E01 to S01E02", "Sat Nov 14: off" */
  tip: string;
}>;

export type BingePlan = Readonly<{
  /** "Mon Nov 23" (", 2027" when it isn't this year) */
  finish: string;
  nights: number;
  /** One line from Tonight to the end (≤ 120 days); otherwise it wraps */
  oneLine: boolean;
  cells: ReadonlyArray<StripCell>;
}>;

export type PlanInput = Readonly<{
  mode: NightsMode;
  perNight: number;
  seasons: ReadonlyArray<number>;
  /** `YYYY-MM-DD`, the viewer's today */
  today: string;
  /** the strip's width in px, to keep month labels apart */
  width: number;
}>;

const dayLabel = (day: Date, thisYear: number) =>
  `${formatLocalDate(day, WEEKDAY_PATTERN)}${getYear(day) === thisYear ? '' : yearSuffix(getYear(day))}`;

const monthLabel = (day: Date, thisYear: number) =>
  `${formatLocalDate(day, 'MMM')}${getYear(day) === thisYear ? '' : ` ${getYear(day)}`}`;

/** Which episodes each viewing night holds, by `YYYY-MM-DD` */
function scheduleNights(input: PlanInput, start: Date) {
  const total = input.seasons.reduce((sum, count) => sum + count, 0);
  const plan = new Map<string, string>();
  let index = 0;
  let nights = 0;
  let day = start;
  let last = start;
  while (index < total && nights < MAX_NIGHTS) {
    if (isViewingNight(day, input.mode)) {
      const from = episodeAt(input.seasons, index);
      const lastIndex = Math.min(total, index + input.perNight) - 1;
      const to = episodeAt(input.seasons, lastIndex);
      plan.set(
        formatLocalDate(day, 'yyyy-MM-dd'),
        lastIndex === index
          ? episodeLabel(from)
          : `${episodeLabel(from)} to ${episodeLabel(to)}`,
      );
      index = lastIndex + 1;
      nights += 1;
      last = day;
    }
    day = addDays(day, 1);
  }
  return { last, nights, plan };
}

export function planBinge(input: PlanInput): BingePlan {
  const start = parseISO(input.today);
  const thisYear = getYear(start);
  const { last, nights, plan } = scheduleNights(input, start);
  const finish = dayLabel(last, thisYear);
  const days = differenceInCalendarDays(last, start) + 1;
  const perDay = input.width / days;

  const cells: StripCell[] = [];
  let lastLabelled = -99;
  for (let k = 0; k < days; k++) {
    const day = addDays(start, k);
    const key = formatLocalDate(day, 'yyyy-MM-dd');
    const episodes = plan.get(key);
    const isLast = k === days - 1;
    let label: StripLabel | null = null;
    if (isLast) {
      label = { align: k > 0 ? 'end' : 'start', strong: true, text: finish };
    } else if (k === 0) {
      label = { align: 'start', strong: true, text: 'Tonight' };
    } else if (
      getDate(day) === 1 &&
      (k - lastLabelled) * perDay > 120 &&
      (days - k) * perDay > 140
    ) {
      label = {
        align: 'center',
        strong: false,
        text: monthLabel(day, thisYear),
      };
    }
    if (label) {
      lastLabelled = k;
    }
    cells.push({
      day: key,
      dot: isLast ? 'finish' : episodes ? 'on' : 'off',
      label,
      tip: `${formatLocalDate(day, WEEKDAY_PATTERN)}: ${episodes ?? 'off'}`,
      tonight: k === 0 && !isLast,
    });
  }

  return { cells, finish, nights, oneLine: days <= ONE_LINE_DAYS };
}

/** "13 viewing nights, the last on Mon Nov 23" */
export const stripLabel = (plan: BingePlan) =>
  `${plural(plan.nights, 'viewing night')}, the last on ${plan.finish}`;
