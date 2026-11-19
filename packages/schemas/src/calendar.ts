import type { ComingUpItem, WaitingForItem } from './profile-page';

/**
 * What an episode is to its season. The mid-season marks and the series
 * finale come from TMDB's episode type and status, so a show TMDB editors
 * haven't marked is a plain episode or a season finale.
 */
export type CalendarEpisodeKind =
  | 'season-premiere'
  /** The first episode after a mid-season break */
  | 'mid-season-return'
  | 'episode'
  /** The last episode before a mid-season break */
  | 'mid-season-finale'
  | 'season-finale'
  /** The last season's finale of a show TMDB says has ended */
  | 'series-finale';

export type CalendarEpisode = Readonly<{
  episode: number;
  /** S02E43: the real number, also for a show numbered on across seasons */
  code: string;
  /** '' when TMDB has none yet */
  title: string;
  kind: CalendarEpisodeKind;
}>;

/** A show on the calendar, once per response; tickets refer to it by id */
export type CalendarShow = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  onWatchlist: boolean;
  /** Where to watch in the viewer's country, when known */
  provider: ComingUpItem['provider'];
  /** A finished show's return: when the viewer finished it (ms), for "Back after 9 months" */
  finishedAt?: number;
}>;

/**
 * One show's episodes on one day: the built Ticket with the show's details
 * from `shows` (its `episode` is the first of `episodes`)
 */
export type CalendarTicket = Readonly<{
  seriesId: number;
  season: number;
  /** The ticket's stub: a premiere leads, then a finale, else an episode */
  kind: ComingUpItem['kind'];
  /** How the season comes out: one day for all (`full-season`) or spread (`weekly`) */
  release: ComingUpItem['release'];
  /** In order; more than one is the cell's ×N */
  episodes: ReadonlyArray<CalendarEpisode>;
}>;

export type CalendarDay = Readonly<{
  /** YYYY-MM-DD, TMDB's air date */
  date: string;
  /** From `today`; negative for a day this month that has passed */
  daysToGo: number;
  /** Premieres first, then finales, then the rest; by title within each */
  tickets: ReadonlyArray<CalendarTicket>;
}>;

/**
 * `GET /me/calendar`: every dated regular episode of the viewer's shows
 * (watching, watchlist, finished and returning) from the first of this month
 * for 12 months, and the returning shows without a date.
 */
export type Calendar = Readonly<{
  /** YYYY-MM-DD (UTC), what `daysToGo` counts from */
  today: string;
  /** The first day covered: the first of this month */
  from: string;
  /** The last day covered: the end of the 12th month */
  to: string;
  /** Every show that has a ticket, by its first date */
  shows: ReadonlyArray<CalendarShow>;
  /** Only days with tickets, in date order */
  days: ReadonlyArray<CalendarDay>;
  /**
   * Finished shows renewed without a date, each group likeliest back first
   * (`byExpectedReturn`): `listed` when TMDB lists the coming season's
   * episodes, `renewed` when it lists nothing yet
   */
  noDateYet: Readonly<{
    listed: ReadonlyArray<WaitingForItem>;
    renewed: ReadonlyArray<WaitingForItem>;
  }>;
}>;
