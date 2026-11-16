/** Raw, invented data for the stats stub (see build.ts for the API bodies). */
export type CatalogSeries = Readonly<{
  id: number;
  title: string;
  slug: string;
  /** Episodes per season */
  seasons: ReadonlyArray<number>;
  /** Minutes per episode */
  epRuntime: number;
  network: string;
  firstAir: string;
  /** Key of the board images (`st_p_<art>.jpg`, `st_bd_<art>.jpg`, `st_logo_<art>.png`) */
  art?: string;
}>;

export type RawShow = Readonly<{
  id: number;
  episodes: number;
  runtimeMinutes: number;
  /** `YYYY-MM-DD` */
  first: string;
  last: string;
  /** Episodes per visual week, 53 values */
  weeks: ReadonlyArray<number>;
}>;

export type RawFinished = Readonly<{
  id: number;
  eps: number;
  runtime: number;
  /** `YYYY-MM-DD` */
  last: string;
  seasons: ReadonlyArray<number>;
}>;

/** An evening of one series: `n` episodes of `season` from `from` */
export type RawNight = Readonly<{
  date: string;
  id: number;
  season: number;
  from: number;
  n: number;
}>;

export type YearRaw = Readonly<{
  /** Episodes per week, 53 values */
  weekly: ReadonlyArray<number>;
  /** Minutes per week, 53 values */
  weeklyRuntime: ReadonlyArray<number>;
  /** Days with episodes, oldest first */
  days: ReadonlyArray<readonly [string, number]>;
  /** In the order watched */
  shows: ReadonlyArray<RawShow>;
  /** Newest first */
  finished: ReadonlyArray<RawFinished>;
  /** Series ids, most prominent first */
  newIds: ReadonlyArray<number>;
  backIds: ReadonlyArray<number>;
  /** The biggest night first, then "Also big" */
  nights: ReadonlyArray<RawNight>;
  when: Readonly<{
    hours: ReadonlyArray<number>;
    weekdays: ReadonlyArray<number>;
    episodes: number;
    bulkExcluded: number;
    daytime: Readonly<{ weekday: number; weekend: number }>;
  }>;
}>;
