import type { TvSeries } from './tv-series';

/** A whole new series, or a new season of one that ran before */
export type NewReleaseKind = 'new-season' | 'new-series';

/** One show that premiered (a new series or a new season) in the last week */
export type NewRelease = Readonly<{
  /** `YYYY-MM-DD` the series or the season premiered */
  date: string;
  kind: NewReleaseKind;
  /** Its place by popularity among the week's premieres, from 1 */
  rank: number;
  /** 1 for a new series */
  seasonNumber: number;
  /** With `backdropImage` and `titleTreatmentImage` when TMDB has them */
  series: TvSeries;
}>;

/**
 * `GET /home/new-this-week?date=`: what premiered in the week up to `date`,
 * most popular first, except that the first item is the lead: the
 * highest-ranked item with a backdrop (`leadFirst` in `@tvseri.es/utils`).
 */
export type NewThisWeek = Readonly<{
  /** `YYYY-MM-DD` the list was built for (an older day while it stands in) */
  date: string;
  items: ReadonlyArray<NewRelease>;
}>;
