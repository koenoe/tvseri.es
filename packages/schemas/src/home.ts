import type { TvSeries } from './tv-series';

/** Why a show is in a "Because you watched" row */
export type PickReason = Readonly<{
  kind: 'keyword' | 'network' | 'recommendation';
  /** "Apple TV", "Dystopia"; empty for a plain recommendation */
  label: string;
}>;

export type PickItem = Readonly<{
  reason: PickReason;
  series: TvSeries;
}>;

/**
 * `GET /me/home/because-you-watched` and `/me/home/if-you-liked`: the show
 * the row is about and shows like it, minus everything in the viewer's
 * library. `source` is null (and `items` empty) when the viewer has no show
 * to start from.
 */
export type BecauseYouWatched = Readonly<{
  items: ReadonlyArray<PickItem>;
  source: Readonly<{
    id: number;
    /** Where the pick came from: a favourite or a finished show */
    from: 'favorite' | 'watched';
    /** The show itself (poster, year, seasons) */
    series: TvSeries;
    title: string;
  }> | null;
}>;

/** `GET /me/home/more-genre`: "Half of your watchlist is Sci-Fi & Fantasy" */
export type MoreGenre = Readonly<{
  genre: Readonly<{ id: number; name: string }> | null;
  items: ReadonlyArray<TvSeries>;
  /** Watchlist shows (of those sampled) in the genre, and how many were sampled */
  share: Readonly<{ matching: number; sampled: number }>;
}>;

/** What a premiere ticket says about the date */
export type PremiereKind =
  | 'new-series'
  | 'season-finale'
  | 'season-premiere'
  | 'special';

export type Premiere = Readonly<{
  /** Whole days from the day the list was built (0 = tonight) */
  daysAway: number;
  /** `YYYY-MM-DD` */
  date: string;
  /** Big enough for the Countdown (see BIG_PREMIERE in the API) */
  isBig: boolean;
  kind: PremiereKind;
  /** All episodes on one day, or spread over weeks; null when TMDB can't tell */
  release: 'full-season' | 'weekly' | null;
  seasonNumber: number;
  series: TvSeries;
}>;

/** `GET /premieres`: new shows and season premieres in the next 60 days */
export type Premieres = Readonly<{
  /** The next three big premieres, for the Countdown */
  countdown: Readonly<{
    /** The first one is 3 days away or less: it takes the feature slot */
    isDue: boolean;
    items: ReadonlyArray<Premiere>;
  }>;
  /** `YYYY-MM-DD` the list was computed for */
  date: string;
  items: ReadonlyArray<Premiere>;
}>;

/** One episode image as TMDB lists it, with what the quality rule looks at */
export type EpisodeStill = Readonly<{
  aspectRatio: number;
  height: number;
  path: string;
  voteAverage: number;
  voteCount: number;
  width: number;
}>;

export type SeasonStill = Readonly<{
  episodeNumber: number;
  /** w300 */
  image: string;
  title: string;
}>;

/** One show in the Binge calculator's choice */
export type BingeShow = Readonly<{
  episodeRuntime: number;
  /** Aired episodes, the sum of `seasons` */
  numberOfEpisodes: number;
  /** Aired episodes per regular season, in season order: [10, 8, 8] */
  seasons: ReadonlyArray<number>;
  series: TvSeries;
  totalMinutes: number;
}>;

/** Where an archive show stands in the all-time top rated list */
export type ArchiveStanding = Readonly<{
  /** No show in the same bucket is older (by first air year) */
  oldest: boolean;
  /** 1-based position in the all-time top rated list */
  rank: number;
  /** The bucket the rank rounds up to: "Top 5 all time" */
  top: 5 | 10 | 20;
}>;

export type DidYouKnowFact = Readonly<{
  series: TvSeries;
  type: 'episodes' | 'hours' | 'years';
  value: number;
}>;

/** The feature of the day (the Countdown takes the slot when a big premiere is near) */
export type Feature =
  | Readonly<{
      /** Its place in the all-time top rated list; null when outside the top 20 */
      allTime: ArchiveStanding | null;
      kind: 'archive';
      /** 1 = the best rated of the old shows */
      rank: number;
      series: TvSeries;
      yearsOld: number;
    }>
  | Readonly<{
      kind: 'binge';
      episodeRuntime: number;
      numberOfEpisodes: number;
      series: TvSeries;
      /** The shows to compare (≤ 4), the day's pick (`series`) first */
      shows: ReadonlyArray<BingeShow>;
      totalMinutes: number;
    }>
  | Readonly<{ kind: 'countdown'; premieres: ReadonlyArray<Premiere> }>
  | Readonly<{ kind: 'did-you-know'; facts: ReadonlyArray<DidYouKnowFact> }>
  | Readonly<{
      kind: 'stills';
      season: Readonly<{
        airDate: string;
        numberOfEpisodes: number;
        posterImage: string;
        seasonNumber: number;
      }>;
      series: TvSeries;
      stills: ReadonlyArray<SeasonStill>;
    }>;

/** `GET /home/feature?date=` */
export type FeatureOfTheDay = Readonly<{ date: string; feature: Feature }>;

export type ConnectedPerson = Readonly<{
  /** The roles they played in the show before and after them in the chain */
  characters: ReadonlyArray<string>;
  id: number;
  image: string;
  name: string;
  slug: string;
}>;

export type ConnectedNode =
  | Readonly<{ person: ConnectedPerson; type: 'person' }>
  | Readonly<{ series: TvSeries; type: 'show' }>;

/**
 * A chain show, person, show, person, show: from a start show through a
 * show in between to a show the start shares no cast member with
 */
export type ConnectedPath = Readonly<{
  nodes: ReadonlyArray<ConnectedNode>;
  steps: 2;
}>;

/**
 * `GET /home/connected?from=&date=`: the paths from one start show, best
 * first, the same for everyone that day (the web leaves out the paths whose
 * end is in the viewer's lists)
 */
export type ConnectedFrom = Readonly<{
  date: string;
  /** The start show's id */
  from: number;
  paths: ReadonlyArray<ConnectedPath>;
}>;

export type WhatsOnChannel = Readonly<{
  network: Readonly<{
    id: number;
    /** The channel's mark on the remote; '' when TMDB has none */
    logo: string;
    /** `icon`: the square service icon; `wordmark`: the network's logo, drawn white */
    logoKind: 'icon' | 'wordmark';
    name: string;
    /** The network's wide logo, in the screen's caption in place of its name; '' when TMDB has none */
    wordmark: string;
  }>;
  series: TvSeries;
}>;

export type WherePlace = Readonly<{
  lat: number;
  lng: number;
  name: string;
  /** Other shows set there, for "More set in {name}"; empty when there is one */
  others: ReadonlyArray<TvSeries>;
  /** The day's pick */
  series: TvSeries;
  slug: string;
}>;

/** One side of a Versus pair: only what the card draws */
export type VersusSide = Readonly<{
  /** Aired episodes, all seasons */
  episodes: number;
  id: number;
  /** The poster (TMDB URL, as `TvSeries.posterImage`) */
  posterImage: string;
  /** Seasons with an aired episode */
  seasons: number;
  slug: string;
  title: string;
  /** TMDB's vote average out of ten, to one decimal (8.4); 0 unrated */
  voteAverage: number;
  /** "2017–2020", "2020", "2014–" (`formatSeriesYears`) */
  years: string;
}>;

/** Two similar, well-known series face to face */
export type VersusPair = Readonly<{ left: VersusSide; right: VersusSide }>;

/** The toy of the day (signed-in "If you liked X" is `/me/home/if-you-liked`) */
export type Toy =
  | Readonly<{ kind: 'connected-by'; paths: ReadonlyArray<ConnectedPath> }>
  | Readonly<{
      kind: 'versus';
      /** The day's deck, the same for everyone; the web leaves out pairs the viewer has seen */
      pairs: ReadonlyArray<VersusPair>;
    }>
  | Readonly<{ kind: 'whats-on'; channels: ReadonlyArray<WhatsOnChannel> }>
  | Readonly<{
      kind: 'where-set';
      /** The place the day starts on */
      featured: string;
      places: ReadonlyArray<WherePlace>;
    }>;

/** `GET /home/toy?date=` */
export type ToyOfTheDay = Readonly<{ date: string; toy: Toy }>;

/**
 * Why a trending show in the spotlight is for this viewer (signed in, the
 * line under the meta row): like a favourite, like a show they finished,
 * like a show they're watching and up to date with, or top rated in its
 * genre and not seen. The web writes the sentence.
 */
export type SpotlightLine =
  | Readonly<{ kind: 'favorite' | 'finished' | 'up-to-date'; title: string }>
  | Readonly<{ genre: string; kind: 'top-rated' }>;

/** `GET /me/home/spotlight-lines?ids=`: one line or null per requested id */
export type SpotlightLines = Readonly<{
  lines: Readonly<Record<string, SpotlightLine | null>>;
}>;
