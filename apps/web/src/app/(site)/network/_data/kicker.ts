import { formatAirWeekdayDate } from '@/lib/format/airDate';

/**
 * The overline of the network's recommendation tile: when its
 * most popular running show is back, from its next episode ("Returning Tue
 * 17 Nov" for a season premiere, "New episode Thu 19 Nov" otherwise, the year
 * added when it isn't this year), or, for a network with no running shows,
 * when its most popular show finished.
 */

export type KickerInput = Readonly<{
  /** the show's next episode, when TMDB knows it */
  next: Readonly<{ airDate: string; episodeNumber: number }> | null;
  running: boolean;
  /** the year of its last episode, for a finished show */
  lastYear: number | null;
}>;

export function spotlightKicker(input: KickerInput, today: Date): string {
  const { lastYear, next, running } = input;
  const date = next ? new Date(`${next.airDate}T00:00:00Z`) : null;
  if (date && !Number.isNaN(date.getTime())) {
    const day = formatAirWeekdayDate(next?.airDate ?? '', today.getTime());
    return next?.episodeNumber === 1
      ? `Returning ${day}`
      : `New episode ${day}`;
  }
  if (running) {
    return 'Still running';
  }
  return lastYear ? `Finished in ${lastYear}` : 'Finished';
}

const SENTENCE_END = /(?<=[.!?…])\s+/;

/**
 * The tile's reason from the show's overview (one plain line built from the
 * data): its first sentences up to `max` characters, never cut mid-sentence
 * unless the first sentence alone is longer (then cut at a word, with "…").
 */
export function shortOverview(overview: string, max = 160): string {
  const text = overview.trim().replace(/\s+/g, ' ');
  if (text.length <= max) {
    return text;
  }
  let out = '';
  for (const sentence of text.split(SENTENCE_END)) {
    const joined = out ? `${out} ${sentence}` : sentence;
    if (joined.length > max) {
      break;
    }
    out = joined;
  }
  if (out) {
    return out;
  }
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:]+$/, '')}…`;
}
