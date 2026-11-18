import { plural } from '@tvseri.es/utils';
import { pad2 } from '@/lib/format/pad2';

/** Plural weekday names, Monday first ("Fridays") */
export const WEEKDAY_NAMES = [
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
] as const;

/** The first highest value; -1 when nothing was watched */
export function peakIndex(values: ReadonlyArray<number>): number {
  const max = Math.max(0, ...values);
  return max > 0 ? values.indexOf(max) : -1;
}

/** 0 to 23 on the 12-hour clock: "12 am", "9 pm", "12 pm" */
export function hourName(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

/**
 * "Fridays, around 9 pm": the busiest weekday (plural) and the start of the
 * busiest hour on the 12-hour clock. Nothing without episodes.
 */
export function peakText(
  weekdays: ReadonlyArray<number>,
  hours: ReadonlyArray<number>,
): string | undefined {
  const day = peakIndex(weekdays);
  const hour = peakIndex(hours);
  if (day < 0 || hour < 0) {
    return undefined;
  }
  return `${WEEKDAY_NAMES[day]}, around ${hourName(hour)}`;
}

/**
 * "80% after 8 pm": the share of counted episodes (the hours' sum, bulk marks
 * already left out) watched from 20:00 to 04:59, rounded to a whole percent.
 */
export function nightShareText(
  hours: ReadonlyArray<number>,
): string | undefined {
  const total = hours.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return undefined;
  }
  const night = hours.reduce(
    (sum, value, hour) => (hour >= 20 || hour < 5 ? sum + value : sum),
    0,
  );
  return `${Math.round((night / total) * 100)}% after 8 pm`;
}

/**
 * "Daytime mostly on weekends": where the 06:00 to 18:00 episodes fall, by
 * count. More at weekends says weekends, otherwise weekdays. Nothing when the
 * field is missing (older cached answers) or both are 0.
 */
export function daytimeText(
  daytime: Readonly<{ weekday: number; weekend: number }> | undefined,
): string | undefined {
  if (!daytime || daytime.weekday + daytime.weekend === 0) {
    return undefined;
  }
  return `Daytime mostly on ${daytime.weekend > daytime.weekday ? 'weekends' : 'weekdays'}`;
}

/** "21:00 – 22:00" (an hour bar's tooltip) */
export const hourRange = (hour: number) =>
  `${pad2(hour)}:00 – ${pad2((hour + 1) % 24)}:00`;

/** A bar's height as a fraction of the highest bar */
export const barHeightRatio = (value: number, max: number) =>
  max > 0 ? Math.round((value / max) * 10000) / 10000 : 0;

/** "Leaves out 24 episodes marked watched in bulk."; nothing for 0 */
export function bulkNote(excluded: number): string | undefined {
  return excluded > 0
    ? `Leaves out ${plural(excluded, 'episode')} marked watched in bulk.`
    : undefined;
}
