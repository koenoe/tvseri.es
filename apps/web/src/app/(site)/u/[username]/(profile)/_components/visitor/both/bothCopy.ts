import {
  episodeCode,
  type SharedShow,
  type SharedShowNext,
  seasonCode,
} from '@tvseri.es/schemas';

import { genreNameById } from '@/app/(site)/_discover/data/genreNames';
import { formatAirWeekdayDate } from '@/lib/format/airDate';
import { plural } from '@/lib/format/text';

export type NextLabel = Readonly<{
  text: string;
  /** pink: a premiere date, cyan: out now, white: the weekly episode */
  tone: 'cyan' | 'pink' | 'white';
}>;

/**
 * The date at the right of a You both watch row:
 * "S03 · Thu 7 Jan" (pink), "S02E03 · Sun 15 Nov" (white), "S02 out now"
 * (cyan); nothing without a next.
 */
export function nextLabel(next: SharedShowNext | null): NextLabel | null {
  if (!next) {
    return null;
  }
  switch (next.kind) {
    case 'season-premiere':
      return {
        text: `${seasonCode(next.season)} · ${formatAirWeekdayDate(next.date)}`,
        tone: 'pink',
      };
    case 'episode':
      return {
        text: `${episodeCode({ episodeNumber: next.episode, seasonNumber: next.season })} · ${formatAirWeekdayDate(next.date)}`,
        tone: 'white',
      };
    case 'season-out':
      return { text: `${seasonCode(next.season)} out now`, tone: 'cyan' };
  }
}

/**
 * The show's own facts on the row's second line: "2019", "3 seasons",
 * "Crime" (named from TMDB's fixed TV genre list); each undefined when the
 * show lacks it, so its item drops out.
 */
export function factsLine(
  show: Pick<SharedShow, 'genreId' | 'seasonCount' | 'year'>,
): Readonly<{ genre?: string; seasons?: string; year?: string }> {
  return {
    genre: show.genreId === undefined ? undefined : genreNameById(show.genreId),
    seasons: show.seasonCount ? plural(show.seasonCount, 'season') : undefined,
    year: show.year ? String(show.year) : undefined,
  };
}

/** The relation line: what the two of you have done with the show */
export function relationLine(show: SharedShow): string {
  switch (show.relation) {
    case 'both-favourite':
      return 'You both love it';
    case 'both-finished':
      return show.finishedSeason
        ? `You both finished Season ${show.finishedSeason}`
        : 'You both finished it';
    case 'both-watching':
      return 'You’re both watching';
  }
}
